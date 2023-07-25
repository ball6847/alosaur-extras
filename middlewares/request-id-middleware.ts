import { HttpContext, Middleware, PreRequestMiddleware } from '../deps.ts';

export type RequestIdState = {
  id: string;
};

@Middleware(new RegExp('^/'))
export class RequestIdMiddleware implements PreRequestMiddleware<RequestIdState> {
  onPreRequest(context: Required<HttpContext<RequestIdState>>) {
    if (!context.state) {
      context.state = {} as RequestIdState;
    }

    context.state.id = crypto.randomUUID();
  }

  onPostRequest(_context: Required<HttpContext<RequestIdState>>) {
  }
}
