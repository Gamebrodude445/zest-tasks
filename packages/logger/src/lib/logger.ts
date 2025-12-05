type LoggerOptions = { filePath: string };

export class Logger {
  private _filePath: string;
  private _logQueue: string[] = [];
  private _isBusy = false;

  constructor({ filePath }: LoggerOptions) {
    this._filePath = filePath;
  }

  addLog(log: string) {
    this._logQueue.push(log);
  }

  private async _processQueue() {
    while (this._logQueue.length > 0) {
      const log = this._logQueue.shift();
      if (log) {
        console.log(log);
      }
    }
    this._isBusy = false;
  }

  async process() {
    this._isBusy = true;
    await this._processQueue();
  }
  isBusy(): boolean {
    return this._isBusy;
  }
}
