// deno-lint-ignore-file no-explicit-any

import { ActionResult, Content, HttpContext } from './deps.ts';
import { ServiceError } from './error/service_error.ts';
import { globalErrorHandler } from './global_error_handler.ts';
import { assertEquals, assertSpyCalls, spy } from './testing/deps.ts';

// make simple context for testing
const makeContext = () => {
  return {
    response: {
      result: {} as ActionResult,
      setImmediately: () => undefined,
    },
  } as HttpContext;
};

const textDecoder = new TextDecoder();
const decode = (body: BufferSource) => JSON.parse(textDecoder.decode(body));

Deno.test('globalErrorHandler with ServiceErrorLike', () => {
  const context = makeContext();

  const error = new ServiceError({
    code: 'ERROR_CODE',
    message: 'Error message',
    httpCode: 400,
  });

  globalErrorHandler(context, error);

  const body = decode(context.response.result.body);

  assertEquals(context.response.result.status, 400);
  assertEquals(body, {
    error: {
      code: 'ERROR_CODE',
      message: 'Error message',
    },
  });
});

Deno.test('globalErrorHandler with ActionResult', () => {
  const context = makeContext();
  const actionResult = Content('Action result content', 200);

  globalErrorHandler(context, actionResult);

  const body = textDecoder.decode(context.response.result.body);

  assertEquals(context.response.result.status, 200);
  assertEquals(body, 'Action result content');
});

Deno.test('globalErrorHandler with Error', () => {
  const context = makeContext();
  const consoleSpy = spy(console, 'error');
  const error = new Error('Error message');

  globalErrorHandler(context, error);

  const body = decode(context.response.result.body);

  assertEquals(context.response.result.status, 500);
  assertEquals(body, {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
  // test if console.error is called
  assertSpyCalls(consoleSpy, 1);

  consoleSpy.restore();
});

Deno.test('globalErrorHandler with unexpected error format', () => {
  const context = makeContext();
  const consoleSpy = spy(console, 'error');
  const error = {
    unexpectedField: 'unexpected field',
  };

  globalErrorHandler(context, error as any);

  const body = decode(context.response.result.body);

  assertEquals(context.response.result.status, 500);
  assertEquals(body, {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
  // test if console.error is called
  assertSpyCalls(consoleSpy, 1);

  consoleSpy.restore();
});
