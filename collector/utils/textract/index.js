const {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} = require("@aws-sdk/client-textract");
const path = require("path");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class TextractService {
  constructor() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error("AWS credentials are required.");
    }

    this.textract = new TextractClient({
      region: region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  #log(text, ...args) {
    console.log(`\x1b[34m[TextractService]\x1b[0m ${text}`, ...args);
  }

  async #startJob(s3BucketName, objectName) {
    const command = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: s3BucketName,
          Name: objectName,
        },
      },
    });
    const response = await this.textract.send(command);
    return response.JobId;
  }

  async #getJobStatus(jobId) {
    const params = { JobId: jobId };
    const command = new GetDocumentTextDetectionCommand(params);
    const response = await this.textract.send(command);
    return response;
  }

  async #isJobComplete(jobId) {
    await sleep(1000);
    let status = "IN_PROGRESS";
    let response = await this.#getJobStatus(jobId);

    status = response.JobStatus;

    while (status === "IN_PROGRESS") {
      await sleep(1000);
      response = await this.#getJobStatus(jobId);
      status = response.JobStatus;
      // console.log(`Job status: ${status}`);
    }

    console.log(`Job status: ${response.JobStatus} jobId: ${jobId}`);

    return status === "SUCCEEDED";
  }

  async #getJobResults(jobId) {
    const pages = [];
    await sleep(1000);
    let response = await this.#getJobStatus(jobId);
    const totalPages = response.DocumentMetadata.Pages;

    pages.push(response);

    console.log(`Resultset page received: ${pages.length}`);

    while (pages.length < totalPages) {
      await sleep(1000);
      response = await this.#getJobStatus(jobId);
      pages.push(response);
      console.log(`Resultset page received: ${pages.length}`);
    }

    return pages;
  }

  #getDetectedText(response) {
    let extractedText = "";
    response.forEach((resultPage) => {
      resultPage.Blocks.forEach((item) => {
        if (item.BlockType === "LINE") {
          extractedText += item.Text;
        }
      });
    });
    return extractedText;
  }

  async analyzeS3Document(bucketName, documentKey) {
    try {
      const fileExtension = path.extname(documentKey).toLowerCase();
      if (fileExtension === ".pdf") {
        return await this.#processPdfFromS3(bucketName, documentKey);
      } else {
        return await this.#processImageFromS3(bucketName, documentKey);
      }
    } catch (error) {
      this.#log("Error analyzing S3 document:", error);
      throw error;
    }
  }

  async #processImageFromS3(bucketName, documentKey) {
    try {
      const params = {
        Document: {
          S3Object: {
            Bucket: bucketName,
            Name: documentKey,
          },
        },
      };

      const command = new DetectDocumentTextCommand(params);
      const data = await this.textract.send(command);

      const extractedText = data.Blocks.filter(
        (block) => block.BlockType === "LINE"
      )
        .map((block) => block.Text)
        .join("\n");

      this.#log("Text Extracted Successfully from S3 Image");
      return extractedText;
    } catch (error) {
      this.#log("Error processing image from S3:", error);
      throw error;
    }
  }

  async #processPdfFromS3(bucketName, documentKey) {
    try {
      const jobId = await this.#startJob(bucketName, documentKey);
      this.#log("Job started for PDF processing:", jobId);

      const isComplete = await this.#isJobComplete(jobId);

      if (!isComplete) {
        throw new Error("Failed to process PDF.");
      }

      const response = await this.#getJobResults(jobId);
      return this.#getDetectedText(response);
    } catch (error) {
      this.#log("Error processing PDF from S3:", error);
      throw error;
    }
  }
}

module.exports = {
  TextractService,
};
