import {
  EntityContext,
  FilterOperator,
  parseFilters,
  parseIncludes,
  parsePagination,
  parseSorting,
} from './query_parser.ts';
import { assertEquals } from './testing/deps.ts';

// -------------------------------------------------------------------

Deno.test('parsePagination should return default values when no query string is provided', () => {
  const context = {
    defaultLimit: 25,
    maxLimit: 100,
  } as EntityContext;
  const result = parsePagination(new URLSearchParams(''), context);
  assertEquals(result, {
    page: 1,
    limit: 25,
    offset: 0,
  });
});

Deno.test('parsePagination should return default values when invalid query string is provided', () => {
  const context = {
    defaultLimit: 25,
    maxLimit: 100,
  } as EntityContext;
  const result = parsePagination(new URLSearchParams('page=-1&limit=abc'), context);
  assertEquals(result, {
    page: 1,
    limit: 25,
    offset: 0,
  });
});

Deno.test('parsePagination should fallback to default limit when limit exceeds max limit', () => {
  const context = {
    defaultLimit: 25,
    maxLimit: 100,
  } as EntityContext;
  const result = parsePagination(new URLSearchParams('limit=200'), context);
  assertEquals(result, {
    page: 1,
    limit: 100,
    offset: 0,
  });
});

Deno.test('parsePagination should fallback limit=0 to max limit when allowNoLimit is false', () => {
  const context = {
    defaultLimit: 25,
    maxLimit: 100,
    allowNoLimit: false,
  } as EntityContext;
  const result = parsePagination(new URLSearchParams('limit=0'), context);
  assertEquals(result, {
    page: 1,
    limit: 100,
    offset: 0,
  });
});

Deno.test('parsePagination should allow 0 limit when allowNoLimit is true', () => {
  const context = {
    defaultLimit: 25,
    maxLimit: 100,
    allowNoLimit: true,
  } as EntityContext;
  const result = parsePagination(new URLSearchParams('limit=0'), context);
  assertEquals(result, {
    page: 1,
    limit: 0,
    offset: 0,
  });
});

Deno.test('parsePagination should return correct values when valid query string is provided', () => {
  const context = {
    defaultLimit: 25,
    maxLimit: 100,
  } as EntityContext;
  const result = parsePagination(new URLSearchParams('page=2&limit=50'), context);
  assertEquals(result, {
    page: 2,
    limit: 50,
    offset: 50,
  });
});

// -------------------------------------------------------------------

Deno.test('parseSorting should return empty object when no sort query is provided', () => {
  const context = {
    fields: {
      name: {
        type: 'string',
        sortable: true,
        filterable: false,
      },
    },
  } as EntityContext;
  const result = parseSorting(new URLSearchParams(''), context);
  assertEquals(result, {});
});

Deno.test('parseSorting should return empty object when invalid sort query is provided', () => {
  const context = {
    fields: {
      name: {
        type: 'string',
        sortable: true,
        filterable: false,
      },
    },
  } as EntityContext;
  const result = parseSorting(new URLSearchParams('sort=-age,invalid'), context);
  assertEquals(result, {});
});

Deno.test('parseSorting should return correct object when valid sort query is provided', () => {
  const context = {
    fields: {
      name: {
        type: 'string',
        sortable: true,
        filterable: false,
      },
      age: {
        type: 'number',
        sortable: true,
        filterable: true,
      },
    },
  } as EntityContext;
  const result = parseSorting(new URLSearchParams('sort=name,-age'), context);
  assertEquals(result, {
    name: 'asc',
    age: 'desc',
  });
});

Deno.test('parseSorting should ignore fields that are not sortable', () => {
  const context = {
    fields: {
      name: {
        type: 'string',
        sortable: true,
        filterable: false,
      },
      age: {
        type: 'number',
        sortable: false,
        filterable: true,
      },
    },
  } as EntityContext;
  const result = parseSorting(new URLSearchParams('sort=name,-age'), context);
  assertEquals(result, {
    name: 'asc',
  });
});

// -------------------------------------------------------------------

Deno.test('parseIncludes should return empty array when no includes query string is provided', () => {
  const context = {
    fields: {},
    related: {},
  } as EntityContext;
  const result = parseIncludes(new URLSearchParams(''), context);
  assertEquals(result, {});
});

