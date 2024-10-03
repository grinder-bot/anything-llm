const { S3Service } = require("../../utils/s3");
const prisma = require("../../utils/prisma");
const path = require("path");
const fs = require("fs").promises;
const mammoth = require("mammoth");
const textract = require("textract");
const { tokenizeString } = require("../../utils/tokenizer");

const TEMP_DIRECTORY = path.join(__dirname, "temp");

async function ensureTempDirectory() {
  try {
    await fs.access(TEMP_DIRECTORY);
  } catch (error) {
    await fs.mkdir(TEMP_DIRECTORY, { recursive: true });
    console.log(`Created temporary directory at ${TEMP_DIRECTORY}`);
  }
}

async function parseDocx(filePath) {
  const { value: text } = await mammoth.extractRawText({ path: filePath });
  return text.split("\n").filter(line => line.length > 0);
}

async function parseDoc(filePath) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, (error, text) => {
      if (error) {
        return reject(error);
      }
      resolve(text.split("\n").filter(line => line.length > 0));
    });
  });
}

async function asDocX({ filename, uploadedFile }) {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    return {
      success: false,
      reason: "Missing environment variables for Document Intelligence.",
    };
  }

  console.log(`-- Working ${filename} --`);
  const s3Service = new S3Service();
  const fileContents = await s3Service.getObject(
    {
      Bucket: bucketName,
      Key: `${uploadedFile.storageKey}-${uploadedFile.title}`,
    },
    false
  );

  const fileNameWithoutExt = path.parse(uploadedFile.title).name;
  await ensureTempDirectory();

  const tempFilePath = path.join(
    TEMP_DIRECTORY,
    `${uploadedFile.storageKey}-${uploadedFile.title}`
  );

  await fs.writeFile(tempFilePath, fileContents);
  console.log(`Temporary file written to ${tempFilePath}`);

  let pageContent = [];

  if (path.extname(uploadedFile.title) === '.docx') {
    try {
      pageContent = await parseDocx(tempFilePath);
    } catch (error) {
      console.error(`Failed to load .docx file: ${error.message}`);
      return {
        success: false,
        reason: `Error loading .docx file: ${error.message}`,
        documents: [],
      };
    }
  } else if (path.extname(uploadedFile.title) === '.doc') {
    try {
      pageContent = await parseDoc(tempFilePath);
    } catch (error) {
      console.error(`Failed to parse .doc file: ${error.message}`);
      return {
        success: false,
        reason: `Error parsing .doc file: ${error.message}`,
        documents: [],
      };
    }
  } else {
    console.error(`Unsupported file type for ${filename}.`);
    return {
      success: false,
      reason: `Unsupported file type for ${filename}.`,
      documents: [],
    };
  }

  if (!pageContent.length) {
    console.error(`Resulting text content was empty for ${filename}.`);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const extractedText = pageContent.join("\n");

  const pageContentParams = {
    Bucket: bucketName,
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

  await fs.unlink(tempFilePath);
  console.log(`-- Temporary file ${tempFilePath} deleted --`);

  console.log(`[SUCCESS]: ${filename} converted & ready for embedding.\n`);
  return { success: true, reason: null, documents: [data] };
}

module.exports = asDocX;
