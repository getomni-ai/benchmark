import fs from 'fs';
import path from 'path';

export const loadData = (filePath: string) => {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};
