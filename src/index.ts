import { generateText, generateObject } from 'ai';
import dotenv from 'dotenv';
import fs from 'fs';

import Data from '../data/data.json';
import { Input } from './types';
import { createProviderInstance } from './models';
import { generateZodSchema, calculateJsonAccuracy } from './utils';

dotenv.config();

const MODEL = 'gpt-4o';
const API_KEY = process.env.OPENAI_API_KEY;

const main = async () => {
  const data = Data as Input;

  const systemPrompt = `
    Convert the following PDF page to markdown.
    Return only the markdown with no explanation text. Do not include deliminators like '''markdown.
    You must include all information on the page. Do not exclude headers, footers, or subtext.
  `;
  const messages: any = [{ role: 'system', content: systemPrompt }];

  messages.push({
    role: 'user',
    content: [
      {
        type: 'image',
        image: data.imageUrl,
      },
    ],
  });

  const providerInstance = createProviderInstance(MODEL, API_KEY);
  // OCR
  const { text, usage: ocrUsage } = await generateText({
    model: providerInstance(MODEL),
    messages,
  });

  console.log('ocr text', text);

  const { object, usage: extractionUsage } = await generateObject({
    model: providerInstance(MODEL),
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
    schema: generateZodSchema(data.jsonSchema),
  });

  console.log('json output', object);

  // evaluate the object
  const accuracy = calculateJsonAccuracy(object, data.trueJsonOutput);

  console.log('accuracy', accuracy);

  // write the OCR and extraction results to a file
  fs.writeFileSync('ocr.txt', text);
  fs.writeFileSync('extraction.json', JSON.stringify(object, null, 2));
};

main();
