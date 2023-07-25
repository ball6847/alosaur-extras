import { HttpError } from 'https://deno.land/x/alosaur@v0.38.0/src/http-error/HttpError.ts';
import { MetadataArgsStorage } from 'https://deno.land/x/alosaur@v0.38.0/src/metadata/metadata.ts';
import { MiddlewareMetadataArgs } from 'https://deno.land/x/alosaur@v0.38.0/src/metadata/middleware.ts';
import { App } from 'https://deno.land/x/alosaur@v0.38.0/src/mod.ts';
import { HttpContext } from 'https://deno.land/x/alosaur@v0.38.0/src/models/http-context.ts';
import { PrimitiveResponse } from 'https://deno.land/x/alosaur@v0.38.0/src/models/response.ts';
import { SERVER_REQUEST } from 'https://deno.land/x/alosaur@v0.38.0/src/models/tokens.model.ts';
import { Content } from 'https://deno.land/x/alosaur@v0.38.0/src/renderer/content.ts';
import { notFoundAction } from 'https://deno.land/x/alosaur@v0.38.0/src/renderer/not-found.ts';
import { getActionParams } from 'https://deno.land/x/alosaur@v0.38.0/src/route/get-action-params.ts';
import { getAction } from 'https://deno.land/x/alosaur@v0.38.0/src/route/get-action.ts';
import { getHooksFromAction } from 'https://deno.land/x/alosaur@v0.38.0/src/route/get-hooks.ts';
import { getStaticFile } from 'https://deno.land/x/alosaur@v0.38.0/src/utils/get-static-file.ts';
import { hasHooks, hasHooksAction } from 'https://deno.land/x/alosaur@v0.38.0/src/utils/hook.utils.ts';
import { contextStorage } from '../../async_storage.ts';
import { resolveHooks } from './hooks.ts';

// Get middlewares in request
function getMiddlewareByUrl<T>(
  middlewares: MiddlewareMetadataArgs<T>[],
  url: string,
): MiddlewareMetadataArgs<T>[] {
  if (middlewares.length === 0) return []; // for perf optimization
  return middlewares.filter((m) => m.route.test(url));
}

async function runPreRequestMiddlewares(middlewares: MiddlewareMetadataArgs<unknown>[], context: HttpContext) {
  for (const middleware of middlewares) {
    middleware.target.onPreRequest && await middleware.target.onPreRequest(context);
  }
}

async function runPostRequestMiddlewares(middlewares: MiddlewareMetadataArgs<unknown>[], context: HttpContext) {
  for (const middleware of middlewares) {
    // @ts-ignore TODO: fix this, make onPostRequest type available
    middleware.target.onPostRequest && await middleware.target.onPostRequest(context);
  }
}

/**
 * Run all core post request middlewares, regardless of isImmediately flag
 *
 * TODO: revise where this should be run, currently run everywhere respondWith() appear
 * TODO: also implement this in handleLitServer()
 *
 * @param middlewares
 * @param context
 */
async function runCorePostRequestMiddlewares(middlewares: MiddlewareMetadataArgs<unknown>[], context: HttpContext) {
  for (const middleware of middlewares) {
    // @ts-ignore TODO: fix this, make onCorePostRequest type available
    middleware.target.onCorePostRequest && await middleware.target.onCorePostRequest(context);
  }
}

/**
 * Gets deno native http bindings
 * lite server without: static config, catch requests
 */
export async function handleNativeServer<TState>(
  listener: Deno.Listener,
  app: App<TState>,
  metadata: MetadataArgsStorage<TState>,
  runFullServer: boolean,
) {
  if (runFullServer) {
    for await (const conn of listener) {
      handleFullServer(conn, app, metadata);
    }
  } else {
    for await (const conn of listener) {
      handleLiteServer(conn, app);
    }
  }
}

function respondWithWrapper(
  respondWith: (r: Response | Promise<Response>) => Promise<void>,
  conn: Deno.Conn,
): (r: Response | Promise<Response>) => Promise<void> {
  return (res: Response | Promise<Response>) => {
    return respondWith(res).catch(() => {
      // respondWith() fails when the connection has already been closed, or there is some
      // other error with responding on this connection that prompts us to
      // close it and open a new connection.
      try {
        conn.close();
      } catch {
        // Connection has already been closed.
      }
    });
  };
}

