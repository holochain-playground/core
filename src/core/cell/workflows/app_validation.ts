import { Cascade, Cell, Workflow } from '../../cell';
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
  EntryDef,
  SimulatedDna,
  SimulatedZome,
} from '../../../dnas/simulated-dna';
import {
  AppEntryType,
  CreateLink,
  DeleteLink,
  Element,
  Entry,
  HeaderType,
  NewEntryHeader,
} from '@holochain-open-dev/core-types';
import { ValidationOutcome } from '../sys_validate/types';
import { GetStrategy } from '../../../types';
import { DepsMissing } from './sys_validation';
import { HostFnWorkspace } from '../../hdk/host-fn';
import {
  buildValidationFunctionContext,
  buildZomeFunctionContext,
} from '../../hdk/context';

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
    deleteValidationLimboValue(dhtOpHash)(worskpace.state);

    const validationLimboValue = pendingDhtOps[dhtOpHash];

    const value: IntegrationLimboValue = {
      op: validationLimboValue.op,
      validation_status: ValidationStatus.Valid,
    };

    putIntegrationLimboValue(dhtOpHash, value)(worskpace.state);
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

export async function run_validation_callback_direct(
  zome: SimulatedZome,
  dna: SimulatedDna,
  element: Element,
  workspace: Workspace
): Promise<ValidationOutcome> {
  const maybeEntryDef = await get_associated_entry_def(element, dna, workspace);

  if ((maybeEntryDef as DepsMissing).depsHashes)
    return {
      resolved: false,
      depsHashes: (maybeEntryDef as DepsMissing).depsHashes,
    };

  const entryDef = maybeEntryDef as EntryDef;

  // TODO: implement validation package

  return run_validation_callback_inner([zome], element, entryDef, workspace);
}

async function get_associated_entry_def(
  element: Element,
  dna: SimulatedDna,
  workspace: Workspace
): Promise<DepsMissing | EntryDef | undefined> {
  const cascade = new Cascade(workspace.state, workspace.p2p);
  const maybeAppEntryType = await get_app_entry_type(element, cascade);

  if (!maybeAppEntryType) return undefined;
  if ((maybeAppEntryType as DepsMissing).depsHashes)
    return maybeAppEntryType as DepsMissing;

  const appEntryType = maybeAppEntryType as AppEntryType;
  return dna.zomes[appEntryType.zome_id].entry_defs[appEntryType.id];
}

async function get_app_entry_type(
  element: Element,
  cascade: Cascade
): Promise<DepsMissing | AppEntryType | undefined> {
  if (element.signed_header.header.content.type === HeaderType.Delete)
    return get_app_entry_type_from_dep(element, cascade);

  const entryType = (element.signed_header.header.content as NewEntryHeader)
    .entry_type;
  if (!entryType) return undefined;
  if (
    entryType === 'CapGrant' ||
    entryType === 'CapClaim' ||
    entryType === 'Agent'
  )
    return undefined;
  return entryType.App;
}

async function get_app_entry_type_from_dep(
  element: Element,
  cascade: Cascade
): Promise<DepsMissing | AppEntryType | undefined> {
  if (element.signed_header.header.content.type !== HeaderType.Delete)
    return undefined;

  const deletedHeaderHash =
    element.signed_header.header.content.deletes_address;
  const header = await cascade.retrieve_header(deletedHeaderHash, {
    strategy: GetStrategy.Contents,
  });

  if (!header) return { depsHashes: [deletedHeaderHash] };

  const entryType = (header.header.content as NewEntryHeader).entry_type;
  if (
    !entryType ||
    entryType === 'Agent' ||
    entryType === 'CapClaim' ||
    entryType === 'CapGrant'
  )
    return undefined;
  return entryType.App;
}

async function run_validation_callback_inner(
  zomes_to_invoke: Array<SimulatedZome>,
  element: Element,
  entry_def: EntryDef | undefined,
  workspace: Workspace
): Promise<ValidationOutcome> {
  const fnsToCall = get_element_validate_functions_to_invoke(
    element,
    entry_def
  );

  const hostFnWorkspace: HostFnWorkspace = {
    cascade: new Cascade(workspace.state, workspace.p2p),
    state: workspace.state,
    dna: workspace.dna,
    p2p: workspace.p2p,
  };
  const context = buildValidationFunctionContext(hostFnWorkspace);

  for (const zome of zomes_to_invoke) {
    for (const validateFn of fnsToCall) {
      if (zome.zome_functions[validateFn]) {
        const outcome: ValidationOutcome = await zome.zome_functions[
          validateFn
        ].call(context)(element);
        if (!outcome.resolved) return outcome;
        else if (!outcome.valid) return outcome;
      }
    }
  }

  return { resolved: true, valid: true };
}

export async function run_create_link_validation_callback(
  zome: SimulatedZome,
  link_add: CreateLink,
  base: Entry,
  target: Entry,
  workspace: Workspace
): Promise<ValidationOutcome> {
  const validateCreateLink = 'validate_create_link';

  if (zome.zome_functions[validateCreateLink]) {
    const hostFnWorkspace: HostFnWorkspace = {
      cascade: new Cascade(workspace.state, workspace.p2p),
      state: workspace.state,
      dna: workspace.dna,
      p2p: workspace.p2p,
    };
    const context = buildValidationFunctionContext(hostFnWorkspace);

    const outcome: ValidationOutcome = await zome.zome_functions[
      validateCreateLink
    ].call(context)({ link_add, base, target });

    return outcome;
  }

  return {
    resolved: true,
    valid: true,
  };
}

export async function run_delete_link_validation_callback(
  zome: SimulatedZome,
  delete_link: DeleteLink,
  workspace: Workspace
): Promise<ValidationOutcome> {
  const validateCreateLink = 'validate_delete_link';

  if (zome.zome_functions[validateCreateLink]) {
    const hostFnWorkspace: HostFnWorkspace = {
      cascade: new Cascade(workspace.state, workspace.p2p),
      state: workspace.state,
      dna: workspace.dna,
      p2p: workspace.p2p,
    };
    const context = buildValidationFunctionContext(hostFnWorkspace);

    const outcome: ValidationOutcome = await zome.zome_functions[
      validateCreateLink
    ].call(context)({ delete_link });

    return outcome;
  }

  return {
    resolved: true,
    valid: true,
  };
}

function get_element_validate_functions_to_invoke(
  element: Element,
  maybeEntryDef: EntryDef | undefined
): Array<string> {
  const fnsComponents = ['validate'];

  const header = element.signed_header.header.content;

  if (header.type === HeaderType.Create) fnsComponents.push('create');
  if (header.type === HeaderType.Update) fnsComponents.push('update');
  if (header.type === HeaderType.Delete) fnsComponents.push('delete');

  if ((header as NewEntryHeader).entry_type === 'Agent')
    fnsComponents.push('agent');
  if (((header as NewEntryHeader).entry_type as { App: AppEntryType }).App) {
    fnsComponents.push('entry');
    if (maybeEntryDef) fnsComponents.push(maybeEntryDef.id);
  }

  return unpackValidateFnsComponents(fnsComponents);
}

function unpackValidateFnsComponents(
  fnsComponents: Array<string>
): Array<string> {
  const validateFunctions = [fnsComponents[0]];

  for (let i = 1; i < fnsComponents.length; i++) {
    validateFunctions.push(`${validateFunctions[i - 1]}_${fnsComponents[i]}`);
  }
  return validateFunctions;
}
