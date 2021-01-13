import { serializeHash } from '@holochain-open-dev/common';
import { Cell } from '../core/cell';
import { hash } from '../processors/hash';
import { Network } from './network';
export class Conductor {
    constructor(state) {
        this.network = new Network(state.networkState);
        this.cells = state.cellsState.map(({ id, state, dna }) => ({
            id,
            cell: new Cell(state, this.network.createP2pCell(id), dna),
        }));
    }
    static async create() {
        const state = {
            cellsState: [],
            networkState: {
                p2pCellsState: [],
            },
        };
        return new Conductor(state);
    }
    getState() {
        return {
            networkState: this.network.getState(),
            cellsState: this.cells.map((c) => ({
                id: c.id,
                state: c.cell.getState(),
            })),
        };
    }
    getCells(dnaHash) {
        const dnaHashStr = serializeHash(dnaHash);
        return this.cells
            .filter((cell) => serializeHash(cell.id[1]) === dnaHashStr)
            .map((c) => c.cell);
    }
    async installDna(dna, membrane_proof) {
        const rand = Math.random().toString();
        const agentId = hash(rand);
        const cell = await Cell.create(this, dna, agentId, membrane_proof);
        this.cells.push({ id: cell.cellId, cell });
        return cell;
    }
    callZomeFn(args) {
        const cell = this.cells.find((cell) => cell.id[0] === args.cellId[0] && cell.id[1] === args.cellId[1]);
        if (!cell)
            throw new Error(`No cells existst with cellId ${args.cellId[0]}:${args.cellId[1]}`);
        return cell.cell.callZomeFn({
            zome: args.zome,
            cap: args.cap,
            fnName: args.fnName,
            payload: args.payload,
        });
    }
}
//# sourceMappingURL=conductor.js.map