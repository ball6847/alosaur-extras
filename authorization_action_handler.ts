import { Singleton } from './deps.ts';
import { Forbidden, Unauthorized } from './response.ts';
import { SchemePayload, SecurityContext } from './security/mod.ts';

@Singleton()
export class AuthorizationActionHandler {
  getUnauthorizedActionResult(
    _context: SecurityContext<unknown>,
    _schemePayload: SchemePayload,
  ) {
    return Promise.resolve(Unauthorized());
  }

  getForbiddenActionResult(
    _context: SecurityContext<unknown>,
    _schemePayload: SchemePayload,
  ) {
    return Promise.resolve(
      Forbidden(
        'INSUFFICIENT_PERMISSION',
        'Access denied due to insufficient permissions',
      ),
    );
  }
}
