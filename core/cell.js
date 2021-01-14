var _pendingWorkflows, _signals;
import { __classPrivateFieldGet, __classPrivateFieldSet } from "tslib";
import { Subject } from 'rxjs';
import { getAgentPubKey, } from '@holochain-open-dev/core-types';
import { genesis } from './cell/workflows/genesis';
import { ImmediateExecutor } from '../executor/immediate-executor';
import { callZomeFn } from './cell/workflows/call_zome_fn';
import { getCellId, getDnaHash } from './cell/source-chain/utils';
import { incoming_dht_ops } from './cell/workflows/incoming_dht_ops';
import { serializeHash } from '@holochain-open-dev/common';
export class Cell {
    constructor(conductor, state, p2p) {
        this.conductor = conductor;
        this.state = state;
        this.p2p = p2p;
        this.executor = new ImmediateExecutor();
        _pendingWorkflows.set(this, []);
        _signals.set(this, {
            'after-workflow-executed': new Subject(),
            'before-workflow-executed': new Subject(),
        });
    }
    get cellId() {
        return getCellId(this.state);
    }
    get agentPubKey() {
        return getAgentPubKey(this.cellId);
    }
    get dnaHash() {
        return getDnaHash(this.state);
    }
    get signals() {
        return __classPrivateFieldGet(this, _signals);
    }
    getSimulatedDna() {
        return this.conductor.registeredDnas[serializeHash(this.dnaHash)];
    }
    static async create(conductor, cellId, membrane_proof) {
        const newCellState = {
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
        const cell = new Cell(conductor, newCellState, p2p);
        await cell.executor.execute({
            name: 'Genesis Workflow',
            description: 'Initialize the cell with all the needed databases',
            task: () => genesis(cellId[1], cellId[0], membrane_proof)(cell),
        });
        return cell;
    }
    getState() {
        return this.state;
    }
    triggerWorkflow(workflow) {
        __classPrivateFieldGet(this, _pendingWorkflows).push(workflow);
        setTimeout(() => this._runPendingWorkflows());
    }
    async _runPendingWorkflows() {
        const workflowsToRun = __classPrivateFieldGet(this, _pendingWorkflows);
        __classPrivateFieldSet(this, _pendingWorkflows, []);
        const promises = workflowsToRun.map(w => {
            __classPrivateFieldGet(this, _signals)['before-workflow-executed'].next(w);
            this.executor
                .execute(w)
                .then(() => __classPrivateFieldGet(this, _signals)['after-workflow-executed'].next(w));
        });
        await Promise.all(promises);
    }
    /** Workflows */
    callZomeFn(args) {
        return this.executor.execute({
            name: 'Call Zome Function Workflow',
            description: `Zome: ${args.zome}, Function name: ${args.fnName}`,
            task: () => callZomeFn(args.zome, args.fnName, args.payload, args.cap)(this),
        });
    }
    /** Network handlers */
    // https://github.com/holochain/holochain/blob/develop/crates/holochain/src/conductor/cell.rs#L429
    handle_publish(from_agent, dht_hash, // The basis for the DHTOps
    ops) {
        return incoming_dht_ops(dht_hash, ops, from_agent)(this);
    }
}
_pendingWorkflows = new WeakMap(), _signals = new WeakMap();
//# sourceMappingURL=cell.js.map