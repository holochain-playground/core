import { AgentPubKey, CellId, DHTOp, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { MiddlewareExecutor } from '../../executor/middleware-executor';
import { Cell } from '../cell';
import { Network } from './network';
export declare type P2pCellState = {
    neighbors: Hash[];
    redundancyFactor: number;
};
export interface NetworkRequestInfo {
    dnaHash: Hash;
    fromAgent: AgentPubKey;
    toAgent: AgentPubKey;
    name: string;
}
export declare class P2pCell {
    protected cellId: CellId;
    protected network: Network;
    neighbors: AgentPubKey[];
    redundancyFactor: number;
    networkRequestsExecutor: MiddlewareExecutor<NetworkRequestInfo>;
    constructor(state: P2pCellState, cellId: CellId, network: Network);
    getState(): P2pCellState;
    join(containerCell: Cell): Promise<void>;
    leave(): Promise<void>;
    publish(dht_hash: Hash, ops: Dictionary<DHTOp>): Promise<void>;
    addNeighbor(neighborPubKey: AgentPubKey): Promise<void>;
    get(dna_hash: Hash, from_agent: AgentPubKey, dht_hash: Hash, _options: any): Promise<Element | undefined>;
    getNeighbors(): Array<AgentPubKey>;
    private _getClosestNeighbors;
    private _sendRequest;
}
