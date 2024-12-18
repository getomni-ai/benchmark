export const OCR_SYSTEM_PROMPT = `
  Convert the following PDF page to markdown.
  Return only the markdown with no explanation text. Do not include deliminators like '''markdown.
  You must include all information on the page. Do not exclude headers, footers, or subtext.
`;

export const TEXT_EXTRACTION_SYSTEM_PROMPT = `
  Extract the following JSON schema from the text.
  Return only the JSON with no explanation text.
`;

export const IMAGE_EXTRACTION_SYSTEM_PROMPT = `
  Extract the following JSON schema from the image.
  Return only the JSON with no explanation text.
`;
