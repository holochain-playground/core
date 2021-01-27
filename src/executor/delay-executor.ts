import { Executor, Task } from './executor';

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(() => resolve(null), ms));

export class DelayExecutor implements Executor {
  constructor(public delayMillis: number) {}

  async execute<T>(task: Task<T>): Promise<T> {
    await sleep(this.delayMillis);
    const result = await task();

    return result;
  }
}
