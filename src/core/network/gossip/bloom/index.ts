import { Dictionary } from '@holochain-open-dev/core-types';
import { getValidationReceipts } from '../../../cell';
import { P2pCell } from '../../p2p-cell';
import { getBadActions } from '../../utils';
import { GossipData, GossipDhtOpData } from '../types';

export const GOSSIP_INTERVAL_MS = 500;

export class SimpleBloomMod {
  gossip_on: boolean = true;

  lastBadActions = 0;

  constructor(protected p2pCell: P2pCell) {
    this.run_one_iteration();
  }

  async run_one_iteration(): Promise<void> {
    if (this.gossip_on) {
      const localDhtOpsHashes = this.p2pCell.cell.handle_fetch_op_hashes_for_constraints(
        this.p2pCell.storageArc,
        undefined,
        undefined
      );
      const localDhtOps = this.p2pCell.cell.handle_fetch_op_hash_data(
        localDhtOpsHashes
      );

      const state = this.p2pCell.cell._state;

      const dhtOpData: Dictionary<GossipDhtOpData> = {};

      for (const dhtOpHash of Object.keys(localDhtOps)) {
        const receipts = getValidationReceipts(dhtOpHash)(state);
        dhtOpData[dhtOpHash] = {
          op: localDhtOps[dhtOpHash],
          validation_receipts: receipts,
        };
      }

      const badActions = getBadActions(state);

      const gossips: GossipData = {
        badActions,
        neighbors: [],
        validated_dht_ops: dhtOpData,
      };

      for (const neighbor of this.p2pCell.neighbors) {
        await this.p2pCell.outgoing_gossip(neighbor, gossips);
      }

      if (badActions.length > 0 && badActions.length !== this.lastBadActions) {
        this.lastBadActions = badActions.length;
        for (const farPeer of this.p2pCell.farKnownPeers) {
          await this.p2pCell.outgoing_gossip(farPeer, gossips);
        }
      }
    }

    setTimeout(() => this.run_one_iteration(), GOSSIP_INTERVAL_MS);
  }
}
