import { OpenAPIObject } from './open-api-spec.interface.ts';
import { SwaggerUiOptions } from './swagger-ui-options.interface.ts';

export interface SwaggerUIInitOptions {
  swaggerDoc: OpenAPIObject;
  customOptions: SwaggerUiOptions;
  swaggerUrl: string;
}
