import { Dictionary, DHTOp, AgentPubKey } from '@holochain-open-dev/core-types';
import { Workflow } from '../../cell';
import { ValidationLimboValue, ValidationLimboStatus } from '../state';
import { putValidationLimboValue } from '../dht/put';
import { sys_validation_task } from './sys_validation';
import { WorkflowReturn, WorkflowType, Workspace } from './workflows';
import { getDHTOpBasis } from '../utils';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/incoming_dht_ops_workflow.rs
export const incoming_dht_ops = (
  dhtOps: Dictionary<DHTOp>,
  from_agent: AgentPubKey | undefined
) => async (workspace: Workspace): Promise<WorkflowReturn<void>> => {
  let sysValidate = false;

  for (const dhtOpHash of Object.keys(dhtOps)) {
    if (
      !workspace.state.integratedDHTOps[dhtOpHash] &&
      !workspace.state.integrationLimbo[dhtOpHash] &&
      !workspace.state.validationLimbo[dhtOpHash]
    ) {
      const dhtOp = dhtOps[dhtOpHash];

      const basis = getDHTOpBasis(dhtOp);

      const validationLimboValue: ValidationLimboValue = {
        basis,
        from_agent,
        last_try: undefined,
        num_tries: 0,
        op: dhtOp,
        status: ValidationLimboStatus.Pending,
        time_added: Date.now(),
      };

      putValidationLimboValue(dhtOpHash, validationLimboValue)(workspace.state);

      sysValidate = true;
    }
  }

  return {
    result: undefined,
    triggers: sysValidate ? [sys_validation_task()] : [],
  };
};

export type IncomingDhtOpsWorkflow = Workflow<
  { from_agent: AgentPubKey; ops: Dictionary<DHTOp> },
  void
>;

export function incoming_dht_ops_task(
  from_agent: AgentPubKey,
  ops: Dictionary<DHTOp>
): IncomingDhtOpsWorkflow {
  return {
    type: WorkflowType.INCOMING_DHT_OPS,
    details: {
      from_agent,
      ops,
    },
    task: worskpace => incoming_dht_ops(ops, from_agent)(worskpace),
  };
}
