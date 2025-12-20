---
apply: always
instructions: use this rule when generating the code
---

- Write tsdoc on generated code
- When documenting types, make sure you document the type itself and its members, see example below
- Prefer ts docs instead of js doc
- Provide example usage for complex functions or component otherwise don't provide

```ts
/** useScheduler return type */
type UseSchedulerReturn = {
    /** Function to start the scheduler */
    start: VoidFunction;
    /** Function to stop the scheduler */
    stop: VoidFunction;
};

```