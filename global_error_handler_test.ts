import { assertExists } from "https://deno.land/std/testing/asserts.ts";
import { HttpContext, HttpResponse } from "./deps.ts";
import { assertEquals, assertThrowsAsync } from "./deps_test.ts";
import { globalErrorHandler } from "./globalErrorHandler.ts";

Deno.test("globalErrorHandler with ServiceErrorLike", async () => {
  const context = new HttpContext({});
  const error = {
    code: "ERROR_CODE",
    message: "Error message",
    httpCode: 400,
  };

  await globalErrorHandler(context, error);

  assertEquals(context.response.status, 400);
  assertEquals(context.response.result, {
    error: { code: "ERROR_CODE", message: "Error message", details: undefined },
  });
});

Deno.test("globalErrorHandler with ActionResult", async () => {
  const context = new HttpContext({});
  const actionResult = {
    __isActionResult: true,
    toActionResult: () => {
      return {
        status: 200,
        content: "Action result content",
      };
    },
  };

  await globalErrorHandler(context, actionResult);

  assertEquals(context.response.status, 200);
  assertEquals(context.response.result.content, "Action result content");
});

Deno.test("globalErrorHandler with Error", async () => {
  const context = new HttpContext({});
  const error = new Error("Error message");

  await assertThrowsAsync(async () => {
    await globalErrorHandler(context, error);
  });

  assertEquals(context.response.status, 500);
  assertEquals(context.response.result, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      details: undefined,
    },
  });
});

Deno.test("globalErrorHandler with unexpected error format", async () => {
  const context = new HttpContext({});
  const error = {
    unexpectedField: "unexpected field",
  };

  await assertThrowsAsync(async () => {
    await globalErrorHandler(context, error as any);
  });

  assertEquals(context.response.status, 500);
  assertEquals(context.response.result, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
      details: undefined,
    },
  });
});

Deno.test("globalErrorHandler logs server errors", () => {
  const context = new HttpContext({} as any, new HttpResponse());
  const err = new Error("Internal server error");

  // Set the error status to 500 to trigger error logging
  err["httpCode"] = 500;

  // Mock console.error to check if it is called
  const originalConsoleError = console.error;
  let consoleCalled = false;
  console.error = () => {
    consoleCalled = true;
  };

  globalErrorHandler(context, err);

  // Check that the context response was set and immediately sent
  assertExists(context.response.result);
  assertEquals(context.response.isImmediately, true);

  // Check that the error was logged
  assertEquals(consoleCalled, true);

  // Restore console.error
  console.error = originalConsoleError;
});
