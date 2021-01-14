import { deserializeHash } from '@holochain-open-dev/common';
import { ValidationLimboStatus, ValidationStatus, } from '../state';
import { getValidationLimboDhtOps } from '../dht/get';
import { deleteValidationLimboValue, putIntegrationLimboValue, } from '../dht/put';
import { integrate_dht_ops_task } from './integrate_dht_ops';
// From https://github.com/holochain/holochain/blob/develop/crates/holochain/src/core/workflow/app_validation_workflow.rs
export const app_validation = async (cell) => {
    const pendingDhtOps = getValidationLimboDhtOps(cell.state, ValidationLimboStatus.SysValidated);
    // TODO: actually validate
    for (const dhtOpHashStr of Object.keys(pendingDhtOps)) {
        const dhtOpHash = deserializeHash(dhtOpHashStr);
        deleteValidationLimboValue(dhtOpHash)(cell.state);
        const validationLimboValue = pendingDhtOps[dhtOpHashStr];
        const value = {
            op: validationLimboValue.op,
            validation_status: ValidationStatus.Valid,
        };
        putIntegrationLimboValue(dhtOpHash, value)(cell.state);
    }
    cell.triggerWorkflow(integrate_dht_ops_task(cell));
};
export function app_validation_task(cell) {
    return {
        name: 'App Validation of the DHT Op',
        description: 'Running of the zome appropriate zome hook',
        task: () => app_validation(cell),
    };
}
//# sourceMappingURL=app_validation.js.map