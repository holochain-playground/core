import { Cell, Workflow } from '../../cell';
export declare type ProduceDhtOpsWorkflow = Workflow<void, void>;
export declare function produce_dht_ops_task(cell: Cell): ProduceDhtOpsWorkflow;
export declare const produce_dht_ops: (cell: Cell) => Promise<void>;
