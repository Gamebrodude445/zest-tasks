import fs from 'fs/promises';

export const writeToFile = async (filePath: string, data: string) => {
  const fileContent = await readFromFile(filePath);
  const newContent = fileContent.concat(JSON.parse(data));
  await fs.mkdir(filePath.substring(0, filePath.lastIndexOf('/')), {
    recursive: true,
  });
  await fs.writeFile(filePath, JSON.stringify(newContent, null, 2));
};

export const readFromFile = async (filePath: string) => {
  try {
    const fileContent = JSON.parse(
      await fs.readFile(filePath, 'utf-8')
    ) as Record<string, unknown>[];
    return fileContent;
  } catch {
    return [];
  }
};
