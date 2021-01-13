import { deserializeHash, serializeHash } from '@holochain-open-dev/common';
import { P2pCell } from './network/p2p-cell';
export class Network {
    constructor(state) {
        this.p2pCells = state.p2pCellsState.map(s => ({
            id: s.id,
            p2pCell: new P2pCell(s.state, s.id, this),
        }));
        this.peerCells = {};
    }
    getState() {
        return {
            p2pCellsState: this.p2pCells.map(c => ({
                id: c.id,
                state: c.p2pCell.getState(),
            })),
        };
    }
    // TODO: change this to simulate networking if necessary
    connectWith(conductor) {
        for (const myCell of this.p2pCells) {
            const cellDna = serializeHash(myCell.id[1]);
            for (const cell of conductor.cells) {
                if (serializeHash(cell.id[1]) === cellDna) {
                    if (!this.peerCells[cellDna])
                        this.peerCells[cellDna] = {};
                    this.peerCells[cellDna][serializeHash(cell.id[0])] = cell.cell;
                    myCell.p2pCell.peers.push(cell.id[0]);
                }
            }
        }
    }
    createP2pCell(cellId) {
        const peersOfTheSameDna = this.peerCells[serializeHash(cellId[1])];
        const peersAlreadyKnown = peersOfTheSameDna
            ? Object.keys(peersOfTheSameDna).map(deserializeHash)
            : [];
        const state = {
            peers: peersAlreadyKnown,
            redundancyFactor: 3,
        };
        const p2pCell = new P2pCell(state, cellId, this);
        this.p2pCells.push({ id: cellId, p2pCell });
        return p2pCell;
    }
    sendMessage(dna, fromAgent, toAgent, message) {
        return message(this.peerCells[serializeHash(dna)][serializeHash(toAgent)]);
    }
}
//# sourceMappingURL=network.js.map