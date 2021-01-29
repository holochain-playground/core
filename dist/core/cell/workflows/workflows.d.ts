import { Cell } from '../../cell';
export interface Workflow<D, R> {
    name: string;
    details: D;
    task: (cell: Cell) => Promise<R>;
}
export declare enum WorkflowTypes {
    CALL_ZOME = "Call Zome Function",
    SYS_VALIDATION = "System Validation",
    PUBLISH_DHT_OPS = "Publish DHT Ops",
    PRODUCE_DHT_OPS = "Produce DHT Ops",
    APP_VALIDATION = "App Validation",
    INTEGRATE_DHT_OPS = "Integrate DHT Ops",
    GENESIS = "Genesis",
    INCOMING_DHT_OPS = "Incoming DHT Ops"
}
