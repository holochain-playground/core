import { Cell, Workflow } from '../../cell';
import { CellState, IntegratedDhtOpsValue, ValidationStatus } from '../state';
import { getIntegratedDhtOpsWithoutReceipt } from '../dht/get';
import { putDhtOpToIntegrated, putValidationReceipt } from '../dht/put';
import { WorkflowReturn, WorkflowType, Workspace } from './workflows';
import { now, ValidationReceipt } from '@holochain-open-dev/core-types';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/integrate_dht_ops_workflow.rs
export const validation_receipt = async (
  workspace: Workspace
): Promise<WorkflowReturn<void>> => {
  const integratedOpsWithoutReceipt = getIntegratedDhtOpsWithoutReceipt(
    workspace.state
  );
  const pretendIsValid =
    workspace.badAgentConfig &&
    workspace.badAgentConfig.pretend_invalid_elements_are_valid;

  for (const [dhtOpHash, integratedValue] of Object.entries(
    integratedOpsWithoutReceipt
  )) {
    const receipt: ValidationReceipt = {
      dht_op_hash: dhtOpHash,
      validation_status: pretendIsValid
        ? ValidationStatus.Valid
        : integratedValue.validation_status,
      validator: workspace.state.agentPubKey,
      when_integrated: now(),
    };

    putValidationReceipt(dhtOpHash, receipt)(workspace.state);

    integratedValue.send_receipt = false;

    putDhtOpToIntegrated(dhtOpHash, integratedValue);
  }

  return {
    result: undefined,
    triggers: [],
  };
};

export type ValidationReceiptWorkflow = Workflow<void, void>;

export function validation_receipt_task(): ValidationReceiptWorkflow {
  return {
    type: WorkflowType.VALIDATION_RECEIPT,
    details: undefined,
    task: worskpace => validation_receipt(worskpace),
  };
}