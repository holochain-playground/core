import { AgentPubKey, DHTOp, Dictionary, Hash, Metadata, ValidationReceipt } from '@holochain-open-dev/core-types';
import { DhtArc } from '../network/dht_arc';
export interface CellState {
    dnaHash: Hash;
    agentPubKey: AgentPubKey;
    sourceChain: Array<Hash>;
    CAS: Dictionary<any>;
    metadata: Metadata;
    integratedDHTOps: Dictionary<IntegratedDhtOpsValue>;
    authoredDHTOps: Dictionary<AuthoredDhtOpsValue>;
    integrationLimbo: Dictionary<IntegrationLimboValue>;
    validationLimbo: Dictionary<ValidationLimboValue>;
    validationReceipts: Dictionary<Dictionary<ValidationReceipt>>;
}
export interface IntegratedDhtOpsValue {
    op: DHTOp;
    validation_status: ValidationStatus;
    when_integrated: number;
    send_receipt: Boolean;
}
export interface IntegrationLimboValue {
    op: DHTOp;
    validation_status: ValidationStatus;
    send_receipt: Boolean;
}
export declare enum ValidationStatus {
    Valid = 0,
    Rejected = 1,
    Abandoned = 2
}
export interface AuthoredDhtOpsValue {
    op: DHTOp;
    receipt_count: number;
    last_publish_time: number | undefined;
}
export declare enum ValidationLimboStatus {
    Pending = 0,
    AwaitingSysDeps = 1,
    SysValidated = 2,
    AwaitingAppDeps = 3
}
export interface ValidationLimboValue {
    status: ValidationLimboStatus;
    op: DHTOp;
    basis: Hash;
    time_added: number;
    last_try: number | undefined;
    num_tries: number;
    from_agent: AgentPubKey | undefined;
    send_receipt: Boolean;
}
export declare function query_dht_ops(integratedDHTOps: Dictionary<IntegratedDhtOpsValue>, from: number | undefined, to: number | undefined, dht_arc: DhtArc): Array<Hash>;
