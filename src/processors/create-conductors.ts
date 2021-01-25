import { Conductor } from '../core/conductor';
import { SimulatedDnaTemplate } from '../dnas/simulated-dna';
import { Executor } from '../executor/executor';
import { hookUpConductors } from './message';

export async function createConductors(
  conductorsToCreate: number,
  executor: Executor,
  currentConductors: Conductor[],
  dnaTemplate: SimulatedDnaTemplate
): Promise<Conductor[]> {
  const newConductorsPromises: Promise<Conductor>[] = [];
  for (let i = 0; i < conductorsToCreate; i++) {
    const conductor = Conductor.create(executor);
    newConductorsPromises.push(conductor);
  }

  const newConductors = await Promise.all(newConductorsPromises);

  const allConductors = [...currentConductors, ...newConductors];

  await Promise.all(
    allConductors.map(async c => {
      const dnaHash = await c.registerDna(dnaTemplate);
      await c.installApp(dnaHash, null, null, '');
    })
  );

  hookUpConductors(allConductors);

  return allConductors;
}
