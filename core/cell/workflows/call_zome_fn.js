import { putElement } from '../source-chain/put';
import { getTipOfChain } from '../source-chain/utils';
import { produce_dht_ops_task } from './produce_dht_ops';
/**
 * Calls the zome function of the cell DNA
 * This can only be called in the simulated mode: we can assume that cell.simulatedDna exists
 */
export const callZomeFn = (zomeName, fnName, payload, cap) => async (cell) => {
    const currentHeader = getTipOfChain(cell.state);
    const dna = cell.getSimulatedDna();
    if (!dna)
        throw new Error(`Trying to do a simulated call to a cell that is not simulated`);
    const zomeIndex = dna.zomes.findIndex(zome => zome.name === zomeName);
    if (zomeIndex < 0)
        throw new Error(`There is no zome with the name ${zomeName} in this DNA`);
    if (!dna.zomes[zomeIndex].zome_functions[fnName])
        throw new Error(`There is function with the name ${fnName} in this zome with the name ${zomeName}`);
    const actions = dna.zomes[zomeIndex].zome_functions[fnName](payload);
    let result;
    for (const action of actions) {
        const element = await action(zomeIndex, cell);
        putElement(element)(cell.state);
        result = element;
    }
    if (getTipOfChain(cell.state) != currentHeader) {
        // Do validation
        // Trigger production of DHT Ops
        cell.triggerWorkflow(produce_dht_ops_task(cell));
    }
    return result;
};
//# sourceMappingURL=call_zome_fn.js.map