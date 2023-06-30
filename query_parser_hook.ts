import { ApiQuery, HookTarget, HttpContext, UseHook } from './deps.ts';
import { EntityContext, getDefaultContext, MetaData, parseQueryString } from './query_parser.ts';

export type QueryState = {
  metadata: Required<MetaData>;
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
    context.state.metadata = metadata as Required<MetaData>;
  }
}

function getFieldTypeFunc(type: string) {
  switch (type) {
    case 'number':
      return Number;
    case 'boolean':
      return Boolean;
    case 'string':
      return String;
    case 'date': // date string (ISO 8601 or mysql date ?)
      return String;
    case 'unix': // unix timestamp seconds
      return Number;
    default:
      return String;
  }
}

export function QueryParser(payload: EntityContext) {
  // deno-lint-ignore no-explicit-any
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const config = getDefaultContext(payload);
    // automatically register all needed decorators
    UseHook(QueryParserHook, config)(target, propertyKey, descriptor);

    if (config.openapi) {
      // page
      ApiQuery({
        name: 'page',
        type: Number,
        // @ts-ignore upgrade to latest version of alosaur-openapi
        default: 1,
        required: false,
      })(target, propertyKey, descriptor);

      // limit
      // TODO: check maxLimit and allowNoLimit to generate description
      ApiQuery({
        name: 'limit',
        type: Number,
        // @ts-ignore upgrade to latest version of alosaur-openapi
        default: config.defaultLimit,
        required: false,
      })(target, propertyKey, descriptor);

      // filterable fields
      for (const key in config.fields) {
        const field = config.fields[key];

        if (field.filterable) {
          if (field.enum) {
            ApiQuery({
              name: key,
              enum: field.enum ? field.enum : undefined,
              required: false,
              description: field.description,
            })(target, propertyKey, descriptor);
          } else {
            ApiQuery({
              name: key,
              type: getFieldTypeFunc(field.type),
              required: false,
              description: field.description,
            })(target, propertyKey, descriptor);
          }
        }
      }

      const sortable = Object.keys(config.fields)
        .filter((key) => config.fields[key].sortable);

      if (sortable.length > 0) {
        ApiQuery({
          name: 'sort',
          type: String,
          required: false,
          description:
            'Sort option, prefix the key with <code>-</code> for descending order, separate keys by <code>,</code>\n\n*Example*: <code>-name,age</code>\n\n*Available keys*: ' +
            sortable.map((k) => `<code>${k}</code>`).join(', '),
        })(target, propertyKey, descriptor);
      }
    }
  };
}
