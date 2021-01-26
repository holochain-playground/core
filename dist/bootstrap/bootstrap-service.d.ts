import { AgentPubKey, Dictionary, Hash } from '@holochain-open-dev/core-types';
import { Cell } from '../core/cell';
export declare class BootstrapService {
    cells: Dictionary<Dictionary<Cell>>;
    announceCell(cell: Cell): void;
    getNeighbors(dnaHash: Hash, agentPubKey: AgentPubKey, numNeighbors: number): Cell[];
}
