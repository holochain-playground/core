import { Cascade, Cell, Workflow } from '../../cell';
import {
  ValidationLimboStatus,
  IntegrationLimboValue,
  ValidationStatus,
  CellState,
  ValidationLimboValue,
} from '../state';
import { getValidationLimboDhtOps } from '../dht/get';
import {
  deleteValidationLimboValue,
  putIntegrationLimboValue,
  putValidationLimboValue,
} from '../dht/put';
import { integrate_dht_ops_task } from './integrate_dht_ops';
import { WorkflowReturn, WorkflowType, Workspace } from './workflows';
import {
  EntryDef,
  SimulatedDna,
  SimulatedZome,
} from '../../../dnas/simulated-dna';
import {
  AgentPubKey,
  AppEntryType,
  CreateLink,
  DeleteLink,
  DHTOp,
  Element,
  Entry,
  getEntry,
  HeaderType,
  NewEntryHeader,
} from '@holochain-open-dev/core-types';
import { ValidationOutcome } from '../sys_validate/types';
import { GetStrategy } from '../../../types';
import { DepsMissing } from './sys_validation';
import { HostFnWorkspace } from '../../hdk/host-fn';
import { buildValidationFunctionContext } from '../../hdk/context';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/app_validation_workflow.rs
export const app_validation = async (
  worskpace: Workspace
): Promise<WorkflowReturn<void>> => {
  const pendingDhtOps = getValidationLimboDhtOps(worskpace.state, [
    ValidationLimboStatus.SysValidated,
    ValidationLimboStatus.AwaitingAppDeps,
  ]);

  for (const dhtOpHash of Object.keys(pendingDhtOps)) {
    deleteValidationLimboValue(dhtOpHash)(worskpace.state);

    const validationLimboValue = pendingDhtOps[dhtOpHash];

    const outcome = await validate_op(
      validationLimboValue.op,
      validationLimboValue.from_agent,
      worskpace
    );
    if (!outcome.resolved) {
      validationLimboValue.status = ValidationLimboStatus.AwaitingAppDeps;
      putValidationLimboValue(dhtOpHash, validationLimboValue);
    } else {
      const value: IntegrationLimboValue = {
        op: validationLimboValue.op,
        validation_status: outcome.valid
          ? ValidationStatus.Valid
          : ValidationStatus.Rejected,
      };
      putIntegrationLimboValue(dhtOpHash, value)(worskpace.state);

      if (value.validation_status === ValidationStatus.Rejected) {
        // Sound the alarm!
        await worskpace.p2p.gossip_bad_agent(value.op);
      }
    }
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

async function validate_op(
  op: DHTOp,
  from_agent: AgentPubKey | undefined,
  workspace: Workspace
): Promise<ValidationOutcome> {
  const element = dht_ops_to_element(op);

  const entry_type = (element.signed_header.header.content as NewEntryHeader)
    .entry_type;
  if (entry_type === 'CapClaim' || entry_type === 'CapGrant')
    return {
      valid: true,
      resolved: true,
    };

  // TODO: implement validation package

  const maybeEntryDef = await get_associated_entry_def(
    element,
    workspace.dna,
    workspace
  );
  if (maybeEntryDef && (maybeEntryDef as DepsMissing).depsHashes)
    return {
      resolved: false,
      depsHashes: (maybeEntryDef as DepsMissing).depsHashes,
    };

  const zomes_to_invoke = await get_zomes_to_invoke(element, workspace);

  if (zomes_to_invoke && (zomes_to_invoke as DepsMissing).depsHashes)
    return {
      resolved: false,
      depsHashes: (zomes_to_invoke as DepsMissing).depsHashes,
    };

  const zomes = zomes_to_invoke as Array<SimulatedZome>;

  const header = element.signed_header.header.content;
  if (header.type === HeaderType.DeleteLink) {
    return run_delete_link_validation_callback(zomes[0], header, workspace);
  } else if (header.type === HeaderType.CreateLink) {
    const cascade = new Cascade(workspace.state, workspace.p2p);

    const maybeBaseEntry = await cascade.retrieve_entry(header.base_address, {
      strategy: GetStrategy.Contents,
    });
    if (!maybeBaseEntry)
      return {
        resolved: false,
        depsHashes: [header.base_address],
      };

    const maybeTargetEntry = await cascade.retrieve_entry(
      header.target_address,
      { strategy: GetStrategy.Contents }
    );
    if (!maybeTargetEntry)
      return {
        resolved: false,
        depsHashes: [header.target_address],
      };

    return run_create_link_validation_callback(
      zomes[0],
      header,
      maybeBaseEntry,
      maybeTargetEntry,
      workspace
    );
  } else {
    return run_validation_callback_inner(
      zomes,
      element,
      maybeEntryDef as EntryDef,
      workspace
    );
  }
}

function dht_ops_to_element(op: DHTOp): Element {
  const header = op.header;
  let entry = undefined;
  if ((header.header.content as NewEntryHeader).entry_hash) {
    entry = getEntry(op);
  }

  return {
    entry,
    signed_header: header,
  };
}

export async function run_validation_callback_direct(
  zome: SimulatedZome,
  dna: SimulatedDna,
  element: Element,
  workspace: Workspace
): Promise<ValidationOutcome> {
  const maybeEntryDef = await get_associated_entry_def(element, dna, workspace);

  if (maybeEntryDef && (maybeEntryDef as DepsMissing).depsHashes)
    return {
      resolved: false,
      depsHashes: (maybeEntryDef as DepsMissing).depsHashes,
    };

  // TODO: implement validation package

  return run_validation_callback_inner(
    [zome],
    element,
    maybeEntryDef as EntryDef | undefined,
    workspace
  );
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

async function get_zomes_to_invoke(
  element: Element,
  workspace: Workspace
): Promise<DepsMissing | Array<SimulatedZome>> {
  const cascade = new Cascade(workspace.state, workspace.p2p);
  const maybeAppEntryType = await get_app_entry_type(element, cascade);

  if (maybeAppEntryType && (maybeAppEntryType as DepsMissing).depsHashes)
    return maybeAppEntryType as DepsMissing;

  if (maybeAppEntryType) {
    // It's a newEntryHeader
    return [workspace.dna.zomes[(maybeAppEntryType as AppEntryType).zome_id]];
  } else {
    const header = element.signed_header.header.content;
    if (header.type === HeaderType.CreateLink) {
      return [workspace.dna.zomes[header.zome_id]];
    } else if (header.type === HeaderType.DeleteLink) {
      const maybeHeader = await cascade.retrieve_header(
        header.link_add_address,
        { strategy: GetStrategy.Contents }
      );

      if (!maybeHeader)
        return {
          depsHashes: [header.link_add_address],
        };

      return [
        workspace.dna.zomes[(maybeHeader.header.content as CreateLink).zome_id],
      ];
    }

    return workspace.dna.zomes;
  }
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

  for (const zome of zomes_to_invoke) {
    for (const validateFn of fnsToCall) {
      if (zome.validation_functions[validateFn]) {
        const context = buildValidationFunctionContext(
          hostFnWorkspace,
          workspace.dna.zomes.findIndex(z => z === zome)
        );

        const outcome: ValidationOutcome = await zome.validation_functions[
          validateFn
        ](context)(element);
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

  if (zome.validation_functions[validateCreateLink]) {
    const hostFnWorkspace: HostFnWorkspace = {
      cascade: new Cascade(workspace.state, workspace.p2p),
      state: workspace.state,
      dna: workspace.dna,
      p2p: workspace.p2p,
    };
    const context = buildValidationFunctionContext(
      hostFnWorkspace,
      workspace.dna.zomes.findIndex(z => z === zome)
    );

    const outcome: ValidationOutcome = await zome.validation_functions[
      validateCreateLink
    ](context)({ link_add, base, target });

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

  if (zome.validation_functions[validateCreateLink]) {
    const hostFnWorkspace: HostFnWorkspace = {
      cascade: new Cascade(workspace.state, workspace.p2p),
      state: workspace.state,
      dna: workspace.dna,
      p2p: workspace.p2p,
    };
    const context = buildValidationFunctionContext(
      hostFnWorkspace,
      workspace.dna.zomes.findIndex(z => z === zome)
    );

    const outcome: ValidationOutcome = await zome.validation_functions[
      validateCreateLink
    ](context)({ delete_link });

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

  const entry_type = (header as NewEntryHeader).entry_type;
  if (entry_type) {
    if (entry_type === 'Agent') fnsComponents.push('agent');
    if ((entry_type as { App: AppEntryType }).App) {
      fnsComponents.push('entry');
      if (maybeEntryDef) fnsComponents.push(maybeEntryDef.id);
    }
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
