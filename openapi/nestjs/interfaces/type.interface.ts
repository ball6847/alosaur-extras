// deno-lint-ignore-file no-explicit-any
export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}
