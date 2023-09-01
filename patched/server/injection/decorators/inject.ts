// deno-lint-ignore-file no-explicit-any
import { defineInjectionTokenMetadata, InjectionToken } from '../../../../deps.ts';

/**
 * Parameter decorator factory that allows for interface information to be stored in the constructor's metadata
 *
 * @return {Function} The parameter decorator
 */
function inject(
  token: InjectionToken<any>,
): (target: any, propertyKey: any, parameterIndex: number) => any {
  return defineInjectionTokenMetadata(token);
}

export default inject;
