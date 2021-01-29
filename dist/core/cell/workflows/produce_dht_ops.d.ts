import { Cell, Workflow } from '../../cell';
export declare const produce_dht_ops: (cell: Cell) => Promise<void>;
export declare type ProduceDhtOpsWorkflow = Workflow<void, void>;
export declare const PRODUCE_DHT_OPS_WORKFLOW = "Produce DHT Ops";
export declare function produce_dht_ops_task(cell: Cell): ProduceDhtOpsWorkflow;
