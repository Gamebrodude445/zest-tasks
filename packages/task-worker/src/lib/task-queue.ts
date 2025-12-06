import { TaskWorker } from './task-worker';
import { Task } from './types/task';

type TaskQueueOptions = {
  maxWorkers: number;
  workerSettings: ConstructorParameters<typeof TaskWorker>[0];
  onComplete: (task: Task, metadata: Record<string, unknown>) => void;
  onFail: (task: Task, metadata: Record<string, unknown>) => void;
  noWorkersDelay: number;
};

export class TaskQueue {
  private _maxWorkers: number;
  private _workerSettings: TaskQueueOptions['workerSettings'];
  private _workers: TaskWorker[] = [];
  private _taskQueue: Task[] = [];
  private _onComplete: (task: Task, metadata: Record<string, unknown>) => void;
  private _onFail: (task: Task, metadata: Record<string, unknown>) => void;
  private _noWorkersDelay: number;
  private _isBusy = false;

  constructor({
    maxWorkers,
    workerSettings,
    onComplete,
    onFail,
    noWorkersDelay,
  }: TaskQueueOptions) {
    this._maxWorkers = maxWorkers;
    this._workerSettings = workerSettings;
    this._onComplete = onComplete;
    this._onFail = onFail;
    this._noWorkersDelay = noWorkersDelay;
  }

  addTask = (task: Task) => {
    this._taskQueue.push(task);
  };

  private _processQueue = async () => {
    while (this._taskQueue.length > 0) {
      this.clearDeletedWorkers();
      if (this._workers.length < this._maxWorkers) {
        this._workers.push(new TaskWorker(this._workerSettings));
      }
      const availableWorker = this.getAvailableWorker();

      if (!availableWorker) {
        await new Promise((resolve) =>
          setTimeout(resolve, this._noWorkersDelay)
        );
        continue;
      }

      const task = this._taskQueue.shift();
      if (task) {
        const metadata = {
          workerId: availableWorker.id,
          workersLength: this._workers.length,
          queueLength: this._taskQueue.length,
          timeStamp: new Date().toISOString(),
          taskId: task.id,
          taskMessage: task.message,
        };
        await availableWorker.execute(
          task,
          () => {
            this._onComplete(task, metadata);
          },
          () => {
            this._onFail(task, metadata);
          }
        );
      }
    }
    this.clearDeletedWorkers();
    this._isBusy = false;
  };

  private getAvailableWorker() {
    if (this._workers.length < this._maxWorkers) {
      const newWorker = new TaskWorker(this._workerSettings);
      this._workers.push(newWorker);
      return newWorker;
    }
    return this._workers.find((worker) => !worker.isBusy());
  }

  clearDeletedWorkers = () => {
    this._workers = this._workers.filter((worker) => !worker.isDeleted());
  };

  process = async () => {
    this._isBusy = true;
    await this._processQueue();
  };

  isBusy = () => {
    return this._isBusy;
  };
}
