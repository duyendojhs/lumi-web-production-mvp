import fs from "node:fs";
import path from "node:path";

export interface DataRawSummary {
  dataRawDetected: boolean;
  rootPath: string;
  totalFiles: number;
  totalSizeBytes: number;
  pdfFiles: number;
  htmlFiles: number;
  txtFiles: number;
  jsonFiles: number;
  csvFiles: number;
  xlsxFiles: number;
  zipFiles: number;
}

export function getDataRawSummary(): DataRawSummary {
  const dataRoot = process.env.DATA_ROOT ? path.resolve(process.env.DATA_ROOT) : path.resolve(process.cwd(), "../../data");
  const rootPath = path.join(dataRoot, "raw");
  const summary: DataRawSummary = {
    dataRawDetected: false,
    rootPath,
    totalFiles: 0,
    totalSizeBytes: 0,
    pdfFiles: 0,
    htmlFiles: 0,
    txtFiles: 0,
    jsonFiles: 0,
    csvFiles: 0,
    xlsxFiles: 0,
    zipFiles: 0,
  };

  if (!fs.existsSync(rootPath)) {
    return summary;
  }

  walk(rootPath, summary);
  summary.dataRawDetected = summary.totalFiles > 0;
  return summary;
}

function walk(currentPath: string, summary: DataRawSummary) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, summary);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const stat = fs.statSync(entryPath);
    const ext = path.extname(entry.name).toLowerCase();
    summary.totalFiles += 1;
    summary.totalSizeBytes += stat.size;

    if (ext === ".pdf") summary.pdfFiles += 1;
    if (ext === ".html" || ext === ".htm") summary.htmlFiles += 1;
    if (ext === ".txt") summary.txtFiles += 1;
    if (ext === ".json") summary.jsonFiles += 1;
    if (ext === ".csv") summary.csvFiles += 1;
    if (ext === ".xlsx") summary.xlsxFiles += 1;
    if (ext === ".zip") summary.zipFiles += 1;
  }
}

export function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}
