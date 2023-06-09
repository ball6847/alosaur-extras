// deno-lint-ignore-file no-explicit-any no-unused-vars
import { Algorithm } from 'https://deno.land/x/djwt@v2.3/algorithm.ts';
import { create, getNumericDate, verify } from 'https://deno.land/x/djwt@v2.3/mod.ts';
import { AuthenticationScheme, Content, Identity, SecurityContext } from '../deps.ts';

/**
 * Modify alosaur jwt-bearer.scheme.ts
 *
 * TODO: remove if not needed
 *
 * original: https://github.com/alosaur/alosaur/blob/master/src/security/authentication/jwt-bearer/src/jwt-bearer.scheme.ts
 *
 * changes:
 * - add AcceptTypeAny, as swagger-ui doesn't send `accept: application/json` on multipart/form-data tyoe
 */

const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

const AuthorizationHeader = 'Authorization';
const AcceptHeader = 'Accept';

export class JwtBearerScheme implements AuthenticationScheme {
  constructor(
    private readonly algorithm: Algorithm,
    private readonly key: CryptoKey,
    private readonly expires: number = DAYS_30,
  ) {
  }

  async authenticate(context: SecurityContext): Promise<void> {
    const headers = context.request.serverRequest.request.headers;

    const headAuthorization = headers.get(AuthorizationHeader);
    const headAccept = headers.get(AcceptHeader) || '';

    if (isJsonAcceptHeader(headAccept) && headAuthorization) {
      const token = getBearerToken(headAuthorization);

      try {
        if (token) {
          const payload = await safeVerifyJWT(token, this.key);

          if (payload) {
            context.security.auth.identity = () => payload;
          }
        }
      } catch (error) {
        // console.log(error);
        // decode or verify error
      }
    }

    return undefined;
  }

  async signInAsync<I, R>(
    context: SecurityContext,
    identity: Identity<I>,
  ): Promise<R> {
    const jwt = await create(
      { alg: this.algorithm, typ: 'JWT' },
      { exp: getNumericDate(this.expires), ...identity },
      this.key,
    );
    context.security.auth.identity = () => identity as any;
    return { access_token: jwt } as any;
  }

  signOutAsync<T, R>(context: SecurityContext): Promise<R> {
    // TODO(irustm) implement block lists of access tokens
    throw new Error('Not implemented');
  }

  onFailureResult(context: SecurityContext): void {
    context.response.result = Content({ status: 401 }, 401);
    context.response.setImmediately();
  }

  onSuccessResult(context: SecurityContext): void {
    // nothing
  }
}

function getBearerToken(authHeader: string): string | undefined {
  const head = authHeader.substr(0, 7);
  const token = authHeader.slice(7);

  if (head === 'Bearer ') {
    return token;
  }

  return undefined;
}

async function safeVerifyJWT(
  jwt: string,
  key: CryptoKey,
): Promise<any> {
  // if (
  //   !(await verifySignature({
  //     signature,
  //     key,
  //     algorithm: header.alg,
  //     signingInput: jwt.slice(0, jwt.lastIndexOf(".")),
  //   }))
  // ) {
  //   return undefined;
  // }
  //
  // const [ header, payload, signature ] = decode(jwt);

  return await verify(jwt, key);
}

function isJsonAcceptHeader(acceptHeader: string): boolean {
  const acceptedTypes = acceptHeader.split(',');
  for (const acceptType of acceptedTypes) {
    const type = acceptType.trim();
    if (type === 'application/json' || type === '*/*') {
      return true;
    }
  }
  return false;
}
