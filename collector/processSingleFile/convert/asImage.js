const { v4 } = require("uuid");
const fs = require("fs");
const { createdDate, trashFile } = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { S3Service } = require("../../utils/s3");
const path = require("path");
const { TextractService } = require("../../utils/textract");


async function asDocX({ fullFilePath = "", filename = "" }) {
  const BUCKET_NAME = process.env.S3_BUCKET_NAME
  if (!BUCKET_NAME) {
    return { success: false, reason: "Missing environment variables for Document Intelligence." };
  }
  try {
    console.log(`-- Working ${filename} --`);
    const uuid = v4()
    const uniqueFilename = `${uuid}-${filename}`
    const s3Service = new S3Service();
    const textractService = new TextractService()

    const fileUploadUrl = await s3Service.uploadFileToS3(
      fullFilePath,
      BUCKET_NAME,
      uuid
    );

    const extractedText = await textractService.analyzeS3Document(BUCKET_NAME, uniqueFilename)
    const fileNameWithoutExt = path.parse(filename).name
    const pageContentParams = {
      Bucket: BUCKET_NAME,
      Key: `pageContents/${uuid}-${fileNameWithoutExt}.txt`,
      Body: extractedText,
    };

    const pageContentUploadUrl = await s3Service.uploadFileToS3(
      undefined,
      undefined,
      undefined,
      pageContentParams,
    );
    const data = {
      url: fileUploadUrl,
      pageContentUploadUrl,
      fileUploadUrl,
      title: filename,
      storageKey: uuid,
      docAuthor: "Unknown",
      description: "Unknown",
      docSource: "img file uploaded by the user.",
      chunkSource: "",
      published: createdDate(fullFilePath),
      wordCount: extractedText.split(" ").length,
      pageContent: extractedText,
      token_count_estimate: tokenizeString(extractedText).length,
    };


    trashFile(fullFilePath);
    return { success: true, reason: null, documents: [data] };
  } catch (error) {
    console.error("An error occurred while processing the document:", error);
    return { success: false, reason: "Error processing the document." };
  }
}

module.exports = asDocX;
