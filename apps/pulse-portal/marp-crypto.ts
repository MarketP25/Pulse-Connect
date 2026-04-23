/**
 * MARP Device-Bound Cryptography Service
 * Implements RSA-SHA256 signing via Web Crypto API with non-extractable keys.
 */

const DB_NAME = "PulscoMarpVault";
const STORE_NAME = "GovernanceKeys";
const KEY_ALIAS = "marp-device-key";

export class MarpCrypto {
  private static db: IDBDatabase | null = null;

  private static async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generates a non-extractable RSA key pair for the device.
   * The private key can sign but never be read by JavaScript.
   */
  static async initializeDeviceKeys(): Promise<CryptoPublicKey> {
    const db = await this.getDB();

    // Check if key already exists
    const existingKey = await this.getKeyPair();
    if (existingKey) return existingKey.publicKey;

    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      false, // NOT extractable - This prevents private key leakage
      ["sign", "verify"]
    );

    // Store the opaque handles in IndexedDB
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(keyPair, KEY_ALIAS);

    return keyPair.publicKey;
  }

  private static async getKeyPair(): Promise<CryptoKeyPair | null> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(KEY_ALIAS);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Signs a payload using the non-extractable private key.
   * Coordination: Matches pulse-connect-core RSA-SHA256 verification.
   */
  static async signPayload(payload: string): Promise<string> {
    const keys = await this.getKeyPair();
    if (!keys || !keys.privateKey) {
      throw new Error("MARP keys not initialized on this device");
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    const signatureBuffer = await window.crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      keys.privateKey,
      data
    );

    return this.arrayBufferToBase64(signatureBuffer);
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return window.btoa(binary);
  }

  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return this.arrayBufferToBase64(exported);
  }
}
