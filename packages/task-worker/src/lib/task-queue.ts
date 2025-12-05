import { TaskWorker } from './task-worker';
import { Task } from './types/task';

type TaskQueueOptions = {
  maxWorkers: number;
  workerSettings: ConstructorParameters<typeof TaskWorker>[0];
  onComplete: (task: Task) => void;
  onFail: (task: Task) => void;
};

export class TaskQueue {
  private workers: TaskWorker[] = [];
  private taskQueue: Task[] = [];
  private onComplete: (task: Task) => void;
  private onFail: (task: Task) => void;

  constructor({
    maxWorkers,
    workerSettings,
    onComplete,
    onFail,
  }: TaskQueueOptions) {
    for (let i = 0; i < maxWorkers; i++) {
      this.workers.push(new TaskWorker(workerSettings));
    }
    this.onComplete = onComplete;
    this.onFail = onFail;
  }

  addTask(task: Task) {
    this.taskQueue.push(task);
  }

  private async processQueue() {
    while (this.taskQueue.length > 0) {
      const availableWorker = this.workers.find((worker) => !worker.isBusy());

      if (!availableWorker) {
        break;
      }

      const task = this.taskQueue.shift();
      if (task) {
        await availableWorker.execute(
          task,
          () => {
            this.onComplete(task);
          },
          () => {
            this.onFail(task);
          }
        );
      }
    }
  }

  async process() {
    await this.processQueue();
  }
}
