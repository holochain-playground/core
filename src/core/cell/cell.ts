import { Observable, Subject } from 'rxjs';
import {
  CellId,
  AgentPubKey,
  Hash,
  Dictionary,
  DHTOp,
} from '@holochain-open-dev/core-types';
import { Conductor } from '../conductor';
import { genesis } from './workflows/genesis';
import { callZomeFn } from './workflows/call_zome_fn';
import { P2pCell } from '../network/p2p-cell';
import { incoming_dht_ops } from './workflows/incoming_dht_ops';
import { CellState } from './state';
import { Workflow } from './workflows/workflows';

export type CellSignal = 'after-workflow-executed' | 'before-workflow-executed';
export type CellSignalListener = (payload: any) => void;

export class Cell {
  #pendingWorkflows: Array<Workflow> = [];

  signals = {
    'after-workflow-executed': new Subject<Workflow>(),
    'before-workflow-executed': new Subject<Workflow>(),
  };

  constructor(
    public state: CellState,
    public conductor: Conductor,
    public p2p: P2pCell
  ) {
    // Let genesis be run before actually joining
    setTimeout(() => {
      this.p2p.join(this);
    });
  }

  get cellId(): CellId {
    return [this.state.dnaHash, this.state.agentPubKey];
  }

  get agentPubKey(): AgentPubKey {
    return this.cellId[1];
  }

  get dnaHash(): Hash {
    return this.cellId[0];
  }

  getSimulatedDna() {
    return this.conductor.registeredDnas[this.dnaHash];
  }

  static async create(
    conductor: Conductor,
    cellId: CellId,
    membrane_proof: any
  ): Promise<Cell> {
    const newCellState: CellState = {
      dnaHash: cellId[0],
      agentPubKey: cellId[1],
      CAS: {},
      integrationLimbo: {},
      metadata: {
        link_meta: [],
        misc_meta: {},
        system_meta: {},
      },
      validationLimbo: {},
      integratedDHTOps: {},
      authoredDHTOps: {},
      sourceChain: [],
    };

    const p2p = conductor.network.createP2pCell(cellId);

    const cell = new Cell(newCellState, conductor, p2p);

    await cell._runWorkflow({
      name: 'Genesis Workflow',
      description: 'Initialize the cell with all the needed databases',
      task: () => genesis(cellId[1], cellId[0], membrane_proof)(cell),
    });

    return cell;
  }

  getState(): CellState {
    return this.state;
  }

  triggerWorkflow(workflow: Workflow) {
    this.#pendingWorkflows.push(workflow);

    setTimeout(() => this._runPendingWorkflows());
  }

  async _runPendingWorkflows() {
    const workflowsToRun = this.#pendingWorkflows;
    this.#pendingWorkflows = [];

    const promises = workflowsToRun.map(w => this._runWorkflow(w));

    await Promise.all(promises);
  }

  async _runWorkflow(workflow: Workflow): Promise<any> {
    this.signals['before-workflow-executed'].next(workflow);

    const result = await this.conductor.executor.execute(() =>
      workflow.task(this)
    );

    this.signals['after-workflow-executed'].next(workflow);
    return result;
  }

  /** Workflows */

  callZomeFn(args: {
    zome: string;
    fnName: string;
    payload: any;
    cap: string;
  }): Promise<any> {
    return this._runWorkflow({
      name: 'Call Zome Function Workflow',
      description: `Zome: ${args.zome}, Function name: ${args.fnName}`,
      task: () =>
        callZomeFn(args.zome, args.fnName, args.payload, args.cap)(this),
    });
  }

  /** Network handlers */
  // https://github.com/holochain/holochain/blob/develop/crates/holochain/src/conductor/cell.rs#L429
  public async handle_new_neighbor(neighborPubKey: AgentPubKey): Promise<void> {
    this.p2p.addNeighbor(neighborPubKey);
  }

  public handle_publish(
    from_agent: AgentPubKey,
    dht_hash: Hash, // The basis for the DHTOps
    ops: Dictionary<DHTOp>
  ): Promise<void> {
    return this._runWorkflow({
      name: 'Incoming DHT Ops',
      description: 'Persist the recieved DHT Ops to validate them later',
      task: () => incoming_dht_ops(dht_hash, ops, from_agent)(this),
    });
  }
}
