import { Cell } from '../../cell';
import { Workflow } from './workflows';
export declare const sys_validation: (cell: Cell) => Promise<void>;
export declare type SysValidationWorkflow = Workflow<void, void>;
export declare const SYS_VALIDATION_WORKFLOW = "System Validation";
export declare function sys_validation_task(cell: Cell): SysValidationWorkflow;
