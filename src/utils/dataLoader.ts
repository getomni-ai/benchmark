import fs from 'fs';
import path from 'path';

import { Input } from '../types';

export const loadData = (folder: string): Input[] => {
  const files = fs.readdirSync(folder).filter((file) => file.endsWith('.json'));
  const data = files.map((file) => {
    const filePath = path.join(folder, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  });

  return data;
};
