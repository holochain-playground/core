import { Cell } from '../../cell';
import { HdkAction } from '../source-chain/actions';
import { putElement } from '../source-chain/put';
import { getTipOfChain } from '../source-chain/utils';
import { produce_dht_ops_task } from './produce_dht_ops';

/**
 * Calls the zome function of the cell DNA
 * This can only be called in the simulated mode: we can assume that cell.simulatedDna exists
 */
export const callZomeFn = (
  zome: string,
  fnName: string,
  payload: any,
  cap: string
) => async (cell: Cell): Promise<any> => {
  const currentHeader = getTipOfChain(cell.state);

  if (!cell.simulatedDna)
    throw new Error(
      `Trying to do a simulated call to a cell that is not simulated`
    );

  if (!cell.simulatedDna.zomes[zome])
    throw new Error(`There is no zome with the name ${zome} in this DNA`);

  if (!cell.simulatedDna.zomes[zome][fnName])
    throw new Error(
      `There is function with the name ${fnName} in this zome with the name ${zome}`
    );

  const actions: HdkAction[] = cell.simulatedDna.zomes[zome][fnName](payload);

  let result;
  for (const action of actions) {
    const element = await action(cell.state);

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
