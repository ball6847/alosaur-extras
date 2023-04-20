import { Content, HttpContext } from "../deps.ts";
import { AlosaurOpenApiBuilder } from "./builder.ts";
import { AlosaurRequest, MiddlewareTarget, Redirect } from "./deps.ts";
import { generateHTML, swaggerInit } from "./swagger-ui.ts";

type OpenApiMiddlewareOptions = {
  title?: string;
  description?: string;
  version?: string;
};

export class OpenApiMiddleware implements MiddlewareTarget<unknown> {
  constructor(private options?: OpenApiMiddlewareOptions) {}

  onPreRequest(context: HttpContext<unknown>) {
    if (context.request.url.endsWith("/swagger.json")) {
      const swaggerDoc = this.getSwaggerDoc(context.request);
      context.response.result = Content(swaggerDoc, 200);
    } else if (context.request.url.endsWith("/swagger-ui-init.js")) {
      context.response.result = Content(
        swaggerInit,
        200,
        new Headers({ "Content-Type": "text/javascript" })
      );
    } else if (!context.request.url.endsWith("/")) {
      context.response.result = Redirect(context.request.url.concat("/"));
    } else {
      const swaggerDoc = this.getSwaggerDoc(context.request);
      const html = generateHTML(swaggerDoc);
      context.response.result = Content(html, 200);
    }

    context.response.setImmediately();
  }

  onPostRequest(_context: HttpContext<unknown>) {
    return null;
  }

  getSwaggerDoc(req: AlosaurRequest) {
    let spec = AlosaurOpenApiBuilder.create({ areas: [] })
      .registerControllers()
      .addServer({
        url: new URL(req.url).origin,
      });
    if (this.options?.title) {
      spec = spec.addTitle(this.options.title);
    }
    if (this.options?.description) {
      spec = spec.addDescription(this.options.description);
    }
    if (this.options?.version) {
      spec = spec.addVersion(this.options.version);
    }

    return spec.getSpec();
  }
}
