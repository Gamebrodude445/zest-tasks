import { writeToFile } from '@zest-tasks/log-file-io';

type LoggerOptions = { filePath: string };

type LogEntry = { log: string; metadata: Record<string, unknown> };

export class Logger {
  private _filePath: string;
  private _logQueue: LogEntry[] = [];
  private _isBusy = false;

  constructor({ filePath }: LoggerOptions) {
    this._filePath = filePath;
  }

  addLog = (log: string, metadata: Record<string, unknown>) => {
    this._logQueue.push({ log, metadata });
  };

  private _processQueue = async () => {
    while (this._logQueue.length > 0) {
      const log = this._logQueue.shift();
      if (log) {
        try {
          await writeToFile(this._filePath, JSON.stringify({ log }));
        } catch {
          console.log('Failed to write log to file.');
        }
      }
    }
    this._isBusy = false;
  };

  process = async () => {
    if (this._isBusy) return;
    this._isBusy = true;
    await this._processQueue();
  };
  isBusy = () => {
    return this._isBusy;
  };
}
