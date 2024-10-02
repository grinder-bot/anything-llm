const path = require("path");
const { tokenizeString } = require("../../utils/tokenizer");
const { S3Service } = require("../../utils/s3");
const { TextractService } = require("../../utils/textract");
const prisma = require("../../utils/prisma");

class Semaphore {
  constructor(max) {
    this.tasks = [];
    this.counter = max;
  }

  async acquire(fileName) {
    if (this.counter > 0) {
      this.counter--;
      return;
    }
    console.log(`Queue is full. File ${fileName} will be processed soon.`);
    await new Promise((resolve) => this.tasks.push({ resolve, fileName }));
    this.counter--;
  }

  release() {
    this.counter++;
    if (this.tasks.length > 0) {
      this.counter--;
      const nextTask = this.tasks.shift();
      nextTask.resolve();
    }
  }
}

const maxConcurrent = 3; 
const semaphore = new Semaphore(maxConcurrent);

async function analyzeDocumentWithRetry(
  textractService,
  BUCKET_NAME,
  key,
  maxRetries = 3
) {
  let attempt = 0;
  let delay = 1000; 
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      return await textractService.analyzeS3Document(BUCKET_NAME, key);
    } catch (error) {
      console.error(`Error during analyzeS3Document (Attempt ${attempt + 1}):`, error);
      lastError = error;

      if (
        error.code === "ThrottlingException" ||
        error.name === "ThrottlingException" ||
        error.statusCode === 429 ||
        (error.message && error.message.includes("Rate exceeded")) 
      ) {
        attempt++;
        console.log(
          `ThrottlingException occurred. Retrying in ${delay} ms... (Attempt ${attempt})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; 
      } else {
        throw error;
      }
    }
  }
  throw new Error(
    `Max retries reached for analyzeS3Document: ${lastError ? lastError.message : "Unknown error"}`
  );
}

async function asImage({ fullFilePath = "", filename = "", uploadedFile }) {
  const fileName = uploadedFile.title;
  console.log(`[asImage] Adding to queue: ${fileName}`);
  await semaphore.acquire(fileName);
  console.log(`[asImage] Starting processing for file: ${fileName}`);

  try {
    const BUCKET_NAME = process.env.S3_BUCKET_NAME;
    if (!BUCKET_NAME) {
      return {
        success: false,
        reason: "Missing environment variables for Document Intelligence.",
      };
    }

    const s3Service = new S3Service();
    const textractService = new TextractService();

    const key = `${uploadedFile.storageKey}-${fileName}`;
    let extractedText;

    try {
      extractedText = await analyzeDocumentWithRetry(
        textractService,
        BUCKET_NAME,
        key
      );
    } catch (error) {
      console.error(
        `Failed to analyze document after retries for file ${fileName}:`,
        error
      );
      return { success: false, reason: "Error processing the document." };
    }

    const fileNameWithoutExt = path.parse(fileName).name;
    const pageContentParams = {
      Bucket: BUCKET_NAME,
      Key: `pageContents/${uploadedFile.storageKey}-${fileNameWithoutExt}.txt`,
      Body: extractedText,
    };

    const pageContentUploadUrl = await s3Service.uploadFileToS3(
      undefined,
      undefined,
      undefined,
      pageContentParams
    );

    const data = await prisma.file.update({
      data: {
        pageContentUrl: pageContentUploadUrl,
        wordCount: extractedText.split(" ").length,
        tokenCountEstimate: tokenizeString(extractedText).length,
      },
      where: {
        id: uploadedFile.id,
      },
    });

    return { success: true, reason: null, documents: [data] };
  } catch (error) {
    console.error(
      `An error occurred while processing the document for file ${fileName}:`,
      error
    );
    return { success: false, reason: "Error processing the document." };
  } finally {
    console.log(`[asImage] File is processed: ${fileName}`);
    semaphore.release();
  }
}

module.exports = asImage;
