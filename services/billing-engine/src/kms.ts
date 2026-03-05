import crypto from 'crypto';
import { Policy } from './types';

export interface KMSAdapter {
  sign(payload: string): Promise<string> | string;
  verify(payload: string, signature: string): Promise<boolean> | boolean;
}

class HmacAdapter implements KMSAdapter {
  private key: Buffer;
  constructor(key?: Buffer) {
    this.key = key || crypto.randomBytes(32);
  }
  sign(payload: string) {
    return crypto.createHmac('sha256', this.key).update(payload).digest('hex');
  }
  verify(payload: string, signature: string) {
    const expected = crypto.createHmac('sha256', this.key).update(payload).digest('hex');
    return expected === signature;
  }
}

class AWSSDKKMSAdapter implements KMSAdapter {
  private client: any;
  private keyId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public SignCommand: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public VerifyCommand: any;
  constructor(keyId: string) {
    this.keyId = keyId;
    try {
      // dynamic import to avoid hard dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { KMSClient, SignCommand, VerifyCommand } = require('@aws-sdk/client-kms');
      this.client = new KMSClient({});
      this.SignCommand = SignCommand;
      this.VerifyCommand = VerifyCommand;
    } catch (e) {
      throw new Error('AWS SDK v3 (@aws-sdk/client-kms) is not installed');
    }
  }
  async sign(payload: string) {
    const { SignCommand } = this as any;
    const params = { KeyId: this.keyId, Message: Buffer.from(payload), SigningAlgorithm: 'RSASSA_PSS_SHA_256' };
    const res = await this.client.send(new SignCommand(params));
    return Buffer.from(res.Signature).toString('base64');
  }
  async verify(payload: string, signature: string) {
    const { VerifyCommand } = this as any;
    const params = { KeyId: this.keyId, Message: Buffer.from(payload), Signature: Buffer.from(signature, 'base64'), SigningAlgorithm: 'RSASSA_PSS_SHA_256' };
    const res = await this.client.send(new VerifyCommand(params));
    return !!res.SignatureValid;
  }
}

// Placeholder for Azure Key Vault adapter — user can implement and install @azure/keyvault-keys + @azure/identity
class AzureKeyVaultAdapter implements KMSAdapter {
  private vaultUrl: string;
  private keyName: string;
  private client: any;
  private cryptoClient: any;
  constructor(vaultUrl: string, keyName: string) {
    this.vaultUrl = vaultUrl;
    this.keyName = keyName;
    try {
      // dynamic import so package is optional
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DefaultAzureCredential } = require('@azure/identity');
      const { KeyClient, CryptographyClient } = require('@azure/keyvault-keys');
      const cred = new DefaultAzureCredential();
      this.client = new KeyClient(this.vaultUrl, cred);
      // create cryptography client lazily when signing
      this.CryptoCtor = CryptographyClient;
    } catch (e) {
      throw new Error('Azure SDK not installed or misconfigured. Install @azure/identity and @azure/keyvault-keys to use Azure Key Vault adapter');
    }
  }
  private CryptoCtor: any;

  async sign(payload: string) {
    // fetch key and create cryptography client
    const key = await this.client.getKey(this.keyName);
    const cryptoClient = new this.CryptoCtor(key.id, this.client.pipeline?.credential || undefined);
    // use RS256 (or appropriate algorithm) — Key must support signing
    const buffer = Buffer.from(payload);
    const res = await cryptoClient.sign('RS256', buffer);
    return Buffer.from(res.result).toString('base64');
  }

  async verify(payload: string, signature: string) {
    const key = await this.client.getKey(this.keyName);
    const cryptoClient = new this.CryptoCtor(key.id, this.client.pipeline?.credential || undefined);
    const buffer = Buffer.from(payload);
    const sigBuf = Buffer.from(signature, 'base64');
    const res = await cryptoClient.verify('RS256', buffer, sigBuf);
    return !!res.result;
  }
}

export class MARPKV {
  private adapter: KMSAdapter;
  constructor() {
    // choose adapter based on environment
    // MARP-branded environment variables: prefer MARP_* prefixes for key config
    if (process.env.MARP_AWS_KMS_KEY_ID) {
      this.adapter = new AWSSDKKMSAdapter(process.env.MARP_AWS_KMS_KEY_ID);
    } else if (process.env.MARP_AZURE_KEY_VAULT_URL && process.env.MARP_AZURE_KEY_NAME) {
      this.adapter = new AzureKeyVaultAdapter(process.env.MARP_AZURE_KEY_VAULT_URL, process.env.MARP_AZURE_KEY_NAME);
    } else {
      // fallback to HMAC for local dev
      this.adapter = new HmacAdapter();
    }
  }

  signPolicy(policy: Policy) {
    const payload = JSON.stringify({ policyId: policy.policyId, version: policy.version, effectiveFrom: policy.effectiveFrom });
    const sig = this.adapter.sign(payload);
    if (sig instanceof Promise) return sig.then((s) => ({ ...policy, signature: s } as any));
    return { ...policy, signature: sig } as any;
  }

  async verify(policyWithSig: any) {
    const { signature, ...rest } = policyWithSig;
    const payload = JSON.stringify({ policyId: rest.policyId, version: rest.version, effectiveFrom: rest.effectiveFrom });
    const res = this.adapter.verify(payload, signature);
    if (res instanceof Promise) return await res;
    return res;
  }
}
