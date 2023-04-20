import { ValidationError } from './deps.ts';

export function reduceError(errors: ValidationError[]) {
  return errors.reduce((acc: Record<string, string[]>, err: ValidationError) => {
    // deno-lint-ignore no-explicit-any
    acc[err.property] = Object.values(err.constraints as any);
    return acc;
  }, {});
}
