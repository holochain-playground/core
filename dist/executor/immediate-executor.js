export class ImmediateExecutor {
    async execute(task) {
        const result = await task.task();
        return result;
    }
}
//# sourceMappingURL=immediate-executor.js.map