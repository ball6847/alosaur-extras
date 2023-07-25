import { AsyncLocalStorage } from 'node:async_hooks';
import { HttpContext } from './deps.ts';

export const contextStorage = new AsyncLocalStorage<HttpContext<unknown>>();
