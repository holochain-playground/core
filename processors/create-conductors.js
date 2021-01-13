import { Conductor } from '../core/conductor';
import { hookUpConductors } from './message';
export async function createConductors(conductorsToCreate, currentConductors, dna) {
    const newConductorsPromises = [];
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
//# sourceMappingURL=create-conductors.js.map