import { ApiSecurity } from './api-security.decorator.ts';

export function ApiBearerAuth(name = 'bearer') {
  return ApiSecurity(name);
}
