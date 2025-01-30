export const OCR_SYSTEM_PROMPT = `
Convert the following document to markdown.
Return only the markdown with no explanation text. Do not include delimiters like '''markdown or '''.

RULES:
    - You must include all information on the page. Do not exclude headers, footers, or subtext.
    - Charts & infographics must be interpreted to a markdown format. Prefer table format when applicable.
    - Images without text must be replaced with [Description of image](image.png)
    - For tables with double headers, prefer adding a new column.
    - Logos should be wrapped in square brackets. Ex: [Coca-Cola]
    - Prefer using ☐ and ☑ for check boxes.
`;

export const JSON_EXTRACTION_SYSTEM_PROMPT = `
  Extract the following JSON schema from the text.
  Return only the JSON with no explanation text.
`;

export const IMAGE_EXTRACTION_SYSTEM_PROMPT = `
  Extract the following JSON schema from the image.
  Return only the JSON with no explanation text.
`;
