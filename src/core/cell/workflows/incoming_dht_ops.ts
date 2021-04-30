import {
  Hash,
  Dictionary,
  DHTOp,
  AgentPubKey,
  ValidationReceipt,
} from '@holochain-open-dev/core-types';
import { Cell, Workflow } from '../../cell';
import {
  ValidationLimboValue,
  ValidationLimboStatus,
  CellState,
} from '../state';
import { putValidationLimboValue, putValidationReceipt } from '../dht/put';
import { sys_validation_task } from './sys_validation';
import { WorkflowReturn, WorkflowType, Workspace } from './workflows';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/incoming_dht_ops_workflow.rs
export const incoming_dht_ops = (
  basis: Hash,
  dhtOps: Dictionary<DHTOp>,
  from_agent: AgentPubKey | undefined,
  validation_receipts: ValidationReceipt[]
) => async (worskpace: Workspace): Promise<WorkflowReturn<void>> => {
  let sysValidate = false;

  for (const dhtOpHash of Object.keys(dhtOps)) {
    if (
      !worskpace.state.integratedDHTOps[dhtOpHash] &&
      !worskpace.state.integrationLimbo[dhtOpHash] &&
      !worskpace.state.validationLimbo[dhtOpHash]
    ) {
      const dhtOp = dhtOps[dhtOpHash];

      const validationLimboValue: ValidationLimboValue = {
        basis,
        from_agent,
        last_try: undefined,
        num_tries: 0,
        op: dhtOp,
        status: ValidationLimboStatus.Pending,
        time_added: Date.now(),
      };

      putValidationLimboValue(dhtOpHash, validationLimboValue)(worskpace.state);

      sysValidate = true;
    }
  }
  // TODO: change this when alarm is implemented
  for (const receipt of validation_receipts) {
    putValidationReceipt(receipt.dht_op_hash, receipt)(worskpace.state);
  }

  return {
    result: undefined,
    triggers: sysValidate ? [sys_validation_task()] : [],
  };
};

export type IncomingDhtOpsWorkflow = Workflow<
  { from_agent: AgentPubKey; dht_hash: Hash; ops: Dictionary<DHTOp> },
  void
>;

export function incoming_dht_ops_task(
  from_agent: AgentPubKey,
  dht_hash: Hash, // The basis for the DHTOps
  ops: Dictionary<DHTOp>,
  validation_receipts: ValidationReceipt[]
): IncomingDhtOpsWorkflow {
  return {
    type: WorkflowType.INCOMING_DHT_OPS,
    details: {
      from_agent,
      dht_hash,
      ops,
    },
    task: worskpace =>
      incoming_dht_ops(
        dht_hash,
        ops,
        from_agent,
        validation_receipts
      )(worskpace),
  };
}
