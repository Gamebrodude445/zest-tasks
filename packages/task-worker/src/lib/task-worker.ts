import { Task } from './types/task';
import { createNewTask } from '@zest-tasks/tasks';

type TaskWorkerOptions = {
  timeToComplete: number;
  failureChance: number;
  maxRetries: number;
};

export class TaskWorker {
  private _timeToComplete: number;
  private _failureChance: number;
  private _maxRetries: number;
  private _isBusy = false;

  constructor({
    timeToComplete,
    failureChance,
    maxRetries,
  }: TaskWorkerOptions) {
    this._timeToComplete = timeToComplete;
    this._failureChance = failureChance;
    this._maxRetries = maxRetries;
  }

  execute = async (
    task: Task,
    onComplete: (id: string) => void,
    onFail: (id: string) => void
  ) => {
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
  };

  isBusy(): boolean {
    return this._isBusy;
  }
}
