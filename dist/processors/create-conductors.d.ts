import { Conductor } from '../core/conductor';
import { SimulatedDnaTemplate } from '../dnas/simulated-dna';
import { Executor } from '../executor/executor';
export declare function createConductors(conductorsToCreate: number, executor: Executor, currentConductors: Conductor[], dnaTemplate: SimulatedDnaTemplate): Promise<Conductor[]>;
