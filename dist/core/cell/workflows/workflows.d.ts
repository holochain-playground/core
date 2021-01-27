import { Cell } from '../../cell';
export interface Workflow {
    name: string;
    description: string;
    task: (cell: Cell) => Promise<any>;
}
