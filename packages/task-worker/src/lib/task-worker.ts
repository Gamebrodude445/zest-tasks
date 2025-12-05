import { Task } from './types/task';
import { createNewTask } from '@zest-tasks/tasks';

type TaskWorkerOptions = {
  onComplete: (id: string) => void;
  timeToComplete: number;
  failureChance: number;
  maxRetries: number;
};

export class TaskWorker {
  private onComplete: (id: string) => void;
  private timeToComplete: number;
  private failureChance: number;
  private maxRetries: number;
  constructor(options: TaskWorkerOptions) {
    this.onComplete = options.onComplete;
    this.timeToComplete = options.timeToComplete;
    this.failureChance = options.failureChance;
    this.maxRetries = options.maxRetries;
  }

  execute = async (task: Task) => {
    let attempts = 0;

    while (attempts < this.maxRetries) {
      try {
        await createNewTask(
          task,
          this.onComplete,
          this.timeToComplete,
          this.failureChance
        );
        break;
      } catch (error) {
        attempts++;
        if (attempts >= this.maxRetries) {
          throw error;
        }
      }
    }
  };
}
