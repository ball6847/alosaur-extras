// deno-lint-ignore-file no-explicit-any
import InjectionToken from 'https://deno.land/x/alosaur@v0.38.0/src/injection/providers/injection-token.ts';
import { defineInjectionTokenMetadata } from 'https://deno.land/x/alosaur@v0.38.0/src/injection/reflection-helpers.ts';

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
