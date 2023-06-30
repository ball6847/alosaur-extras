import { ApiProperty, DateTime, memoizy } from './deps.ts';
import { ValidationError } from './error/validation_error.ts';

const datetimeRegex = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/;

export type FieldType = 'number' | 'string' | 'boolean' | 'date' | 'unix';

type PrimitiveType = string | number | boolean | DateTime;

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
  sortable?: boolean;
  filterable: boolean;
  /**
   * @deprecated use enum instead
   */
  enumValues?: string[];
  enum?: Record<string, string>;
  supportedOperators?: FilterOperator[];
  description?: string;
}

export interface EntityContext {
  /**
   * Register this entity definition to openapi
   */
  openapi?: boolean;
  fields?: Record<string, FieldInfo>;
  related?: Record<
    string,
    {
      entity: string;
      fields: string[];
    }
  >;
  /**
   * default sort option, as key-value pair where key is field name and value is 'asc' or 'desc'
   * the field should ne listed in `fields` property with `sortable` set to true
   *
   * only take effect when no ?sort is provided in query string
   */
  defaultSort?: Record<string, 'asc' | 'desc'>;
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
  date: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';
  unix: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';
};

// default everything to eq
const defaultOperators: {
  number: SupportedOperator['number'][];
  string: SupportedOperator['string'][];
  enum: SupportedOperator['enum'][];
  boolean: SupportedOperator['boolean'][];
  date: SupportedOperator['date'][];
  unix: SupportedOperator['unix'][];
} = {
  number: ['eq'],
  string: ['eq'],
  enum: ['eq'],
  boolean: ['eq'],
  date: ['eq'],
  unix: ['eq'],
};

export const getDefaultContext = (
  context: Partial<EntityContext>,
): Required<EntityContext> => {
  const defaultContext: Required<EntityContext> = {
    openapi: false,
    fields: {},
    related: {},
    defaultSort: {},
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
    metadata.filter = parseFilters(query, option);
    metadata.sort = parseSorting(query, option);
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
    // empty value should be ignored
    if (!value) {
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
          // handle list of value for in and nin by splitting the value by comma
          if (operator === 'in' || operator === 'nin') {
            filter[field][operator] = value
              .split(',')
              .map((v) => parsePrimitive(v, field, fieldInfo));
          } else {
            // handle single value operator
            filter[field][operator] = parsePrimitive(value, field, fieldInfo);
          }
        }
      }
    }
  });
  return filter;
}

function isValidNumber(val: number) {
  if (val < 0 || isNaN(val) || val > Number.MAX_SAFE_INTEGER) {
    return false;
  }
  return true;
}

/**
 * Parse the value using the configured type
 *
 * If the field is invalid, throw a ValidationError
 */
function parsePrimitive(
  value: string,
  name: string,
  field: FieldInfo,
): string | number | boolean | DateTime {
  switch (field.type) {
    // parse number, if it could be converted to a valid number
    case 'number': {
      const n = Number(value);
      if (!isValidNumber(n)) {
        throw new ValidationError(`${n} is not a valid number for ${name}`);
      }
      return n;
    }

    // any string refer to truthy value is ok
    case 'boolean':
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());

    // parse number as unix timestamp to luxon DateTime
    case 'unix': {
      const n = Number(value);
      if (!isValidNumber(n)) {
        throw new ValidationError(`${value} is not a valid number for ${name}`);
      }
      const dt = DateTime.fromMillis(n * 1000);
      if (!dt.isValid) {
        throw new ValidationError(
          `${value} could not be parsed as unix timestamp for ${name}, Reason: ${dt.invalidReason}`,
        );
      }
      return dt;
    }

    // parse string as ISO8601 or SQL datetime to luxon DateTime
    case 'date': {
      const dt = datetimeRegex.test(value) ? DateTime.fromSQL(value) : DateTime.fromISO(value);
      if (!dt.isValid) {
        throw new ValidationError(
          `${value} could not be parsed as date for ${name}, Reason: ${dt.invalidReason}`,
        );
      }
      return dt;
    }

    case 'string':
      // enum string type
      if (field.enum && !Object.values(field.enum).includes(value)) {
        const allowed = Object.values(field.enum).join(', ');
        throw new ValidationError(
          `${value} is not a valid value for ${name}, valid values are: ${allowed}`,
        );
      }
      // any string
      return value;

    // anything else, just return the value
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
  return Object.keys(sort).length > 0 ? sort : context.defaultSort;
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
