export class IdempotencyManager {
  private keys: Set<string> = new Set();

  /**
   * Check if key exists, add if not
   */
  checkKey(key: string): boolean {
    if (this.keys.has(key)) {
      return false; // Duplicate
    }
    this.keys.add(key);
    return true; // New
  }

  /**
   * Remove key (for cleanup)
   */
  removeKey(key: string): void {
    this.keys.delete(key);
  }

  /**
   * Clear all keys
   */
  clear(): void {
    this.keys.clear();
  }

  /**
   * Get key count
   */
  size(): number {
    return this.keys.size;
  }
}
