import { Conductor } from '../core/conductor';
import { SimulatedDna } from '../dnas/simulated-dna';
import { hookUpConductors } from './message';

export async function createConductors(
  conductorsToCreate: number,
  currentConductors: Conductor[],
  dna: SimulatedDna
): Promise<Conductor[]> {
  const newConductorsPromises: Promise<Conductor>[] = [];
  for (let i = 0; i < conductorsToCreate; i++) {
    const conductor = Conductor.create();
    newConductorsPromises.push(conductor);
  }

  const newConductors = await Promise.all(newConductorsPromises);

  const allConductors = [...currentConductors, ...newConductors];

  await Promise.all(allConductors.map(c => c.installDna(dna, null)));

  hookUpConductors(allConductors);

  return allConductors;
}
