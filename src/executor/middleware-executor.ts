import { Task } from './task';

export type Middleware<P> = (payload: P) => Promise<void>;

export class MiddlewareExecutor<P> {
  _beforeMiddlewares: Array<Middleware<P>> = [];
  _afterMiddlewares: Array<Middleware<P>> = [];

  async execute<T>(task: Task<T>, payload: P): Promise<T> {
    for (const middleware of this._beforeMiddlewares) {
      await middleware(payload);
    }

    const result = await task();
    for (const middleware of this._afterMiddlewares) {
      await middleware(payload);
    }

    return result;
  }

  before(callback: Middleware<P>) {
    this._beforeMiddlewares.push(callback);

    return {
      unsubscribe: () => {
        const index = this._beforeMiddlewares.findIndex(c => c === callback);
        this._beforeMiddlewares.splice(index, 1);
      },
    };
  }
  after(callback: Middleware<P>) {
    this._afterMiddlewares.push(callback);

    return {
      unsubscribe: () => {
        const index = this._afterMiddlewares.findIndex(c => c === callback);
        this._afterMiddlewares.splice(index, 1);
      },
    };
  }
}
