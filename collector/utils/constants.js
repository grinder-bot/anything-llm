const WATCH_DIRECTORY = require("path").resolve(__dirname, "../hotdir");

const ACCEPTED_MIMES = {
  "text/plain": [".txt", ".md", ".org", ".adoc", ".rst"],
  "text/html": [".html"],

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
    ".doc",
  ],
  // "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
  //   ".pptx",
  // ],

  // "application/vnd.oasis.opendocument.text": [".odt"],
  // "application/vnd.oasis.opendocument.presentation": [".odp"],

  "application/pdf": [".pdf"],
  // "application/mbox": [".mbox"],

  // "audio/wav": [".wav"],
  // "audio/mpeg": [".mp3"],

  // "video/mp4": [".mp4"],
  // "video/mpeg": [".mpeg"],
  // "application/epub+zip": [".epub"],
};

const SUPPORTED_FILETYPE_CONVERTERS = {
  ".jpg": "./convert/asImage.js",
  ".png": "./convert/asImage.js",
  ".jpeg": "./convert/asImage.js",
  ".pdf": "./convert/asPDF.js",
  ".txt": "./convert/asTxt.js",
  ".md": "./convert/asTxt.js",
  ".org": "./convert/asTxt.js",
  ".adoc": "./convert/asTxt.js",
  ".rst": "./convert/asTxt.js",

  ".html": "./convert/asTxt.js",
  // FUTUREREFERENCE: using OCR for PDFs as we don't know if the content of the PDF will be in text or image
  // ".pdf": "./convert/asPDF.js",

  ".docx": "./convert/asDocx.js",
  ".doc": "./convert/asDocx.js",
  // ".pptx": "./convert/asOfficeMime.js",

  // ".odt": "./convert/asOfficeMime.js",
  // ".odp": "./convert/asOfficeMime.js",

  // ".mbox": "./convert/asMbox.js",

  // ".epub": "./convert/asEPub.js",

  // ".mp3": "./convert/asAudio.js",
  // ".wav": "./convert/asAudio.js",
  // ".mp4": "./convert/asAudio.js",
  // ".mpeg": "./convert/asAudio.js",
};

module.exports = {
  SUPPORTED_FILETYPE_CONVERTERS,
  WATCH_DIRECTORY,
  ACCEPTED_MIMES,
};
