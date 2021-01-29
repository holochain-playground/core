import { Cell } from '../../cell';

export interface Workflow<D, R> {
  name: string;
  details: D;
  task: (cell: Cell) => Promise<R>;
}
