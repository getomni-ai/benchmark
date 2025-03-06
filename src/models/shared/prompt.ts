export const OCR_SYSTEM_PROMPT = `
Convert the following document to markdown.
Return only the markdown with no explanation text. Do not include delimiters like '''markdown or '''html.

RULES:
  - You must include all information on the page. Do not exclude headers, footers, charts, infographics, or subtext.
  - Return tables in an HTML format.
  - Logos should be wrapped in brackets. Ex: <logo>Coca-Cola<logo>
  - Watermarks should be wrapped in brackets. Ex: <watermark>OFFICIAL COPY<watermark>
  - Page numbers should be wrapped in brackets. Ex: <page_number>14<page_number> or <page_number>9/22<page_number>
  - Prefer using ☐ and ☑ for check boxes.
`;

export const JSON_EXTRACTION_SYSTEM_PROMPT = `
  Extract the following JSON schema from the text and images if provided.
  Return only the JSON with no explanation text.
`;

export const IMAGE_EXTRACTION_SYSTEM_PROMPT = `
  Extract the following JSON schema from the image.
  Return only the JSON with no explanation text.
`;
