// deno-lint-ignore-file no-explicit-any
import { clone } from 'https://esm.sh/v115/midash@0.8.2';
import { DECORATORS } from '../constants.ts';
import { createMixedDecorator } from './helpers.ts';

export function ApiExtension(extensionKey: string, extensionProperties: any) {
  if (!extensionKey.startsWith('x-')) {
    throw new Error(
      'Extension key is not prefixed. Please ensure you prefix it with `x-`.',
    );
  }

  const extensionObject = {
    [extensionKey]: clone(extensionProperties),
  };

  return createMixedDecorator(DECORATORS.API_EXTENSION, extensionObject);
}
