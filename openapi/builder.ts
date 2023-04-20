// deno-lint-ignore-file no-explicit-any no-case-declarations no-unused-vars
import { AppSettings, getMetadataArgsStorage, ObjectKeyAny } from 'https://deno.land/x/alosaur@v0.38.0/mod.ts';

import { OpenApiBuilder } from 'https://deno.land/x/alosaur@v0.38.0/openapi/builder/openapi-builder.ts';
import * as oa from 'https://deno.land/x/alosaur@v0.38.0/openapi/builder/openapi-models.ts';
import {
  getOpenApiMetadataArgsStorage,
  OpenApiArgsStorage,
} from 'https://deno.land/x/alosaur@v0.38.0/openapi/metadata/openapi-metadata.storage.ts';
import { getDenoDoc } from 'https://deno.land/x/alosaur@v0.38.0/openapi/parser/src/deno-doc-reader.ts';
import { DenoDoc } from 'https://deno.land/x/alosaur@v0.38.0/openapi/parser/src/deno-doc.model.ts';
import {
  getParsedNames,
  getSchemeByDef,
  getShemeByEnumDef,
  ParsedNamesDocMap,
} from 'https://deno.land/x/alosaur@v0.38.0/openapi/parser/src/utils.ts';
import { MetadataArgsStorage } from 'https://deno.land/x/alosaur@v0.38.0/src/metadata/metadata.ts';
import { RouteMetadata } from 'https://deno.land/x/alosaur@v0.38.0/src/metadata/route.ts';
import { ParamType } from 'https://deno.land/x/alosaur@v0.38.0/src/types/param.ts';
import { registerAreas } from 'https://deno.land/x/alosaur@v0.38.0/src/utils/register-areas.ts';
import { registerControllers } from 'https://deno.land/x/alosaur@v0.38.0/src/utils/register-controllers.ts';
import {
  buildSchemaObject,
  exploreClassTags,
  explorePropertyTags,
  exploreResponses,
} from './route_metadata_explorer.ts';

/**
 * For testing this builder use this editor:
 * https://editor.swagger.io/
 */

// Builder OpenAPI v3.0.0
export class AlosaurOpenApiBuilder<T> {
  private classes: ObjectKeyAny[] = [];
  private appMetadata: MetadataArgsStorage<T>;
  private openApiMetadata: OpenApiArgsStorage<T>;
  private routes: RouteMetadata[] = [];
  private builder = new OpenApiBuilder();
  private denoDocs?: DenoDoc.RootDef[];
  private namesDenoDocMap?: ParsedNamesDocMap;

  static create<T>(settings: AppSettings): AlosaurOpenApiBuilder<T> {
    return new AlosaurOpenApiBuilder(settings);
  }

  constructor(private readonly settings: AppSettings) {
    this.appMetadata = getMetadataArgsStorage();
    this.openApiMetadata = getOpenApiMetadataArgsStorage();
  }

  public registerControllers(): AlosaurOpenApiBuilder<T> {
    registerAreas(this.appMetadata);
    registerControllers(
      this.appMetadata,
      this.classes,
      (route: RouteMetadata) => {
        // '/app/home/test/:id/:name/detail' => '/app/home/test/{id}/{name}/detail'
        const openApiRoute: string = route.route.replace(
          /:[A-Za-z1-9]+/g,
          (m) => `{${m.substr(1)}}`,
        );

        this.builder.addPath(openApiRoute, this.getPathItem(route));
      },
      false,
    );

    return this;
  }

  public getSpec(): oa.OpenAPIObject {
    return this.builder.getSpec();
  }

  public saveToFile(
    path = './openapi.json',
  ): AlosaurOpenApiBuilder<T> {
    Deno.writeTextFileSync(path, JSON.stringify(this.getSpec()));
    return this;
  }

  public saveDenoDocs(path = './docs.json'): AlosaurOpenApiBuilder<T> {
    Deno.writeTextFileSync(path, JSON.stringify(this.denoDocs));
    return this;
  }

  public print(): void {
    console.log(this.builder.getSpec());
  }

