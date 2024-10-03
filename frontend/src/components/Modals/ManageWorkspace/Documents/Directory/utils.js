import strDistance from "js-levenshtein";

const LEVENSHTEIN_MIN = 8;

// Regular expression pattern to match the v4 UUID and the ending .json
const uuidPattern =
  /-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
const jsonPattern = /\.json$/;

// Function to strip UUID v4 and JSON from file names as that will impact search results.
export const stripUuidAndJsonFromString = (input = "") => {
  return input
    ?.replace(uuidPattern, "") // remove v4 uuid
    ?.replace(jsonPattern, "") // remove trailing .json
    ?.replace("-", " "); // turn slugged names into spaces
};

export function filterFileSearchResults(files = [], searchTerm = "") {
  if (!searchTerm) return files?.items || [];

  const searchResult = [];

  for (const folder of files?.items) {
    // Check if the folder name matches the search term
    const folderMatches = folder.name.toLowerCase().startsWith(searchTerm.toLowerCase());

    // Filter matching files within the folder
    const matchingFiles = folder?.items.filter(file =>
      file.name.toLowerCase().startsWith(searchTerm.toLowerCase())
    );

    // If either the folder matches or there are matching files, add to results
    if (folderMatches || (matchingFiles && matchingFiles.length)) {
      searchResult.push({
        ...folder,
        items: matchingFiles || [],
      });
    }
  }

  return searchResult;
}

export const folderColumns = {
  numExp: { label: "Num. Exp", value: "numExp" },
  ano: { label: "AÑO", value: "ano" },
  cliente: { label: "Cliente", value: "cliente" },
  juzgadoPrincipal: { label: "Juzgado Principal", value: "juzgadoPrincipal" },
  fechaAlta: { label: "Fecha Alta", value: "fechaAlta" },
  estadoDeExpediente: {
    label: "Estado de Expediente",
    value: "estadoDeExpediente",
  },
};
