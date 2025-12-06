type LoggerOptions = { filePath: string };

type LogEntry = { log: string; metadata: Record<string, unknown> };

export class Logger {
  private _filePath: string;
  private _logQueue: LogEntry[] = [];
  private _isBusy = false;

  constructor({ filePath }: LoggerOptions) {
    this._filePath = filePath;
  }

  addLog(log: string, metadata: Record<string, unknown>) {
    this._logQueue.push({ log, metadata });
  }

  private async _processQueue() {
    while (this._logQueue.length > 0) {
      const log = this._logQueue.shift();
      if (log) {
        console.log(this._filePath);
        console.log(log.log, log.metadata);
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
