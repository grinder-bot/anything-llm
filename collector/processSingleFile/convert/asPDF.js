const path = require("path");
const { tokenizeString } = require("../../utils/tokenizer");
const { S3Service } = require("../../utils/s3");
const prisma = require("../../utils/prisma");
const asImage = require("./asImage");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const streamToBuffer = require("../../utils/streamToBuffer");

async function asPDF({ uploadedFile }) {
  const BUCKET_NAME = process.env.S3_BUCKET_NAME;
  if (!BUCKET_NAME) {
    return {
      success: false,
      reason: "Missing environment variables for Bucket Name.",
    };
  }
  try {
    console.log(`Processing ${uploadedFile.title} as PDF.`);

    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const objectKey = `${uploadedFile.storageKey}-${uploadedFile.title}`;

    const getObjectParams = {
      Bucket: BUCKET_NAME,
      Key: objectKey,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const pdfStream = await s3Client.send(getObjectCommand);
    const pdfData = await streamToBuffer(pdfStream.Body);

    const pdfjsLib = await import("pdfjs-dist");
    const loadingTask = pdfjsLib.default.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    const pageContent = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str).join(" ");

      if (text.length) {
        pageContent.push(text);
      }
    }

    let content = pageContent.join(" ");
    if (!content.length) {
      console.error(`${uploadedFile.title} does not contain any text. Attempting to process as image.`);
      return await asImage({ uploadedFile });
    }

    const fileNameWithoutExt = path.parse(uploadedFile.title).name;
    const s3Service = new S3Service();

    const pageContentParams = {
      Bucket: BUCKET_NAME,
      Key: `pageContents/${uploadedFile.storageKey}-${fileNameWithoutExt}.txt`,
      Body: content,
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
        wordCount: content.split(" ").length,
        tokenCountEstimate: tokenizeString(content).length,
      },
      where: {
        id: uploadedFile.id,
      },
    });

    console.log(`[SUCCESS]: ${uploadedFile.title} converted & ready for embedding.\n`);
    return { success: true, reason: null, documents: [data] };
  } catch (error) {
    console.error("An error occurred while processing the document:", error);
    return { success: false, reason: "Error processing the document." };
  }
}

module.exports = asPDF;
