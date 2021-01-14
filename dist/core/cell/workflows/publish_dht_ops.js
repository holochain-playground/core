import { deserializeHash, serializeHash } from '@holochain-open-dev/common';
import { getNonPublishedDhtOps } from '../source-chain/utils';
import { getDHTOpBasis } from '../utils';
export function publish_dht_ops_task(cell) {
    return {
        name: 'Publish DHT Ops',
        description: 'Read the elements in the authored DHT Ops that have not been published and publish them',
        task: () => publish_dht_ops(cell),
    };
}
// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/publish_dht_ops_workflow.rs
export const publish_dht_ops = async (cell) => {
    const dhtOps = getNonPublishedDhtOps(cell.state);
    const dhtOpsByBasis = {};
    for (const dhtOpHash of Object.keys(dhtOps)) {
        const dhtOp = dhtOps[dhtOpHash];
        const basis = serializeHash(getDHTOpBasis(dhtOp));
        if (!dhtOpsByBasis[basis])
            dhtOpsByBasis[basis] = {};
        dhtOpsByBasis[basis][dhtOpHash] = dhtOp;
    }
    const promises = Object.entries(dhtOpsByBasis).map(async ([basis, dhtOps]) => {
        // Publish the operations
        await cell.p2p.publish(deserializeHash(basis), dhtOps);
        for (const dhtOpHash of Object.keys(dhtOps)) {
            cell.state.authoredDHTOps[dhtOpHash].last_publish_time = Date.now();
        }
    });
    await Promise.all(promises);
};
//# sourceMappingURL=publish_dht_ops.js.map