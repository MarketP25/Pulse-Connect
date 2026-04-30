import { AsyncLocalStorage } from "node:async_hooks";

export interface UserContext {
  userId: string;
  role: string;
}

/**
 * RequestContext provides access to the current user's session context
 * using Node.js AsyncLocalStorage. This allows database subscribers
 * and deep services to identify the 'actor' without prop-drilling.
 */
export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<UserContext>();

  static run(context: UserContext, fn: () => any): any {
    return this.storage.run(context, fn);
  }

  static get current(): UserContext | undefined {
    return this.storage.getStore();
  }
}
