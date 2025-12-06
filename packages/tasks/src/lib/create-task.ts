import { CreateTaskParameters } from './types/create-task';

export const createNewTask = (
  Task: CreateTaskParameters,
  timeToComplete: number,
  failureChance: number
) => {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() * 100 <= failureChance) {
        reject(`Task ${Task.id} failed due to simulated error.`);
      } else {
        resolve();
      }
    }, timeToComplete);
  });
};
