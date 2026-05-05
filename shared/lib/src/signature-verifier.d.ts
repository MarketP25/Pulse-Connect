export type SignatureEncoding = "base64" | "base64url" | "hex";
export interface SignatureVerifierConfig {
    publicKey: string;
    algorithm?: string;
}
export declare function verifySignature(payload: string | Buffer, signature: string, config: SignatureVerifierConfig): boolean;
