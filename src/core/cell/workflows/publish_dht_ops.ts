import { DHTOp, Dictionary } from '@holochain-open-dev/core-types';
import { Cell, Workflow } from '../../cell';
import { getNonPublishedDhtOps } from '../source-chain/utils';
import { getDHTOpBasis } from '../utils';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/publish_dht_ops_workflow.rs
export const publish_dht_ops = async (cell: Cell): Promise<void> => {
  const dhtOps = getNonPublishedDhtOps(cell.state);

  const dhtOpsByBasis: Dictionary<Dictionary<DHTOp>> = {};

  for (const dhtOpHash of Object.keys(dhtOps)) {
    const dhtOp = dhtOps[dhtOpHash];
    const basis = getDHTOpBasis(dhtOp);

    if (!dhtOpsByBasis[basis]) dhtOpsByBasis[basis] = {};

    dhtOpsByBasis[basis][dhtOpHash] = dhtOp;
  }

  const promises = Object.entries(dhtOpsByBasis).map(
    async ([basis, dhtOps]) => {
      // Publish the operations
      await cell.p2p.publish(basis, dhtOps);

      for (const dhtOpHash of Object.keys(dhtOps)) {
        cell.state.authoredDHTOps[dhtOpHash].last_publish_time = Date.now();
      }
    }
  );

  await Promise.all(promises);
};

export type PublishDhtOpsWorkflow = Workflow<void, void>;
export const PUBLISH_DHT_OPS_WORKFLOW = 'Publish DHT Ops';

export function publish_dht_ops_task(cell: Cell): PublishDhtOpsWorkflow {
  return {
    name: PUBLISH_DHT_OPS_WORKFLOW,
    details: undefined,
    task: () => publish_dht_ops(cell),
  };
}
