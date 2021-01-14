import { Conductor } from '../core/conductor';
import { sampleDnaTemplate } from '../dnas/sample-dna';
import { createConductors } from './create-conductors';

export async function buildSimulatedPlayground(
  numConductors: number
): Promise<Conductor[]> {
  return createConductors(numConductors, [], sampleDnaTemplate());
}
