import {
  AgentPubKey,
  CapSecret,
  CellId,
  DHTOp,
  Dictionary,
  Hash,
  ValidationReceipt,
  ValidationStatus,
} from '@holochain-open-dev/core-types';
import { MiddlewareExecutor } from '../../executor/middleware-executor';
import { hash, HashType, location } from '../../processors/hash';
import { GetLinksOptions, GetOptions } from '../../types';
import { Cell, isHoldingDhtOp } from '../cell';
import {
  GetElementResponse,
  GetEntryResponse,
  GetLinksResponse,
} from '../cell/cascade/types';
import { DhtArc } from './dht_arc';
import { SimpleBloomMod } from './gossip/bloom';
import { GossipData } from './gossip/types';
import { Network } from './network';
import {
  NetworkRequestInfo,
  NetworkRequest,
  NetworkRequestType,
} from './network-request';
import { getBadAgents } from './utils';

export type P2pCellState = {
  neighbors: AgentPubKey[];
  farKnownPeers: AgentPubKey[];
  badAgents: AgentPubKey[];
  redundancyFactor: number;
  neighborNumber: number;
};

// From: https://github.com/holochain/holochain/blob/develop/crates/holochain_p2p/src/lib.rs
export class P2pCell {
  neighbors: AgentPubKey[];
  farKnownPeers: AgentPubKey[];

  storageArc: DhtArc;
  neighborNumber: number;
  redundancyFactor = 3;

  _gossipLoop!: SimpleBloomMod;

  networkRequestsExecutor = new MiddlewareExecutor<
    NetworkRequestInfo<any, any>
  >();

  constructor(
    state: P2pCellState,
    protected cellId: CellId,
    protected network: Network
  ) {
    this.neighbors = state.neighbors;
    this.farKnownPeers = state.farKnownPeers;
    this.redundancyFactor = state.redundancyFactor;
    this.neighborNumber = state.neighborNumber;

    this.storageArc = {
      center_loc: location(this.cellId[1]),
      half_length: 2 ^ 255,
    };
  }

  getState(): P2pCellState {
    return {
      badAgents: this.badAgents,
      neighbors: this.neighbors,
      farKnownPeers: this.farKnownPeers,
      redundancyFactor: this.redundancyFactor,
      neighborNumber: this.neighborNumber,
    };
  }

  get cell(): Cell {
    return this.network.conductor.getCell(
      this.cellId[0],
      this.cellId[1]
    ) as Cell;
  }

  get badAgents() {
    if (
      this.cell.conductor.badAgent &&
      this.cell.conductor.badAgent.config.pretend_invalid_elements_are_valid
    )
      return [];

    return getBadAgents(this.cell._state);
  }

  /** P2p actions */

  async join(containerCell: Cell): Promise<void> {
    this.network.bootstrapService.announceCell(this.cellId, containerCell);
    this._gossipLoop = new SimpleBloomMod(this);

    await this.syncNeighbors();
  }

  async leave(): Promise<void> {}

  async publish(dht_hash: Hash, ops: Dictionary<DHTOp>): Promise<void> {
    await this.network.kitsune.rpc_multi(
      this.cellId[0],
      this.cellId[1],
      dht_hash,
      this.redundancyFactor,
      this.badAgents,
      (cell: Cell) =>
        this._executeNetworkRequest(
          cell,
          NetworkRequestType.PUBLISH_REQUEST,
          { dhtOps: ops },
          (cell: Cell) => cell.handle_publish(this.cellId[1], true, ops)
        )
    );
  }

  async get(
    dht_hash: Hash,
    options: GetOptions
  ): Promise<GetElementResponse | GetEntryResponse | undefined> {
    const gets = await this.network.kitsune.rpc_multi(
      this.cellId[0],
      this.cellId[1],
      dht_hash,
      1, // TODO: what about this?
      this.badAgents,
      (cell: Cell) =>
        this._executeNetworkRequest(
          cell,
          NetworkRequestType.GET_REQUEST,
          { hash: dht_hash, options },
          (cell: Cell) => cell.handle_get(dht_hash, options)
        )
    );

    return gets.find(get => !!get);
  }

