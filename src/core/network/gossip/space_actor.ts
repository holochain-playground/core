import {
  AgentPubKey,
  DHTOp,
  Dictionary,
  Hash,
} from '@holochain-open-dev/core-types';
import { Network } from '../network';
import {
  GossipEvt,
  LocalOpHashesAgentHashes,
  OpCount,
  OpDataAgentInfo,
  OpHashesAgentHashes,
  ReqOpDataEvt,
  ReqOpHashesEvt,
} from './types';

export const GOSSIP_INTERVAL_MS = 50;

export class SpaceActor {
  interval: any;
  pending_gossip_list: Array<[AgentPubKey, AgentPubKey]> = [];
  last_counts: Dictionary<[number, number]> = {};

  constructor(public network: Network, public dnaHash: Hash) {
    this.interval = setInterval(() => this.gossip_loop(), GOSSIP_INTERVAL_MS);
  }

  clear() {
    clearInterval(this.interval);
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
        this.pending_gossip_list.push([agentPubKey, neighbor]);
      }
    }
  }

  async process_next_gossip() {
    const [from_agent, to_agent] = this.pending_gossip_list.shift() as [
      AgentPubKey,
      AgentPubKey
    ];

    if (!this.last_counts[to_agent]) {
      this.last_counts[to_agent] = [0, 0];
    }

    const p2pCell = this.network.p2pCells[this.dnaHash][from_agent];

    const last_count = this.last_counts[to_agent];

    const [
      opHashes,
      agentHashes,
    ] = await p2pCell.handle_fetch_op_hashes_for_constraints({
      dht_arc: p2pCell.storageArc,
      from_agent,
      to_agent: from_agent,
      op_count: 'Variance',
      since_utc_epoch_s: undefined,
      until_utc_epoch_s: undefined,
    });

    let op_count: OpCount = 'Variance';
    if (
      (opHashes as { Variance: string[] }).Variance.length === last_count[0]
    ) {
      op_count = { Consistent: last_count[1] };
    }

    const [
      toOpHashes,
      toAgentHashes,
    ] = await p2pCell.fetch_op_hashes_for_constraints({
      dht_arc: p2pCell.storageArc,
      from_agent,
      to_agent,
      op_count,
      since_utc_epoch_s: undefined,
      until_utc_epoch_s: undefined,
    });
  }

  async handle_req_op_hashes(
    input: ReqOpHashesEvt
  ): Promise<OpHashesAgentHashes> {
    // Note: we want to simulate always a network request, and not shortcut it, in gossips
    const p2pCell = this.network.p2pCells[this.dnaHash][input.from_agent];
    return p2pCell.fetch_op_hashes_for_constraints(input);
  }

  async handle_req_op_data(input: ReqOpDataEvt): Promise<OpDataAgentInfo> {
    const p2pCell = this.network.p2pCells[this.dnaHash][input.from_agent];
    return p2pCell.fetch_op_data(input);
  }

  async handle_gossip_ops(input: GossipEvt): Promise<void> {
    const p2pCell = this.network.p2pCells[this.dnaHash][input.from_agent];
    await p2pCell.gossip_ops(input);
  }
}
