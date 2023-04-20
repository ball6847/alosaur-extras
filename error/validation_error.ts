import { ServiceError } from "./service_error.ts";

export class ValidationError extends ServiceError {
  constructor(details?: unknown) {
    super({
      code: "VALIDATION_ERROR",
      message: "Validation error",
      httpCode: 400,
      details,
    });
  }
}
