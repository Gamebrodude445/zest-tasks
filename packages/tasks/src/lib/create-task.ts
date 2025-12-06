import { CreateTaskParameters } from './types/create-task';

export const createNewTask = (
  { id }: CreateTaskParameters,
  onComplete: () => void,
  timeToComplete: number,
  failureChance: number
) => {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() * 100 <= failureChance) {
        reject(id);
      } else {
        onComplete();
        resolve();
      }
    }, timeToComplete);
  });
};
