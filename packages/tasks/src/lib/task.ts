export const createNewTask = (
  id: string,
  onComplete: (id: string) => void,
  timeToComplete: number,
  failureChance: number
) => {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() * 100 <= failureChance) {
        reject(id);
      } else {
        onComplete(id);
        resolve();
      }
    }, timeToComplete);
  });
};
