import { BootstrapService } from '../bootstrap/bootstrap-service';
import { Conductor } from '../core/conductor';
import { SimulatedDna, SimulatedHappBundle } from '../dnas/simulated-dna';
import { uniqueNamesGenerator, Config, names } from 'unique-names-generator';

const config: Config = {
  dictionaries: [names],
};

export async function createConductors(
  conductorsToCreate: number,
  currentConductors: Conductor[],
  dna: SimulatedDna
): Promise<Conductor[]> {
  const bootstrapService =
    currentConductors.length === 0
      ? new BootstrapService()
      : currentConductors[0].network.bootstrapService;

  const newConductorsPromises: Promise<Conductor>[] = [];
  for (let i = 0; i < conductorsToCreate; i++) {
    const characterName: string = uniqueNamesGenerator(config);
    const conductor = Conductor.create(bootstrapService, characterName);
    newConductorsPromises.push(conductor);
  }

  const newConductors = await Promise.all(newConductorsPromises);

  const allConductors = [...currentConductors, ...newConductors];

  const happ: SimulatedHappBundle = {
    name: 'simulated-app',
    description: '',
    slots: {
      default: {
        dna,
        deferred: false,
      },
    },
  };

  await Promise.all(allConductors.map(async c => c.installHapp(happ, {})));

  return allConductors;
}
