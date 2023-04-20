import { DECORATORS } from '../constants.ts';
import { createMixedDecorator } from './helpers.ts';

export function ApiProduces(...mimeTypes: string[]) {
  return createMixedDecorator(DECORATORS.API_PRODUCES, mimeTypes);
}
