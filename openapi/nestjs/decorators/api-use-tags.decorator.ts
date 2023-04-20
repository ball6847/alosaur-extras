import { DECORATORS } from '../constants.ts';
import { createMixedDecorator } from './helpers.ts';

export function ApiTags(...tags: string[]) {
  return createMixedDecorator(DECORATORS.API_TAGS, tags);
}
