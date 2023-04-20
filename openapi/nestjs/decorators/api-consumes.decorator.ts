import { DECORATORS } from '../constants.ts';
import { createMixedDecorator } from './helpers.ts';

export function ApiConsumes(...mimeTypes: string[]) {
  return createMixedDecorator(DECORATORS.API_CONSUMES, mimeTypes);
}
