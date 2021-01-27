export type Task<T> = () => Promise<T>;

export interface Executor {
  execute<T>(task: Task<T>): Promise<T>;
}