Deno.test('parseIncludes should return empty array when invalid includes query string is provided', () => {
  const context = {
    fields: {},
    related: {},
  } as EntityContext;
  const result = parseIncludes(new URLSearchParams('includes=invalid_field'), context);
  assertEquals(result, {});
});

Deno.test('parseIncludes should return valid includes fields when valid query string is provided', () => {
  const context = {
    fields: {
      field1: {
        type: 'string',
        filterable: true,
        sortable: true,
      },
    },
    related: {
      relation1: {
        entity: 'relatedEntity',
        fields: ['field2'],
      },
    },
  } as EntityContext;
  const result = parseIncludes(new URLSearchParams('includes=field1,relation1'), context);
  assertEquals(result, {
    relation1: {
      entity: 'relatedEntity',
      fields: ['field2'],
    },
  });
});

// -------------------------------------------------------------------

Deno.test('parseFilters returns empty object when no filter is present', () => {
  const query = new URLSearchParams('page=1&limit=20');
  const option = { fields: {} };
  const result = parseFilters(query, option);
  assertEquals(result, {});
});

Deno.test('parseFilters returns empty object when invalid filter is present', () => {
  const query = new URLSearchParams('page=1&limit=20&name=test');
  const option = { fields: {} };
  const result = parseFilters(query, option);
  assertEquals(result, {});
});

Deno.test('parseFilters returns correct filter object for valid filters', () => {
  const query = new URLSearchParams('page=1&limit=20&name[eq]=John&age[gt]=18');
  const option = {
    fields: {
      name: {
        type: 'string',
        sortable: true,
        filterable: true,
      },
      age: {
        type: 'number',
        sortable: true,
        filterable: true,
      },
    },
  } as EntityContext;
  const result = parseFilters(query, option);
  const expected = {
    name: { eq: 'John' },
    age: { gt: 18 },
  } as unknown as Record<string, Record<FilterOperator, string | number>>;
  assertEquals(result, expected);
});

Deno.test('parseFilters ignores unsupported operators for fields', () => {
  const query = new URLSearchParams('page=1&limit=20&name[in]=John,Jack&age[match]=abc');
  const option = {
    fields: {
      name: { type: 'string', sortable: true, filterable: true, supportedOperators: ['eq', 'ne', 'in'] },
      age: { type: 'number', sortable: true, filterable: true },
    },
  } as EntityContext;
  const result = parseFilters(query, option);
  const expected = {
    name: { in: ['John', 'Jack'] },
  } as unknown as Record<string, Record<FilterOperator, string | number>>;
  assertEquals(result, expected);
});

Deno.test('parseFilters ignores non-filterable fields', () => {
  const query = new URLSearchParams('page=1&limit=20&name[eq]=John&email[eq]=test@example.com');
  const option = {
    fields: {
      name: { type: 'string', sortable: true, filterable: true },
      email: { type: 'string', sortable: true, filterable: false },
    },
  } as EntityContext;
  const result = parseFilters(query, option);
  const expected = {
    name: { eq: 'John' },
  } as unknown as Record<string, Record<FilterOperator, string | number>>;
  assertEquals(result, expected);
});

Deno.test('parseFilters parses numeric values correctly', () => {
  const query = new URLSearchParams('page=1&limit=20&age[eq]=10&rating[gt]=3.5');
  const option = {
    fields: {
      age: { type: 'number', sortable: true, filterable: true },
      rating: { type: 'number', sortable: true, filterable: true },
    },
  } as EntityContext;
  const result = parseFilters(query, option);
  const expected = {
    age: { eq: 10 },
    rating: { gt: 3.5 },
  } as unknown as Record<string, Record<FilterOperator, string | number>>;
  assertEquals(result, expected);
});

Deno.test('parseFilters parses filters with or without operator', () => {
  const query = new URLSearchParams('name=john&age[gt]=20&address[in]=New York,Paris');
  const context = {
    fields: {
      name: { type: 'string', filterable: true, sortable: true },
      age: { type: 'number', filterable: true, sortable: true },
      address: {
        type: 'enum',
        filterable: true,
        sortable: true,
        enumValues: ['New York', 'Paris', 'London'],
        supportedOperators: ['eq', 'ne', 'in'],
      },
    },
  } as EntityContext;
  const filter = parseFilters(query, context);
  const expected = {
    name: { eq: 'john' },
    age: { gt: 20 },
    address: { in: ['New York', 'Paris'] },
  } as unknown as Record<string, Record<FilterOperator, string | number>>;
  assertEquals(filter, expected);
});
