import {
  SimulatedZomeFunctionContext,
} from '../../dnas/simulated-dna';
import { Cell } from '../cell';
import { create_entry } from './actions';

export function buildZomeFunctionContext(
  zome_index: number,
  cell: Cell
): SimulatedZomeFunctionContext {
  return {
    create_entry: create_entry(zome_index, cell),
  };
}
