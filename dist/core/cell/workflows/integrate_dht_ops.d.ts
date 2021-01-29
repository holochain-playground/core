import { Cell, Workflow } from '../../cell';
export declare const integrate_dht_ops: (cell: Cell) => Promise<void>;
export declare type IntegrateDhtOpsWorkflow = Workflow<void, void>;
export declare const INTEGRATE_DHT_OPS_WORKFLOW = "Integrate DHT Ops";
export declare function integrate_dht_ops_task(cell: Cell): IntegrateDhtOpsWorkflow;
