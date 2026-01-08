/**
 * @file utils.ts
 * @description Common utilities for the proximity service.
 */

export class RateLimiter {
    private tokens: Map<string, number> = new Map();
    private capacity: number;
    private windowMs: number;

    constructor(capacity: number, windowMs: number) {
        this.capacity = capacity;
        this.windowMs = windowMs;
    }

    isAllowed(key: string): boolean {
        // Implementation to be added
        return true;
    }
}