async function handleFullServer<TState>(
  conn: Deno.Conn,
  app: App<TState>,
  metadata: MetadataArgsStorage<TState>,
) {
  const requests = Deno.serveHttp(conn);
  for await (const request of requests) {
    const scoped = metadata.container.createChildContainer();
    scoped.register(SERVER_REQUEST, { useValue: request });

    const context = scoped.resolve<HttpContext<TState>>(HttpContext);

    contextStorage.run(context, async () => {
      // we need middleware even in error handler
      const middlewares = getMiddlewareByUrl(
        metadata.middlewares,
        context.request.parserUrl.pathname,
      );

      // TODO: we need to confirm this doesn't hurt performance as we include context and middleware in the handler, especially memory leak
      const respondWith = async (res?: Response | Promise<Response>): Promise<void> => {
        await runCorePostRequestMiddlewares(middlewares, context);
        await respondWithWrapper(request.respondWith, conn)(getResponse(context.response.getMergedResult()));
      };

      try {
        // Resolve every pre middleware
        await runPreRequestMiddlewares(middlewares, context);

        if (context.response.isNotRespond()) {
          return;
        }

        if (context.response.isImmediately()) {
          respondWith(
            getResponse(context.response.getMergedResult()),
          );
          // await runCorePostRequestMiddlewares(middlewares, context);
          return;
        }

        // try getting static file
        if (
          app.staticConfig && await getStaticFile(context, app.staticConfig)
        ) {
          respondWith(
            getResponse(context.response.getMergedResult()),
          );
          // await runCorePostRequestMiddlewares(middlewares, context);
          return;
        }

        const action = getAction(
          app.routes,
          context.request.method,
          context.request.url,
        );

        if (action !== null) {
          const hooks = getHooksFromAction(action);

          // try resolve hooks, resolveHooks returns true if isImmediately is set on hook
          if (
            hasHooks(hooks) && await resolveHooks(context, 'onPreAction', respondWith, hooks)
          ) {
            // await runCorePostRequestMiddlewares(middlewares, context);
            // respondWith(getResponse(context.response.getMergedResult()));
            return;
          }

          try {
            // Get arguments in this action
            const args = await getActionParams(
              context,
              action,
              app.transformConfigMap,
            );

            // Get Action result from controller method
            context.response.result = await action.target[action.action](
              ...args,
            );
          } catch (error) {
            context.response.error = error;

            // try resolve hooks
            if (
              hasHooks(hooks) &&
              hasHooksAction('onCatchAction', hooks) &&
              await resolveHooks(context, 'onCatchAction', respondWith, hooks)
            ) {
              // await runCorePostRequestMiddlewares(middlewares, context);
              return;
            } else {
              // Resolve every post middleware if error was not caught
              await runPostRequestMiddlewares(middlewares, context);

              if (context.response.isImmediately()) {
                respondWith(getResponse(context.response.getMergedResult()));
                // await runCorePostRequestMiddlewares(middlewares, context);
                return;
              }

              throw error;
            }
          }

          // try resolve hooks
          if (
            hasHooks(hooks) &&
            await resolveHooks(context, 'onPostAction', respondWith, hooks)
          ) {
            // await runCorePostRequestMiddlewares(middlewares, context);
            return;
          }
        }

        if (context.response.isImmediately()) {
          respondWith(getResponse(context.response.getMergedResult()));
          // await runCorePostRequestMiddlewares(middlewares, context);
          return;
        }

        // Resolve every post middleware
        await runPostRequestMiddlewares(middlewares, context);

        // post request middlewares can set isImmediately to override default 404 response
        if (context.response.isImmediately()) {
          respondWith(getResponse(context.response.getMergedResult()));
          // await runCorePostRequestMiddlewares(middlewares, context);
          return;
        }

        if (context.response.result === undefined) {
          context.response.result = notFoundAction();

          respondWith(getResponse(context.response.getMergedResult()));
          // await runCorePostRequestMiddlewares(middlewares, context);
          return;
        }

        respondWith(getResponse(context.response.getMergedResult()));
        // await runCorePostRequestMiddlewares(middlewares, context);
      } catch (error) {
        if (app.globalErrorHandler) {
          app.globalErrorHandler(context, error);

          if (context.response.isImmediately()) {
            // await runCorePostRequestMiddlewares(middlewares, context);
            respondWith(getResponse(context.response.getMergedResult()));
            return;
          }
        }

        if (context.response.isImmediately()) {
          respondWith(getResponse(context.response.getMergedResult()));
          // await runCorePostRequestMiddlewares(middlewares, context);
          return;
        }

        if (!(error instanceof HttpError)) {
          console.error(error);
        }

        respondWith(getResponse(Content(error, error.httpCode || 500)));
        // await runCorePostRequestMiddlewares(middlewares, context);
      }
    });
  }
}

async function handleLiteServer<TState>(conn: Deno.Conn, app: App<TState>) {
  const requests = Deno.serveHttp(conn);

  for await (const request of requests) {
    const respondWith = respondWithWrapper(request.respondWith, conn);

    const context = new HttpContext(request);

    try {
      // try getting static file
      if (
        app.staticConfig && await getStaticFile(context, app.staticConfig)
      ) {
        respondWith(
          getResponse(context.response.getMergedResult()),
        );
        continue;
      }

      const action = getAction(
        app.routes,
        context.request.method,
        context.request.url,
      );

      if (action !== null) {
        // Get arguments in this action
        const args = await getActionParams(
          context,
          action,
          app.transformConfigMap,
        );

        // Get Action result from controller method
        context.response.result = await action.target[action.action](
          ...args,
        );
      }

      if (context.response.result === undefined) {
        context.response.result = notFoundAction();

        respondWith(getResponse(context.response.getMergedResult()));
        continue;
      }

      respondWith(getResponse(context.response.getMergedResult()));
    } catch (error) {
      if (app.globalErrorHandler) {
        app.globalErrorHandler(context, error);

        if (context.response.isImmediately()) {
          respondWith(getResponse(context.response.getMergedResult()));
          continue;
        }
      }

      if (context.response.isImmediately()) {
        respondWith(getResponse(context.response.getMergedResult()));
        continue;
      }

      if (!(error instanceof HttpError)) {
        console.error(error);
      }

      respondWith(getResponse(Content(error, error.httpCode || 500)));
    }
  }
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
