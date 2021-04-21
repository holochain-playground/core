import { AgentPubKey, Hash } from "@holochain-open-dev/core-types";
import { Network } from "../network";

export const GOSSIP_INTERVAL_MS = 50;

export class SpaceActor {

    interval: any;
    pending_gossip_list: Array<[AgentPubKey, AgentPubKey]> = []

    constructor(protected network: Network, protected dnaHash: Hash) {
        this.interval = setInterval(()=> this.gossip_loop(), GOSSIP_INTERVAL_MS)
    }

    clear() {
        clearInterval(this.interval)
    }

    async gossip_loop(): Promise<void> {
        if (this.pending_gossip_list.length === 0) {
            await this.fetch_pending_gossip_list();
        } else {
            await this.process_next_gossip();
        }
    }

    async fetch_pending_gossip_list() {
        const localCells = this.network.p2pCells[this.dnaHash];

        for (const [agentPubKey, p2pCell] of Object.entries(localCells)) {
            for (const neighbor of p2pCell.neighbors) {
                this.pending_gossip_list.push([agentPubKey, neighbor])
            }
        }
    }

    async process_next_gossip() {
        const [from_agent, to_agent] = this.pending_gossip_list.shift() as [AgentPubKey, AgentPubKey];

        
    }

    async handle_req_op_hashes() {}
}