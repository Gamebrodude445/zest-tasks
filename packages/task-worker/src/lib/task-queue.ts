import { TaskWorker } from './task-worker';
import { Task } from './types/task';

type TaskQueueOptions = {
  maxWorkers: number;
  workerSettings: ConstructorParameters<typeof TaskWorker>[0];
  onComplete: (task: Task, metadata: Record<string, unknown>) => void;
  onFail: (task: Task, metadata: Record<string, unknown>) => void;
  noWorkersDelay: number;
  workerCleanupInterval: number;
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
  private _workerCleanupInterval: NodeJS.Timeout;
  private _lifetimeTaskCounter = 0;

  constructor({
    maxWorkers,
    workerSettings,
    onComplete,
    onFail,
    noWorkersDelay,
    workerCleanupInterval,
  }: TaskQueueOptions) {
    this._maxWorkers = maxWorkers;
    this._workerSettings = workerSettings;
    this._onComplete = onComplete;
    this._onFail = onFail;
    this._noWorkersDelay = noWorkersDelay;
    this._workerCleanupInterval = setInterval(
      () => this.clearDeletedWorkers(),
      workerCleanupInterval
    );
  }

  // Ecmascript does not support destructors, so i created a manual one that i won't use but it should exist
  cleanup = () => {
    clearInterval(this._workerCleanupInterval);
  };

  addTask = (task: Task) => {
    this._taskQueue.push(task);
  };

  private _processQueue = async () => {
    while (this._taskQueue.length > 0) {
      this.clearDeletedWorkers();
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
          timeStamp: new Date().toISOString(),
          taskId: task.id,
          taskMessage: task.message,
        };
        await availableWorker.execute(
          task,
          () => {
            this._onComplete(task, metadata);
            this._lifetimeTaskCounter++;
          },
          () => {
            this._onFail(task, metadata);
            this._lifetimeTaskCounter++;
          }
        );
      }
    }
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

  getStatistics = () => {
    return {
      lifetimeTaskCounter: this._lifetimeTaskCounter,
      numberOfTaskTries: 6,
      successToFailureRation: 6,
      averageProcessingTime: 6,
      currentQueueLength: this._taskQueue.length,
      idleWorkers: this._workers.filter((w) => !w.isBusy()).length,
      hotWorkers: this._workers.filter((w) => w.isBusy()).length,
    };
  };
}
