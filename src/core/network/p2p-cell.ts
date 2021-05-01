import {
  AgentPubKey,
  CapSecret,
  CellId,
  DHTOp,
  Dictionary,
  Element,
  Hash,
  ValidationReceipt,
  ValidationStatus,
} from '@holochain-open-dev/core-types';
import { isEqual } from 'lodash-es';
import { MiddlewareExecutor } from '../../executor/middleware-executor';
import { hash, HashType } from '../../processors/hash';
import { GetLinksOptions, GetOptions } from '../../types';
import { Cell } from '../cell';
import {
  GetElementResponse,
  GetEntryResponse,
  GetLinksResponse,
} from '../cell/cascade/types';
import { Network } from './network';
import {
  NetworkRequestInfo,
  NetworkRequest,
  NetworkRequestType,
} from './network-request';

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
  badAgents: AgentPubKey[];
  farKnownPeers: AgentPubKey[];

  redundancyFactor: number;
  neighborNumber: number;

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
    this.badAgents = state.badAgents;
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

  /** P2p actions */

  async join(containerCell: Cell): Promise<void> {
    this.network.bootstrapService.announceCell(this.cellId, containerCell);

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
          (cell: Cell) => cell.handle_publish(this.cellId[1], dht_hash, ops, [])
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

  async gossip_bad_agents(
    dhtOp: DHTOp,
    myReceipt: ValidationReceipt,
    existingReceipts: ValidationReceipt[]
  ): Promise<void> {
    existingReceipts = existingReceipts.filter(
      r => r.validator !== this.cellId[1]
    );

    const badAgents: AgentPubKey[] = [];

    if (myReceipt.validation_status === ValidationStatus.Rejected)
      badAgents.push(dhtOp.header.header.content.author);

    for (const existingReceipt of existingReceipts) {
      if (existingReceipt.validation_status !== myReceipt.validation_status) {
        badAgents.push(existingReceipt.validator);
      }
    }

    let alarm = false;

    if (
      !(
        this.network.conductor.badAgent &&
        this.network.conductor.badAgent.config
          .pretend_invalid_elements_are_valid
      )
    ) {
      for (const badAgent of badAgents) {
        if (!this.badAgents.includes(badAgent)) {
          alarm = true;
          this.badAgents.push(badAgent);
        }
      }
    }

    const neighbors = [...this.neighbors];

    await this.syncNeighbors();
    this.farKnownPeers = this.farKnownPeers.filter(
      agent => !badAgents.includes(agent)
    );

    if (alarm || !isEqual(this.neighbors.sort(), neighbors.sort())) {
      const dhtOpHash = hash(dhtOp, HashType.DHTOP);
      const promises = this.neighbors.map(neighborAgent => {
        this.network.kitsune.rpc_single(
          this.cellId[0],
          this.cellId[1],
          neighborAgent,
          (cell: Cell) =>
            this._executeNetworkRequest(
              cell,
              NetworkRequestType.GOSSIP,
              {},
              (cell: Cell) =>
                cell.handle_publish(
                  this.cellId[1],
                  dhtOpHash,
                  {
                    [dhtOpHash]: dhtOp,
                  },
                  [myReceipt, ...existingReceipts]
                )
            )
        );
      });
      await Promise.all(promises);
    }
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
      .getFarKnownPeers(dnaHash, agentPubKey)
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

    return this.networkRequestsExecutor.execute(
      () => toCell.p2p.handle_network_request(this.cellId[1], request),
      networkRequest
    );
  }

  public handle_network_request<R, T extends NetworkRequestType, D>(
    fromAgent: AgentPubKey,
    request: NetworkRequest<R>
  ) {
    if (this.badAgents.includes(fromAgent)) throw new Error('Bad Agent!');

    const cell = this.network.conductor.getCell(
      this.cellId[0],
      this.cellId[1]
    ) as Cell;

    return request(cell);
  }
}