  /**
   * Gets operation from app route metadata
   */
  private getPathItem(route: RouteMetadata): oa.PathItemObject {
    // console.log('--------------------');
    // console.log(route);

    const controllerClassName: string = route.target.constructor.name;

    // explore tags from @ApiTags() decorator
    const tags = [...exploreClassTags(route), ...explorePropertyTags(route)];

    const responses = exploreResponses(route);

    const operation: oa.OperationObject = {
      tags: tags.length > 0 ? tags : [controllerClassName], // fallback to controller name
      responses: Object.keys(responses).length ? responses : {
        '200': {
          description: '',
        },
      },
    };

    // @ts-ignore: Object is possibly 'null'.
    operation.parameters = [] as oa.ParameterObject[];

    // Parse each route params
    route.params.forEach((param, index) => {
      switch (param.type) {
        case ParamType.Query:
          // @ts-ignore: Object is possibly 'null'.
          operation.parameters.push({
            // @ts-ignore: Object is possibly 'null'.
            name: param.name,
            in: 'query',
            schema: { type: 'string' },
          });
          break;

        case ParamType.RouteParam:
          // @ts-ignore: Object is possibly 'null'.
          operation.parameters.push({
            // @ts-ignore: Object is possibly 'null'.
            name: param.name,
            required: true,
            in: 'path',
            schema: { type: 'string' },
          });
          break;

        case ParamType.Cookie:
          // @ts-ignore: Object is possibly 'null'.
          operation.parameters.push({
            // @ts-ignore: Object is possibly 'null'.
            name: param.name,
            in: 'cookie',
            schema: { type: 'string' },
          });
          break;
        case ParamType.Body:
          const schema = buildSchemaObject(param.transform);
          if (schema) {
            this.builder.addSchema(param.transform.name, schema);
            operation.requestBody = {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: GetShemeLinkAndRegister(param.transform.name),
                  },
                },
              },
            };
          }
          break;
      }
    });

    return {
      [route.method.toLowerCase()]: operation,
    };
  }

  public addTitle(title: string): AlosaurOpenApiBuilder<T> {
    this.builder.addTitle(title);
    return this;
  }

  public addVersion(version: string): AlosaurOpenApiBuilder<T> {
    this.builder.addVersion(version);
    return this;
  }

  public addDescription(description: string): AlosaurOpenApiBuilder<T> {
    this.builder.addDescription(description);
    return this;
  }

  public addServer(server: oa.ServerObject): AlosaurOpenApiBuilder<T> {
    this.builder.addServer(server);
    return this;
  }

  public addDenoDocs(docs: any): AlosaurOpenApiBuilder<T> {
    this.denoDocs = docs;
    this.namesDenoDocMap = getParsedNames(docs);

    return this;
  }

  public addSchemeComponents(): AlosaurOpenApiBuilder<T> {
    const namesSets = getOpenApiMetadataArgsStorage().usableClassNamesSet;

    if (!this.namesDenoDocMap) {
      throw new Error('Run addDenoDocs before start scheme components!');
    }

    this.namesDenoDocMap!.classes.forEach((classObj) => {
      if (namesSets.has(classObj.name)) {
        this.builder.addSchema(classObj.name, getSchemeByDef(classObj));
      }
    });

    this.namesDenoDocMap!.interfaces.forEach((interfaceObj) => {
      if (namesSets.has(interfaceObj.name)) {
        this.builder.addSchema(interfaceObj.name, getSchemeByDef(interfaceObj));
      }
    });

    this.namesDenoDocMap!.enums.forEach((enumDef) => {
      if (namesSets.has(enumDef.name)) {
        this.builder.addSchema(enumDef.name, getShemeByEnumDef(enumDef));
      }
    });

    return this;
  }

  public static async parseDenoDoc(path?: string): Promise<any> {
    return await getDenoDoc(path);
  }
}

/**
 * Gets right scheme link and register as uses
 * @param name
 */
function GetShemeLinkAndRegister(name: string): string {
  getOpenApiMetadataArgsStorage().usableClassNamesSet.add(name);
  return '#/components/schemas/' + name;
}
