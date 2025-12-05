export const createNewTask = (
  timeToComplete: number,
  failureChance: number
) => {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() <= failureChance / 100) {
        reject(new Error('failed to complete task'));
      } else {
        resolve();
      }
    }, timeToComplete);
  });
};
