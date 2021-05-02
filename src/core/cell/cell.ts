import {
  CellId,
  AgentPubKey,
  Hash,
  Dictionary,
  DHTOp,
  CapSecret,
  Timestamp,
  ValidationReceipt,
} from '@holochain-open-dev/core-types';
import { Conductor } from '../conductor';
import { genesis, genesis_task } from './workflows/genesis';
import {
  CallZomeFnWorkflow,
  call_zome_fn_workflow,
} from './workflows/call_zome_fn';
import { P2pCell } from '../network/p2p-cell';
import { incoming_dht_ops_task } from './workflows/incoming_dht_ops';
import { CellState, query_dht_ops } from './state';
import {
  triggeredWorkflowFromType,
  Workflow,
  workflowPriority,
  WorkflowType,
  Workspace,
} from './workflows/workflows';
import { MiddlewareExecutor } from '../../executor/middleware-executor';
import { GetLinksResponse, GetResult } from './cascade/types';
import { Authority } from './cascade/authority';
import { getHashType, hash, HashType } from '../../processors/hash';
import { GetLinksOptions, GetOptions } from '../../types';
import { cloneDeep } from 'lodash-es';
import { DhtArc } from '../network/dht_arc';
import { getDHTOpBasis } from './utils';
import { GossipData } from '../network/gossip/types';
import { hasDhtOpBeenProcessed } from './dht/get';
import { putValidationReceipt } from './dht/put';
import { BadAction, getBadAgents } from '../network/utils';

export type CellSignal = 'after-workflow-executed' | 'before-workflow-executed';
export type CellSignalListener = (payload: any) => void;

export class Cell {
  _triggers: Dictionary<{ running: boolean; triggered: boolean }> = {
    [WorkflowType.INTEGRATE_DHT_OPS]: { running: false, triggered: true },
    [WorkflowType.PRODUCE_DHT_OPS]: { running: false, triggered: true },
    [WorkflowType.PUBLISH_DHT_OPS]: { running: false, triggered: true },
    [WorkflowType.SYS_VALIDATION]: { running: false, triggered: true },
    [WorkflowType.APP_VALIDATION]: { running: false, triggered: true },
    [WorkflowType.VALIDATION_RECEIPT]: { running: false, triggered: true },
  };

  workflowExecutor = new MiddlewareExecutor<Workflow<any, any>>();

  constructor(
    private _state: CellState,
    public conductor: Conductor,
    public p2p: P2pCell
  ) {
    // Let genesis be run before actually joining
    setTimeout(() => {
      this.p2p.join(this);
    });
  }

  get cellId(): CellId {
    return [this._state.dnaHash, this._state.agentPubKey];
  }

  get agentPubKey(): AgentPubKey {
    return this.cellId[1];
  }

  get dnaHash(): Hash {
    return this.cellId[0];
  }

  getState(): CellState {
    return cloneDeep(this._state);
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
      validationReceipts: {},
      sourceChain: [],
    };

    const p2p = conductor.network.createP2pCell(cellId);

    const cell = new Cell(newCellState, conductor, p2p);

    await cell._runWorkflow(genesis_task(cellId, membrane_proof));

