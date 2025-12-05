import { Task } from './types/task';
import { createNewTask } from '@zest-tasks/tasks';

type TaskWorkerOptions = {
  timeToComplete: number;
  failureChance: number;
  maxRetries: number;
  idleTimeout: number;
};

export class TaskWorker {
  private _timeToComplete: number;
  private _failureChance: number;
  private _maxRetries: number;
  private _isBusy = false;
  private _idleTimeout: number;
  private _idleTimer: NodeJS.Timeout | null = null;
  private _isDeleted = false;

  constructor({
    timeToComplete,
    failureChance,
    maxRetries,
    idleTimeout,
  }: TaskWorkerOptions) {
    this._timeToComplete = timeToComplete;
    this._failureChance = failureChance;
    this._maxRetries = maxRetries;
    this._idleTimeout = idleTimeout;
  }

  execute = async (
    task: Task,
    onComplete: (id: string) => void,
    onFail: (id: string) => void
  ) => {
    this._clearIdleTimer();
    this._isBusy = true;
    let attempts = 0;

    while (attempts < this._maxRetries) {
      try {
        await createNewTask(
          task,
          onComplete,
          this._timeToComplete,
          this._failureChance
        );
        break;
      } catch {
        attempts++;
        if (attempts >= this._maxRetries) {
          onFail(task.id);
        }
      }
    }
    this._isBusy = false;
    this._startIdleTimer();
  };

  private _clearIdleTimer = () => {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  };

  private _startIdleTimer = () => {
    this._clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      this.delete();
    }, this._idleTimeout);
  };

  delete = () => {
    this._clearIdleTimer();
    this._isDeleted = true;
  };

  isDeleted = () => {
    return this._isDeleted;
  };

  isBusy = () => {
    return this._isBusy;
  };
}
