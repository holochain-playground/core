import { AgentPubKey, CapSecret, CellId, DHTOp, Dictionary, Hash, ValidationReceipt } from '@holochain-open-dev/core-types';
import { MiddlewareExecutor } from '../../executor/middleware-executor';
import { GetLinksOptions, GetOptions } from '../../types';
import { Cell } from '../cell';
import { GetElementResponse, GetEntryResponse, GetLinksResponse } from '../cell/cascade/types';
import { Network } from './network';
import { NetworkRequestInfo, NetworkRequest, NetworkRequestType } from './network-request';
export declare type P2pCellState = {
    neighbors: AgentPubKey[];
    farKnownPeers: AgentPubKey[];
    badAgents: AgentPubKey[];
    redundancyFactor: number;
    neighborNumber: number;
};
export declare class P2pCell {
    protected cellId: CellId;
    protected network: Network;
    neighbors: AgentPubKey[];
    badAgents: AgentPubKey[];
    farKnownPeers: AgentPubKey[];
    redundancyFactor: number;
    neighborNumber: number;
    networkRequestsExecutor: MiddlewareExecutor<NetworkRequestInfo<any, any>>;
    constructor(state: P2pCellState, cellId: CellId, network: Network);
    getState(): P2pCellState;
    /** P2p actions */
    join(containerCell: Cell): Promise<void>;
    leave(): Promise<void>;
    publish(dht_hash: Hash, ops: Dictionary<DHTOp>): Promise<void>;
    get(dht_hash: Hash, options: GetOptions): Promise<GetElementResponse | GetEntryResponse | undefined>;
    get_links(base_address: Hash, options: GetLinksOptions): Promise<GetLinksResponse[]>;
    call_remote(agent: AgentPubKey, zome: string, fnName: string, cap: CapSecret | undefined, payload: any): Promise<any>;
    gossip_bad_agents(dhtOp: DHTOp, myReceipt: ValidationReceipt, existingReceipts: ValidationReceipt[]): Promise<void>;
    /** Neighbor handling */
    getNeighbors(): Array<AgentPubKey>;
    addNeighbor(neighborPubKey: AgentPubKey): void;
    syncNeighbors(): Promise<void>;
    private _executeNetworkRequest;
    handle_network_request<R, T extends NetworkRequestType, D>(fromAgent: AgentPubKey, request: NetworkRequest<R>): Promise<R>;
}
