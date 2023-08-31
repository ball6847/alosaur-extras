// deno-lint-ignore-file no-explicit-any ban-types

import {
  AuthenticationScheme,
  AuthPolicy,
  BusinessType,
  container,
  Content,
  getMetadataArgsStorage,
  HookTarget,
  Identity,
  SecurityContext,
  Singleton,
} from '../deps.ts';

// Our implementation on Authorize decorator and AuthorizeHook, as we need to handle authentication and authorization differently
// see https://deno.land/x/alosaur@v0.38.0/src/security/authorization/mod.ts for original implementation

// TODO: would be good to contribute this to Alosaur as alosaue only return 401 for both authentication and authorization

export function Authorize(
  scheme: AuthenticationScheme,
  payload?: AuthPayload,
): Function {
  return function (object: any, methodName?: string) {
    // add hook to global metadata
    getMetadataArgsStorage().hooks.push({
      type: methodName ? BusinessType.Action : BusinessType.Controller,
      object,
      target: object.constructor,
      method: methodName ? methodName : '',
      instance: container.resolve(AuthorizeHook),
      payload: { scheme, payload },
    });
  };
}

export type AuthValidate = (context: SecurityContext) => boolean | Promise<boolean>;

export type AuthPayload = {
  /**
   * List of permission to validate against jwt.roles, if jwt.roles doesn't contain any of the permission, it will be rejected and return 403
   *
   * If you need different permission source other than jwt.roles, use policy instead
   */
  roles?: string[];

  /**
   * Policy to validate against jwt, if it doesn't pass the policy, it will be rejected and return 403
   */
  policy?: AuthPolicy;

  /**
   * Custom validation function, if you have extra requirements to invalidate jwt by inspecting its content, if it doesn't pass the validation, it will be rejected and return 401
   */
  validate?: AuthValidate;
};

export type SchemePayload = {
  scheme: AuthenticationScheme;
  payload?: AuthPayload;
};

@Singleton()
export class AuthorizeHookActionHandler {
  getUnauthorizedActionResult(
    _context: SecurityContext<unknown>,
    _schemePayload: SchemePayload,
  ) {
    return Promise.resolve(Content({ status: 401 }, 401));
  }

  getForbiddenActionResult(
    _context: SecurityContext<unknown>,
    _schemePayload: SchemePayload,
  ) {
    return Promise.resolve(Content({ status: 403 }, 403));
  }
}

@Singleton()
export class AuthorizeHook implements HookTarget<unknown, SchemePayload> {
  private _actionHandler!: AuthorizeHookActionHandler;

  get actionHandler() {
    if (this._actionHandler) {
      return this._actionHandler;
    }
    this._actionHandler = container.resolve(AuthorizeHookActionHandler);
    return this._actionHandler;
  }

  async onPreAction(
    context: SecurityContext<unknown>,
    schemePayload: SchemePayload,
  ) {
    const { roles, policy, validate } = schemePayload.payload || {};
    const identity = context.security.auth.identity();

    if (!identity) {
      context.response.result = await this.actionHandler.getUnauthorizedActionResult(context, schemePayload);
      context.response.setImmediately();
      return;
    }

    // our custom validation
    if (validate && !(await Promise.resolve(validate(context)))) {
      context.response.result = await this.actionHandler.getUnauthorizedActionResult(context, schemePayload);
      context.response.setImmediately();
      return;
    }

    // authorization required but doesn't meet roles requirements
    if (roles && !isRolesContains(identity, roles)) {
      context.response.result = await this.actionHandler.getForbiddenActionResult(context, schemePayload);
      context.response.setImmediately();
      return;
    }

    // authorization required but doesn't meet policy requirements
    if (policy && !(await Promise.resolve(policy(context)))) {
      context.response.result = await this.actionHandler.getForbiddenActionResult(context, schemePayload);
      context.response.setImmediately();
      return;
    }

    // authenticated and authorized or no authorization required
    return true;
  }
}

function isRolesContains(identity: Identity<unknown>, roles: string[]) {
  return !!identity?.roles?.find((role) => roles.find((crole) => crole === role));
}
