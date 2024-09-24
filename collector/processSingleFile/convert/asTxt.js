const fs = require("fs");
const { v4 } = require("uuid");
const { tokenizeString } = require("../../utils/tokenizer");
const { createdDate, trashFile } = require("../../utils/files");
const { S3Service } = require("../../utils/s3");
const path = require("path");

async function asTxt({ fullFilePath = "", filename = "" }) {
  const BUCKET_NAME = process.env.S3_BUCKET_NAME
  if (!BUCKET_NAME) {
    return { success: false, reason: "Missing environment variables for Document Intelligence." };
  }
  let content = "";
  try {
    content = fs.readFileSync(fullFilePath, "utf8");
  } catch (err) {
    console.error("Could not read file!", err);
  }

  if (!content?.length) {
    console.error(`Resulting text content was empty for ${filename}.`);
    trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  console.log(`-- Working ${filename} --`);
  const uuid = v4()
  const uniqueFilename = `${uuid}-${filename}`
  const s3Service = new S3Service();

  const fileUploadUrl = await s3Service.uploadFileToS3(
    fullFilePath,
    BUCKET_NAME,
    uuid
  );
  const fileNameWithoutExt = path.parse(filename).name
  const pageContentParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `pageContents/${uuid}-${fileNameWithoutExt}.txt`,
    Body: content,
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
    storageKey: uuid,
    title: filename,
    docAuthor: "Unknown",
    description: "Unknown",
    docSource: "a text file uploaded by the user.",
    chunkSource: "",
    published: createdDate(fullFilePath),
    wordCount: content.split(" ").length,
    pageContent: content,
    token_count_estimate: tokenizeString(content).length,
  };

  trashFile(fullFilePath);
  console.log(`[SUCCESS]: ${filename} converted & ready for embedding.\n`);
  return { success: true, reason: null, documents: [data] };
}

module.exports = asTxt;
