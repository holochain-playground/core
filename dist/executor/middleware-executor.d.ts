import { Task } from './task';
export declare type Middleware<P> = (payload: P) => Promise<void>;
export declare class MiddlewareExecutor<P> {
    _beforeMiddlewares: Array<Middleware<P>>;
    _afterMiddlewares: Array<Middleware<P>>;
    execute<T>(task: Task<T>, payload: P): Promise<T>;
    before(callback: Middleware<P>): {
        unsubscribe: () => void;
    };
    after(callback: Middleware<P>): {
        unsubscribe: () => void;
    };
}
