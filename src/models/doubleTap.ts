import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import fs from 'fs';
import fetch from 'node-fetch';
import { ModelProvider } from './base';
import { OCR_SYSTEM_PROMPT } from './shared/prompt';
import dotenv from 'dotenv';

dotenv.config();

export class DoubleTap extends ModelProvider {
  constructor() {
    super('gemini');
  }

  private async getImageBuffer(imagePath: string): Promise<Buffer> {
    // Check if the path is a URL
    if (imagePath.startsWith('http')) {
      const response = await fetch(imagePath);
      return Buffer.from(await response.arrayBuffer());
    }
    // If not a URL, treat as local file path
    return fs.readFileSync(imagePath);
  }

  async ocr(imagePath: string) {
    try {
      const startTime = performance.now();

      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
        generationConfig: { temperature: 0 },
      });

      const imageBuffer = await this.getImageBuffer(imagePath);

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/png', // Adjust based on file type if needed
        },
      };

      const result = await model.generateContent([OCR_SYSTEM_PROMPT, imagePart]);
      const text = result.response.text();

      // Step 1: add line numbers to the text with a <1> format
      const lines = text.split('\n');
      const numberedLines = lines.map((line, index) => `<${index + 1}> ${line}`);
      const numberedText = numberedLines.join('\n');

      // Not we're gonna pass that back to the LLM, with the original image and ask for corrections.
      const correctionPrompt = `
        You are tasked with reviewing and correcting mistakes within OCR text.
        You are given a document image and the original OCR output represented in a Markdown format. The markdown format should be preserved (i.e. headers, bold, italic, etc.).
        The OCR text has line numbers delineated with <1> <2> <3> etc.
        For any required corrections, return an array of objects with the line number and the corrected line.

        Common OCR mistakes include:
        - Missing lines of text
        - Missing or incorrect check boxes
        - Errors in table layout (e.g. missing lines, missing columns, cells in the wrong column, etc.)
        - Incorrect numbers (e.g. missing decimal points, 3 and 8 used interchangeably)

        The original OCR text was generated with the following instructions:
        <original_ocr_instructions>
        ${OCR_SYSTEM_PROMPT}
        </original_ocr_instructions>
      `;

      const correctionSchema = {
        description:
          'Corrections to the OCR text. You must only return one correction per line. Do not return multiple corrections for the same line.',
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            lineNumber: {
              type: SchemaType.NUMBER,
              description: 'Line number',
              nullable: false,
            },
            correction: {
              type: SchemaType.STRING,
              description:
                'The complete line of corrected text in the same format as the original text.',
              nullable: false,
            },
          },
          required: ['lineNumber', 'correction'],
        },
      };

      const correctionModel = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0,
          responseSchema: correctionSchema,
        },
      });

      const correctionResult = await correctionModel.generateContent([
        correctionPrompt,
        imagePart,
        numberedText,
      ]);

      const corrections = correctionResult.response.text();

      // Parse corrections JSON and apply them to original text
      let correctedText = text;
      try {
        const correctionArray = JSON.parse(corrections);
        // Sort corrections by line number in descending order to avoid offset issues
        correctionArray.sort((a, b) => b.lineNumber - a.lineNumber);

        const originalLines = text.split('\n');
        for (const correction of correctionArray) {
          // Array is 0-based, but our line numbers start at 1
          const lineIndex = correction.lineNumber - 1;
          if (lineIndex >= 0 && lineIndex < originalLines.length) {
            originalLines[lineIndex] = correction.correction;
          }
        }
        correctedText = originalLines.join('\n');
      } catch (e) {
        console.error('Error applying corrections:', e);
        // Fall back to original text if corrections can't be applied
        correctedText = text;
      }

      const endTime = performance.now();

      // Note: Gemini API might have different token calculation method
      // These values should be adjusted based on actual API response
      const usage = {
        duration: endTime - startTime,
        totalCost: 0.001, // Adjust based on actual Gemini pricing
      };

      return {
        text: correctedText,
        originalText: text,
        usage,
      };
    } catch (error) {
      console.error('Gemini Error:', error);
      throw error;
    }
  }
}

// Test the GeminiProvider
// const geminiProvider = new DoubleTap();
// geminiProvider
//   .ocr('https://synthetic-pdfs.s3.amazonaws.com/d2095f9d-b7d4-463e-8c6a-ecb297b2b943.jpg')
//   .then((result) => {
//     console.log('DONE');
//     console.log(result);
//   });
