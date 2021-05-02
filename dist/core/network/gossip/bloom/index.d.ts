import { P2pCell } from '../../p2p-cell';
export declare const GOSSIP_INTERVAL_MS = 500;
export declare class SimpleBloomMod {
    protected p2pCell: P2pCell;
    gossip_on: boolean;
    constructor(p2pCell: P2pCell);
    run_one_iteration(): Promise<void>;
}
