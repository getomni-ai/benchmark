import { z } from 'zod';

const zodTypeMapping = {
  array: (itemSchema: any) => z.array(itemSchema),
  boolean: z.boolean(),
  integer: z.number().int(),
  number: z.number(),
  object: (properties: any) => z.object(properties).strict(),
  string: z.string(),
};

export const generateZodSchema = (schemaDef: any): z.ZodObject<any> => {
  const properties: Record<string, any> = {};

  for (const [key, value] of Object.entries(schemaDef.properties) as any) {
    let zodType;

    if (value.enum && Array.isArray(value.enum) && value.enum.length > 0) {
      zodType = z.enum(value.enum as [string, ...string[]]);
    } else {
      zodType = zodTypeMapping[value.type];
    }

    if (value.type === 'array' && value.items.type === 'object') {
      properties[key] = zodType(generateZodSchema(value.items));
    } else if (value.type === 'array' && value.items.type !== 'object') {
      properties[key] = zodType(zodTypeMapping[value.items.type]);
    } else if (value.type === 'object') {
      properties[key] = generateZodSchema(value);
    } else {
      properties[key] = zodType;
    }

    // Make properties nullable by default
    properties[key] = properties[key].nullable();

    if (value.description) {
      properties[key] = properties?.[key]?.describe(value?.description);
    }
  }

  return z.object(properties).strict();
};
