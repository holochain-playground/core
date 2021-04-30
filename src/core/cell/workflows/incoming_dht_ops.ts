import {
  Hash,
  Dictionary,
  DHTOp,
  AgentPubKey,
  ValidationReceipt,
  ValidationStatus,
} from '@holochain-open-dev/core-types';
import { Cell, Workflow } from '../../cell';
import {
  ValidationLimboValue,
  ValidationLimboStatus,
  CellState,
} from '../state';
import {
  getValidationReceipts,
  putValidationLimboValue,
  putValidationReceipt,
} from '../dht/put';
import { sys_validation_task } from './sys_validation';
import { WorkflowReturn, WorkflowType, Workspace } from './workflows';
import { isEqual } from 'lodash-es';

// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/incoming_dht_ops_workflow.rs
export const incoming_dht_ops = (
  basis: Hash,
  dhtOps: Dictionary<DHTOp>,
  from_agent: AgentPubKey | undefined,
  validation_receipts: ValidationReceipt[]
) => async (workspace: Workspace): Promise<WorkflowReturn<void>> => {
  let sysValidate = false;

  for (const dhtOpHash of Object.keys(dhtOps)) {
    if (
      !workspace.state.integratedDHTOps[dhtOpHash] &&
      !workspace.state.integrationLimbo[dhtOpHash] &&
      !workspace.state.validationLimbo[dhtOpHash]
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

      putValidationLimboValue(dhtOpHash, validationLimboValue)(workspace.state);

      sysValidate = true;
    }

    const existingReceipts = getValidationReceipts(dhtOpHash)(workspace.state);
    const myReceipt = existingReceipts.find(
      r => r.validator === workspace.state.agentPubKey
    );

    // If we are receiving a publish for an invalid dht op, regossip again
    // TODO: fix this when gossip loop is implemented
    if (
      myReceipt &&
      myReceipt.validation_status === ValidationStatus.Rejected
    ) {
      const receiptsArrayToDict = (r: ValidationReceipt[]) =>
        r.reduce((acc, next) => ({ ...acc, [next.validator]: next }), {});

      const existingReceiptsDict = receiptsArrayToDict(existingReceipts);
      const receivedReceipts: Dictionary<ValidationReceipt> = receiptsArrayToDict(
        validation_receipts.filter(r => r.dht_op_hash === dhtOpHash)
      );

      if (
        !isEqual(
          new Set(Object.keys(existingReceiptsDict)),
          new Set(Object.keys(receivedReceipts))
        )
      ) {
        // TODO: change this when alarm is implemented
        for (const receipt of Object.values(receivedReceipts)) {
          putValidationReceipt(receipt.dht_op_hash, receipt)(workspace.state);
        }
        const allReceipts = { ...existingReceiptsDict, ...receivedReceipts };
        await workspace.p2p.gossip_bad_agents(
          dhtOps[dhtOpHash],
          myReceipt,
          Object.values(allReceipts)
        );
      }
    }
  }

  // TODO: change this when alarm is implemented
  for (const receipt of validation_receipts) {
    putValidationReceipt(receipt.dht_op_hash, receipt)(workspace.state);
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
