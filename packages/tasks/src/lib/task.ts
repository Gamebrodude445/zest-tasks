export const createNewTask = (
  timeToComplete: number,
  failureChance: number
) => {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() * 100 <= failureChance) {
        reject(new Error('failed to complete task'));
      } else {
        resolve();
      }
    }, timeToComplete);
  });
};
