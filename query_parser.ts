import { ApiProperty, memoizy } from './deps.ts';

export type FieldType = 'number' | 'string' | 'boolean' | 'enum';

type PrimitiveType = string | number | boolean;

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'in'
  | 'nin'
  | 'match';

export interface FieldInfo {
  type: FieldType;
  sortable: boolean;
  filterable: boolean;
  enumValues?: string[];
  supportedOperators?: FilterOperator[];
}

export interface EntityContext {
  fields?: Record<string, FieldInfo>;
  related?: Record<
    string,
    {
      entity: string;
      fields: string[];
    }
  >;
  defaultLimit?: number;
  maxLimit?: number;
  allowNoLimit?: boolean;
}

export class MetadataPagination {
  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 25 })
  limit!: number;

  @ApiProperty({ type: Number, example: 0 })
  offset!: number;

  @ApiProperty({ type: Number, example: 100 })
  total_items?: number;

  @ApiProperty({ type: Number, example: 4 })
  total_pages?: number;
}

export class MetaData {
  @ApiProperty({ type: MetadataPagination })
  pagination!: MetadataPagination;
  filter?: Record<
    string,
    Record<FilterOperator, PrimitiveType | PrimitiveType[]>
  >;
  sort?: Record<string, 'asc' | 'desc'>;
  includes?: EntityContext['related'];
}

type SupportedOperator = {
  number: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'in' | 'nin';
  string: 'eq' | 'ne' | 'match' | 'in' | 'nin';
  enum: 'eq' | 'ne' | 'in' | 'nin';
  boolean: 'eq' | 'ne';
};

const defaultOperators: {
  number: SupportedOperator['number'][];
  string: SupportedOperator['string'][];
  enum: SupportedOperator['enum'][];
  boolean: SupportedOperator['boolean'][];
} = {
  number: ['eq', 'ne', 'gt', 'ge', 'lt', 'le'],
  string: ['eq', 'ne', 'match'],
  enum: ['eq', 'ne'],
  boolean: ['eq', 'ne'],
};

const getDefaultContext = (
  context: Partial<EntityContext>,
): Required<EntityContext> => {
  const defaultContext: Required<EntityContext> = {
    fields: {},
    related: {},
    defaultLimit: 25,
    maxLimit: 100,
    allowNoLimit: true,
  };
  return { ...defaultContext, ...context };
};

export const parseQueryString = memoizy(
  (queryString: string, option: EntityContext): MetaData => {
    const query = new URLSearchParams(queryString);
    const metadata: MetaData = {
      pagination: parsePagination(query, option),
    };
    const filter = parseFilters(query, option);
    if (Object.keys(filter).length > 0) {
      metadata.filter = filter;
    }
    if (query.has('sort')) {
      metadata.sort = parseSorting(query, option);
    }
    if (query.has('includes')) {
      metadata.includes = parseIncludes(query, option);
    }
    return metadata;
  },
);

export function parsePagination(
  query: URLSearchParams,
  option: EntityContext,
): MetaData['pagination'] {
  const context = getDefaultContext(option);
  let page = Number(query.get('page')) || 1;
  let limit = Number(query.get('limit') ?? context.defaultLimit);
  // fallback invalid page value to 1
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  // fallback invalid limit value to default limit, note that limit can be 0 for no limit
  if (isNaN(limit) || limit < 0) {
    limit = context.defaultLimit;
  }
  // retrieve all items when limit is 0
  if (limit === 0) {
    // fallback limit to max limit when allowNoLimit is false
    // otherwise, force page to 1 (no limiting cannot be used with pagination)
    if (!context.allowNoLimit) {
      limit = context.maxLimit;
    } else {
      page = 1;
    }
  }
  // fallback limit to max limit when limit is greater than max limit
  if (limit > context.maxLimit) {
    limit = context.maxLimit;
  }
  // calculate offset
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function parseFilters(query: URLSearchParams, option: EntityContext) {
  const context = getDefaultContext(option);
  const filter: MetaData['filter'] = {};
  const disallow = ['sort', 'page', 'limit', 'includes'];
  query.forEach((value, key) => {
    if (disallow.includes(key)) {
      return;
    }
    const match = key.match(/^(.+?)(?:\[(.+)\])?$/);
    if (match) {
      const field = match[1];
      const operator = (match[2] ?? 'eq') as FilterOperator;
      const fieldInfo = context.fields[field];
      if (fieldInfo && fieldInfo.filterable) {
        const supported = fieldInfo.supportedOperators ??
          defaultOperators[fieldInfo.type];
        if (supported.includes(operator)) {
          filter[field] = filter[field] || {};
          if (operator === 'in' || operator === 'nin') {
            filter[field][operator] = value
              .split(',')
              .map((v) => parsePrimitive(v, fieldInfo.type));
          } else {
            filter[field][operator] = parsePrimitive(value, fieldInfo.type);
          }
        }
      }
    }
  });
  return filter;
}

function parsePrimitive(
  value: string,
  type: FieldType,
): string | number | boolean {
  switch (type) {
    case 'number':
      return Number(value);
    case 'boolean':
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    default:
      return value;
  }
}

export function parseSorting(query: URLSearchParams, option: EntityContext) {
  const context = getDefaultContext(option);
  const sort: Record<string, 'asc' | 'desc'> = {};
  const sortQuery = query.get('sort');
  if (sortQuery) {
    const fields = sortQuery.split(',');
    for (const field of fields) {
      const direction = field.startsWith('-') ? 'desc' : 'asc';
      const fieldName = direction === 'desc' ? field.substring(1) : field;
      const fieldInfo = context.fields[fieldName];
      if (fieldInfo && fieldInfo.sortable) {
        sort[fieldName] = direction;
      }
    }
  }
  return sort;
}

export function parseIncludes(
  query: URLSearchParams,
  option: EntityContext,
): MetaData['includes'] {
  const context = getDefaultContext(option);
  const relatedFields = context.related ?? {};
  const includeQuery = query.get('includes');
  if (!includeQuery) {
    return {};
  }
  const includes = includeQuery.split(',').map((include) => include.trim());
  return includes.reduce<Record<string, { entity: string; fields: string[] }>>(
    (acc, include) => {
      if (include in relatedFields) {
        acc[include] = relatedFields[include];
      }
      return acc;
    },
    {},
  );
}
