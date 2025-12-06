import fs from 'fs/promises';

export const writeToFile = async (
  filePath: string,
  data: string
): Promise<void> => {
  return await fs.writeFile(filePath, data, 'utf-8');
};

export const readFromFile = async (filePath: string): Promise<string> => {
  return await fs.readFile(filePath, 'utf-8');
};
