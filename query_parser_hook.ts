import { HookTarget, HttpContext } from "./deps.ts";
import { EntityContext, MetaData, parseQueryString } from "./query_parser.ts";

export type QueryState = {
  metadata: MetaData;
};

export class QueryParserHook implements HookTarget<QueryState, EntityContext> {
  onPreAction(context: HttpContext<QueryState>, payload: EntityContext): void {
    if (!context.state) {
      context.state = {} as QueryState;
    }
    const metadata = parseQueryString(
      context.request.parserUrl.searchParams.toString(),
      payload,
    );
    context.state.metadata = metadata;
  }
}