  async get_links(
    base_address: Hash,
    options: GetLinksOptions
  ): Promise<GetLinksResponse[]> {
    return this.network.kitsune.rpc_multi(
      this.cellId[0],
      this.cellId[1],
      base_address,
      1, // TODO: what about this?
      this.badAgents,
      (cell: Cell) =>
        this._executeNetworkRequest(
          cell,
          NetworkRequestType.GET_REQUEST,
          { hash: base_address, options },
          (cell: Cell) => cell.handle_get_links(base_address, options)
        )
    );
  }

  async call_remote(
    agent: AgentPubKey,
    zome: string,
    fnName: string,
    cap: CapSecret | undefined,
    payload: any
  ): Promise<any> {
    return this.network.kitsune.rpc_single(
      this.cellId[0],
      this.cellId[1],
      agent,
      (cell: Cell) =>
        this._executeNetworkRequest(
          cell,
          NetworkRequestType.CALL_REMOTE,
          {},
          (cell: Cell) =>
            cell.handle_call_remote(this.cellId[1], zome, fnName, cap, payload)
        )
    );
  }

  /** Neighbor handling */

  public getNeighbors(): Array<AgentPubKey> {
    return this.neighbors;
  }

  addNeighbor(neighborPubKey: AgentPubKey) {
    if (
      neighborPubKey !== this.cellId[1] &&
      !this.neighbors.includes(neighborPubKey)
    ) {
      this.syncNeighbors();
    }
  }

  async syncNeighbors() {
    const dnaHash = this.cellId[0];
    const agentPubKey = this.cellId[1];

    this.farKnownPeers = this.network.bootstrapService
      .getFarKnownPeers(dnaHash, agentPubKey, this.badAgents)
      .map(p => p.agentPubKey);

    const neighbors = this.network.bootstrapService
      .getNeighborhood(
        dnaHash,
        agentPubKey,
        this.neighborNumber,
        this.badAgents
      )
      .filter(cell => cell.agentPubKey != agentPubKey);

    const newNeighbors = neighbors.filter(
      cell => !this.neighbors.includes(cell.agentPubKey)
    );
    this.neighbors = neighbors.map(n => n.agentPubKey);

    const promises = newNeighbors.map(neighbor =>
      this._executeNetworkRequest(
        neighbor,
        NetworkRequestType.ADD_NEIGHBOR,
        {},
        (cell: Cell) => cell.handle_new_neighbor(agentPubKey)
      )
    );
    await Promise.all(promises);

    if (this.neighbors.length < this.neighborNumber) {
      setTimeout(() => this.syncNeighbors(), 400);
    }
  }

  // TODO: fix when sharding is implemented
  shouldWeHold(dhtOpHash: Hash): boolean {
    const neighbors = this.network.bootstrapService.getNeighborhood(
      this.cellId[0],
      dhtOpHash,
      this.redundancyFactor + 1,
      this.badAgents
    );

    const index = neighbors.findIndex(
      cell => cell.agentPubKey === this.cellId[1]
    );
    return index >= 0 && index < this.redundancyFactor;
  }

  /** Gossip */

  public async outgoing_gossip(
    to_agent: AgentPubKey,
    gossips: GossipData
  ): Promise<void> {
    // TODO: remove peer discovery?
    await this.network.kitsune.rpc_single(
      this.cellId[0],
      this.cellId[1],
      to_agent,
      (cell: Cell) =>
        this._executeNetworkRequest(
          cell,
          NetworkRequestType.GOSSIP,
          {},
          (cell: Cell) => cell.handle_gossip(this.cellId[1], gossips)
        )
    );
  }

  /** Executors */

  private _executeNetworkRequest<R, T extends NetworkRequestType, D>(
    toCell: Cell,
    type: T,
    details: D,
    request: NetworkRequest<R>
  ): Promise<R> {
    const networkRequest: NetworkRequestInfo<T, D> = {
      fromAgent: this.cellId[1],
      toAgent: toCell.agentPubKey,
      dnaHash: this.cellId[0],
      type,
      details,
    };
    if (toCell.p2p.badAgents.includes(this.cellId[1]))
      throw new Error('Connection closed!');

    return this.networkRequestsExecutor.execute(
      () => toCell.p2p.handle_network_request(this.cellId[1], request),
      networkRequest
    );
  }

  public handle_network_request<R>(
    fromAgent: AgentPubKey,
    request: NetworkRequest<R>
  ) {
    return request(this.cell);
  }
}
