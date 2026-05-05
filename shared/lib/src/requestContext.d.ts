export interface UserContext {
    userId: string;
    role: string;
}
/**
 * RequestContext provides access to the current user's session context
 * using Node.js AsyncLocalStorage. This allows database subscribers
 * and deep services to identify the 'actor' without prop-drilling.
 */
export declare class RequestContext {
    private static readonly storage;
    static run(context: UserContext, fn: () => any): any;
    static get current(): UserContext | undefined;
}
