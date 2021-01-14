import { serializeHash } from '@holochain-open-dev/common';
import { Cell } from '../core/cell';
import { hash } from '../processors/hash';
import { Network } from './network';
export class Conductor {
    constructor(state) {
        this.network = new Network(state.networkState);
        this.cells = state.cellsState.map(({ id, state }) => ({
            id,
            cell: new Cell(this, state, this.network.createP2pCell(id)),
        }));
        this.registeredDnas = state.registeredDnas;
    }
    static async create() {
        const state = {
            cellsState: [],
            networkState: {
                p2pCellsState: [],
            },
            registeredDnas: {},
        };
        return new Conductor(state);
    }
    getState() {
        return {
            networkState: this.network.getState(),
            cellsState: this.cells.map(c => ({
                id: c.id,
                state: c.cell.getState(),
            })),
            registeredDnas: this.registeredDnas,
        };
    }
    getCells(dnaHash) {
        const dnaHashStr = serializeHash(dnaHash);
        return this.cells
            .filter(cell => serializeHash(cell.id[1]) === dnaHashStr)
            .map(c => c.cell);
    }
    async registerDna(dna_template) {
        const templateHash = hash(dna_template);
        this.registeredTemplates[serializeHash(templateHash)] = dna_template;
        return templateHash;
    }
    async installApp(dna_hash, membrane_proof, properties, uuid) {
        const rand = `${Math.random().toString()}/${Date.now()}`;
        const agentId = hash(rand);
        const template = this.registeredTemplates[serializeHash(dna_hash)];
        if (!template) {
            throw new Error(`The given dna is not registered on this conductor`);
        }
        const dna = {
            ...template,
            properties,
            uuid,
        };
        const dnaHash = hash(dna);
        this.registeredDnas[serializeHash(dnaHash)] = dna;
        const cellId = [dnaHash, agentId];
        const cell = await Cell.create(this, cellId, membrane_proof);
        this.cells.push({ id: cell.cellId, cell });
        return cell;
    }
    callZomeFn(args) {
        const dnaHashStr = serializeHash(args.cellId[0]);
        const agentPubKeyStr = serializeHash(args.cellId[1]);
        const cell = this.cells.find(cell => serializeHash(cell.id[0]) === dnaHashStr &&
            serializeHash(cell.id[1]) === agentPubKeyStr);
        if (!cell)
            throw new Error(`No cells existst with cellId ${dnaHashStr}:${agentPubKeyStr}`);
        return cell.cell.callZomeFn({
            zome: args.zome,
            cap: args.cap,
            fnName: args.fnName,
            payload: args.payload,
        });
    }
}
//# sourceMappingURL=conductor.js.map