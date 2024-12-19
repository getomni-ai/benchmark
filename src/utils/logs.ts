import fs from 'fs';
import path from 'path';

import { ExtractionResult } from '../types';

export const createResultFolder = (folderName: string) => {
  // check if results folder exists
  const resultsFolder = path.join(__dirname, '..', '..', 'results');
  if (!fs.existsSync(resultsFolder)) {
    fs.mkdirSync(resultsFolder, { recursive: true });
  }

  const folderPath = path.join(resultsFolder, folderName);
  fs.mkdirSync(folderPath, { recursive: true });
  return folderPath;
};

export const writeToFile = (filePath: string, content: any) => {
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
};

export const writeResultToFile = (
  outputDir: string,
  fileName: string,
  result: ExtractionResult,
) => {
  fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(result, null, 2));
};
