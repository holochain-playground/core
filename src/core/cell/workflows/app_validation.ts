import { Cell, Workflow } from '../../cell';
import {
  ValidationLimboStatus,
  IntegrationLimboValue,
  ValidationStatus,
  CellState,
} from '../state';
import { getValidationLimboDhtOps } from '../dht/get';
import {
  deleteValidationLimboValue,
  putIntegrationLimboValue,
} from '../dht/put';
import { integrate_dht_ops_task } from './integrate_dht_ops';
import { WorkflowReturn, WorkflowType, Workspace } from './workflows';
import {
  AppEntryType,
  DHTOp,
  DHTOpType,
  Element,
  NewEntryHeader,
  Update,
} from '@holochain-open-dev/core-types';
import { SimulatedDna, SimulatedZome } from '../../../dnas/simulated-dna';
import { SimulatedZomeFunctionContext } from '../../hdk';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/app_validation_workflow.rs
export const app_validation = async (
  worskpace: Workspace
): Promise<WorkflowReturn<void>> => {
  const pendingDhtOps = getValidationLimboDhtOps(
    worskpace.state,
    ValidationLimboStatus.SysValidated
  );

  // TODO: actually validate
  for (const dhtOpHash of Object.keys(pendingDhtOps)) {
    const validationLimboValue = pendingDhtOps[dhtOpHash];

    try {
      await validate(worskpace.dna, validationLimboValue.op);

      deleteValidationLimboValue(dhtOpHash)(worskpace.state);

      const value: IntegrationLimboValue = {
        op: validationLimboValue.op,
        validation_status: ValidationStatus.Valid,
      };

      putIntegrationLimboValue(dhtOpHash, value)(worskpace.state);
    } catch (e) {}
  }

  return {
    result: undefined,
    triggers: [integrate_dht_ops_task()],
  };
};

export type AppValidationWorkflow = Workflow<any, any>;

export function app_validation_task(): AppValidationWorkflow {
  return {
    type: WorkflowType.APP_VALIDATION,
    details: undefined,
    task: worskpace => app_validation(worskpace),
  };
}

export async function validate(
  dna: SimulatedDna,
  dhtOp: DHTOp,
  context: SimulatedZomeFunctionContext
): Promise<boolean> {
  switch (dhtOp.type) {
    case DHTOpType.StoreEntry:
      const header: NewEntryHeader = dhtOp.header.header.content;

      if (
        (header.entry_type as {
          App: AppEntryType;
        }).App
      ) {
        const app_entry_type = (header.entry_type as {
          App: AppEntryType;
        }).App;

        const zome = dna.zomes[app_entry_type.zome_id];
        const entryId = zome.entry_defs[app_entry_type.id];

        const prefix = (header as Update).original_header_address
          ? 'update'
          : 'create';

        const validate_functions = [
          `validate`,
          `validate_${prefix}_entry`,
          `validate_${prefix}_entry_${entryId.id}`,
        ];

        const element: Element = {
          entry: dhtOp.entry,
          signed_header: dhtOp.header,
        };

        return validate_functions.every(fn =>
          callIfExisting(fn, zome, context, element)
        );
      }
    
  }
}

export async function callIfExisting(
  fnName: string,
  zome: SimulatedZome,
  context: SimulatedZomeFunctionContext,
  element: Element
): Promise<boolean> {
  if (Object.keys(zome.zome_functions).includes(fnName)) {
    return zome.zome_functions[fnName].call(context)(element);
  } else {
    return true;
  }
}
