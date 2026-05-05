"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContext = void 0;
const node_async_hooks_1 = require("node:async_hooks");
/**
 * RequestContext provides access to the current user's session context
 * using Node.js AsyncLocalStorage. This allows database subscribers
 * and deep services to identify the 'actor' without prop-drilling.
 */
class RequestContext {
    static run(context, fn) {
        return this.storage.run(context, fn);
    }
    static get current() {
        return this.storage.getStore();
    }
}
exports.RequestContext = RequestContext;
RequestContext.storage = new node_async_hooks_1.AsyncLocalStorage();