    return cell;
  }

  /** Workflows */

  callZomeFn(args: {
    zome: string;
    fnName: string;
    payload: any;
    cap: string;
    provenance: AgentPubKey;
  }): Promise<any> {
    return this._runWorkflow(
      call_zome_fn_workflow(
        args.zome,
        args.fnName,
        args.payload,
        args.provenance
      )
    );
  }

  /** Network handlers */
  // https://github.com/holochain/holochain/blob/develop/crates/holochain/src/conductor/cell.rs#L429
  public async handle_new_neighbor(neighborPubKey: AgentPubKey): Promise<void> {
    this.p2p.addNeighbor(neighborPubKey);
  }

  public handle_publish(
    from_agent: AgentPubKey,
    request_validation_receipt: boolean,
    ops: Dictionary<DHTOp>
  ): Promise<void> {
    return this._runWorkflow(
      incoming_dht_ops_task(from_agent, request_validation_receipt, ops)
    );
  }

  public async handle_get(
    dht_hash: Hash,
    options: GetOptions
  ): Promise<GetResult | undefined> {
    const authority = new Authority(this._state, this.p2p);

    const hashType = getHashType(dht_hash);
    if (hashType === HashType.ENTRY || hashType === HashType.AGENT) {
      return authority.handle_get_entry(dht_hash, options);
    } else if (hashType === HashType.HEADER) {
      return authority.handle_get_element(dht_hash, options);
    }
    return undefined;
  }

  public async handle_get_links(
    base_address: Hash,
    options: GetLinksOptions
  ): Promise<GetLinksResponse> {
    const authority = new Authority(this._state, this.p2p);
    return authority.handle_get_links(base_address, options);
  }

  public async handle_call_remote(
    from_agent: AgentPubKey,
    zome_name: string,
    fn_name: string,
    cap: CapSecret | undefined,
    payload: any
  ): Promise<any> {
    return this.callZomeFn({
      zome: zome_name,
      cap: cap as CapSecret,
      fnName: fn_name,
      payload,
      provenance: from_agent,
    });
  }

  /** Gossips */

  public handle_fetch_op_hashes_for_constraints(
    dht_arc: DhtArc,
    since: number | undefined,
    until: number | undefined
  ): Array<Hash> {
    return query_dht_ops(this._state.integratedDHTOps, since, until, dht_arc);
  }

  public handle_fetch_op_hash_data(op_hashes: Array<Hash>): Dictionary<DHTOp> {
    const result: Dictionary<DHTOp> = {};
    for (const opHash of op_hashes) {
      const value = this._state.integratedDHTOps[opHash];
      if (value) {
        result[opHash] = value.op;
      }
    }
    return result;
  }

  public handle_gossip_ops(op_hashes: Array<Hash>): Dictionary<DHTOp> {
    const result: Dictionary<DHTOp> = {};
    for (const opHash of op_hashes) {
      const value = this._state.integratedDHTOps[opHash];
      if (value) {
        result[opHash] = value.op;
      }
    }
    return result;
  }

  async handle_gossip(from_agent: AgentPubKey, gossip: GossipData) {
    const dhtOpsToProcess: Dictionary<DHTOp> = {};

    const badAgents = getBadAgents(this._state);

    for (const badAction of gossip.badActions) {
      const dhtOpHash = hash(badAction.op, HashType.DHTOP);
      if (!hasDhtOpBeenProcessed(this._state, dhtOpHash)) {
        dhtOpsToProcess[dhtOpHash] = badAction.op;
      }

      for (const receipt of badAction.receipts) {
        putValidationReceipt(dhtOpHash, receipt)(this._state);
      }
    }

    if (Object.keys(dhtOpsToProcess).length > 0) {
      await this.handle_publish(from_agent, false, dhtOpsToProcess);
    }

    for (const [dhtOpHash, validatedOp] of Object.entries(
      gossip.validated_dht_ops
    )) {
      if (hasDhtOpBeenProcessed(this._state, dhtOpHash)) {
        for (const receipt of validatedOp.validation_receipts) {
          putValidationReceipt(dhtOpHash, receipt)(this._state);
        }
      }
    }

    if (getBadAgents(this._state).length > badAgents.length) {
      // We may have added bad agents: resync the neighbors
      await this.p2p.syncNeighbors();
    }
  }

  /** Workflow internal execution */

  triggerWorkflow(workflow: Workflow<any, any>) {
    this._triggers[workflow.type].triggered = true;

    setTimeout(() => this._runPendingWorkflows());
  }

  async _runPendingWorkflows() {
    const pendingWorkflows: WorkflowType[] = Object.entries(this._triggers)
      .filter(([type, t]) => t.triggered && !t.running)
      .map(([type, t]) => type as WorkflowType);

    const workflowsToRun = pendingWorkflows.map(triggeredWorkflowFromType);

    const promises = Object.values(workflowsToRun).map(async w => {
      this._triggers[w.type].triggered = false;
      this._triggers[w.type].running = true;
      await this._runWorkflow(w);
      this._triggers[w.type].running = false;

      this._runPendingWorkflows();
    });

    await Promise.all(promises);
  }

  async _runWorkflow(workflow: Workflow<any, any>): Promise<any> {
    const result = await this.workflowExecutor.execute(
      () => workflow.task(this.buildWorkspace()),
      workflow
    );

    result.triggers.forEach(triggeredWorkflow =>
      this.triggerWorkflow(triggeredWorkflow)
    );
    return result.result;
  }

  /** Private helpers */

  private buildWorkspace(): Workspace {
    let badAgentConfig = undefined;
    let dna = this.getSimulatedDna();
    if (this.conductor.badAgent) {
      badAgentConfig = this.conductor.badAgent.config;
      if (
        this.conductor.badAgent.counterfeitDnas[this.cellId[0]] &&
        this.conductor.badAgent.counterfeitDnas[this.cellId[0]][this.cellId[1]]
      ) {
        dna = this.conductor.badAgent.counterfeitDnas[this.cellId[0]][
          this.cellId[1]
        ];
      }
    }

    return {
      state: this._state,
      p2p: this.p2p,
      dna,
      badAgentConfig,
    };
  }
}
