import { Cell } from '../../cell';
export interface Workflow<P, R> {
    name: string;
    description: string;
    payload: P;
    task: (cell: Cell) => Promise<R>;
}
