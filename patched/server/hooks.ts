import { HttpContext, PrimitiveResponse } from 'https://deno.land/x/alosaur@v0.38.0/mod.ts';
import { HookMetadataArgs } from 'https://deno.land/x/alosaur@v0.38.0/src/metadata/hook.ts';
import { Context } from 'https://deno.land/x/alosaur@v0.38.0/src/models/context.ts';
import { HookMethod } from 'https://deno.land/x/alosaur@v0.38.0/src/models/hook.ts';
import { hasHooks, runHooks } from 'https://deno.land/x/alosaur@v0.38.0/src/utils/hook.utils.ts';

/**
 * Run hooks function and return true if response is immediately
 */
export async function resolveHooks<TState, TPayload>(
  context: Context<TState>,
  actionName: HookMethod,
  respondWith: (r: Response | Promise<Response>) => Promise<void>,
  hooks?: HookMetadataArgs<TState, TPayload>[],
): Promise<boolean> {
  const resolvedHooks = new Set<HookMetadataArgs<TState, TPayload>>();

  if (hasHooks(hooks)) {
    // @ts-ignore: Object is possibly 'undefined'.
    for (const hook of hooks) {
      const action: Function | undefined = (hook as any).instance[actionName];

      if (action !== undefined) {
        await (hook as any).instance[actionName](context, hook.payload);

        if (context.response.isImmediately()) {
          let reverseActionName: HookMethod = actionName === 'onCatchAction' ? 'onCatchAction' : 'onPostAction';

          // run reverse resolved hooks
          await runHooks(
            context,
            reverseActionName,
            Array.from(resolvedHooks).reverse(),
          );

          if (context instanceof HttpContext) {
            // const respondWith = (context.request.serverRequest as any).respondWith;
            respondWith(getResponse(context.response.getMergedResult()));
          }
          return true;
        }
      }
      resolvedHooks.add(hook);
    }
  }

  return false;
}

function getResponse(result: Response | PrimitiveResponse): Response {
  if (result instanceof Response) {
    return result;
  }

  return new Response(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
