import axios from 'axios';
import { ModelProvider } from './base';
import { htmlToMarkdown } from '../utils';

// Fast Pipeline: $1 per 1,000 pages
const COST_PER_PAGE = 20 / 1000;

enum UnstructuredTypes {
  Title = 'Title',
  Header = 'Header',
  NarrativeText = 'NarrativeText',
}

interface UnstructuredElement {
  text: string;
  type: UnstructuredTypes;
  metadata: {
    filename: string;
    filetype: string;
    languages: string[];
    page_number: number;
    parent_id?: string;
    text_as_html?: string;
  };
  element_id: string;
}

export class UnstructuredProvider extends ModelProvider {
  constructor() {
    super('unstructured');
  }

  async ocr(imagePath: string) {
    try {
      const start = performance.now();

      const fileName = imagePath.split('/').pop()[0];
      const formData = new FormData();
      const response = await axios.get(imagePath, { responseType: 'arraybuffer' });
      const fileData = Buffer.from(response.data);

      formData.append('files', new Blob([fileData]), fileName);

      const apiResponse = await axios.post(
        'https://api.unstructuredapp.io/general/v0/general',
        formData,
        {
          headers: {
            accept: 'application/json',
            'unstructured-api-key': process.env.UNSTRUCTURED_API_KEY,
          },
        },
      );

      const unstructuredResult = apiResponse.data as UnstructuredElement[];

      // Format the result
      let markdown = '';
      if (Array.isArray(unstructuredResult)) {
        markdown = unstructuredResult.reduce((acc, el) => {
          if (el.type === UnstructuredTypes.Title) {
            acc += `\n### ${el.text}\n`;
          } else if (el.type === UnstructuredTypes.NarrativeText) {
            acc += `\n${el.text}\n`;
          } else if (el.metadata?.text_as_html) {
            acc += htmlToMarkdown(el.metadata.text_as_html) + '\n';
          } else if (el.text) {
            acc += el.text + '\n';
          }
          return acc;
        }, '');
      } else {
        markdown = JSON.stringify(unstructuredResult);
      }

      const end = performance.now();

      return {
        text: markdown,
        usage: {
          duration: end - start,
          totalCost: COST_PER_PAGE, // the input is always 1 page.
        },
      };
    } catch (error) {
      console.error('Unstructured Error:', error);
      throw error;
    }
  }
}
