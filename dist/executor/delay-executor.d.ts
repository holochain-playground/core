import { Executor, Task } from './executor';
export declare class DelayExecutor implements Executor {
    delayMillis: number;
    constructor(delayMillis: number);
    execute<T>(task: Task<T>): Promise<T>;
}
