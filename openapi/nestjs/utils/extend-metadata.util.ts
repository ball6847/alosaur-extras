// deno-lint-ignore-file no-explicit-any ban-types
import { Reflect } from '../reflect.ts';

export function extendMetadata<T extends Record<string, any>[] = any[]>(
  metadata: T,
  metakey: string,
  target: object,
) {
  const existingMetadata = Reflect.getMetadata(metakey, target);
  if (!existingMetadata) {
    return metadata;
  }
  return existingMetadata.concat(metadata);
}
