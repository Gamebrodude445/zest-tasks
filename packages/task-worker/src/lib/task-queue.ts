import { TaskWorker } from './task-worker';
import { Task } from './types/task';

type TaskQueueOptions = {
  maxWorkers: number;
  workerSettings: ConstructorParameters<typeof TaskWorker>[0];
  onComplete: (task: Task) => void;
  onFail: (task: Task) => void;
  noWorkersDelay: number;
};

export class TaskQueue {
  private _maxWorkers: number;
  private _workerSettings: TaskQueueOptions['workerSettings'];
  private _workers: TaskWorker[] = [];
  private _taskQueue: Task[] = [];
  private _onComplete: (task: Task) => void;
  private _onFail: (task: Task) => void;
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
      const availableWorker =
        this._workers.length <= this._maxWorkers
          ? new TaskWorker(this._workerSettings)
          : this._workers.find((worker) => !worker.isBusy());

      if (!availableWorker) {
        await new Promise((resolve) =>
          setTimeout(resolve, this._noWorkersDelay)
        );
        continue;
      }

      const task = this._taskQueue.shift();
      if (task) {
        await availableWorker.execute(
          task,
          () => {
            this._onComplete(task);
          },
          () => {
            this._onFail(task);
          }
        );
      }
    }
    this.clearDeletedWorkers();
    this._isBusy = false;
  };

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
