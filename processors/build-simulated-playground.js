import { sampleDna } from '../dnas/sample-dna';
import { createConductors } from './create-conductors';
export async function buildSimulatedPlayground(numConductors) {
    return createConductors(numConductors, [], sampleDna());
}
//# sourceMappingURL=build-simulated-playground.js.map