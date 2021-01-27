import { Task } from '../../../executor/executor';
import { Cell, Workflow } from '../../cell';
import {
  ValidationLimboStatus,
  IntegrationLimboValue,
  ValidationStatus,
} from '../state';
import { getValidationLimboDhtOps } from '../dht/get';
import {
  deleteValidationLimboValue,
  putIntegrationLimboValue,
} from '../dht/put';
import { integrate_dht_ops_task } from './integrate_dht_ops';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/app_validation_workflow.rs
export const app_validation = async (cell: Cell): Promise<void> => {
  const pendingDhtOps = getValidationLimboDhtOps(
    cell.state,
    ValidationLimboStatus.SysValidated
  );

  // TODO: actually validate
  for (const dhtOpHash of Object.keys(pendingDhtOps)) {
    deleteValidationLimboValue(dhtOpHash)(cell.state);

    const validationLimboValue = pendingDhtOps[dhtOpHash];

    const value: IntegrationLimboValue = {
      op: validationLimboValue.op,
      validation_status: ValidationStatus.Valid,
    };

    putIntegrationLimboValue(dhtOpHash, value)(cell.state);
  }

  cell.triggerWorkflow(integrate_dht_ops_task(cell));
};

export function app_validation_task(cell: Cell): Workflow {
  return {
    name: 'App Validation of the DHT Op',
    description: 'Running of the zome appropriate zome hook',
    task: () => app_validation(cell),
  };
}
