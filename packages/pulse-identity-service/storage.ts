import {
  AuditLogRow,
  ConsentRecordRow,
  KycStatusRow,
  LoginSessionRow,
  ReferralRow,
  UserLocaleRow,
  UserRoleRow,
  UserRow,
  UserSecurityRow,
  UserTrustScoreRow,
} from "./types";

export interface IdentityStorageAdapter {
  findUserById(userId: string): Promise<UserRow | null>;
  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserByUsername(username: string): Promise<UserRow | null>;
  findUserByReferralCode(referralCode: string): Promise<UserRow | null>;
  insertUser(user: UserRow): Promise<void>;
  updateUser(user: UserRow): Promise<void>;

  upsertUserRole(row: UserRoleRow): Promise<void>;
  getUserRole(userId: string): Promise<UserRoleRow | null>;

  upsertUserLocale(row: UserLocaleRow): Promise<void>;
  getUserLocale(userId: string): Promise<UserLocaleRow | null>;

  upsertUserSecurity(row: UserSecurityRow): Promise<void>;
  getUserSecurity(userId: string): Promise<UserSecurityRow | null>;

  upsertTrustScore(row: UserTrustScoreRow): Promise<void>;
  getTrustScore(userId: string): Promise<UserTrustScoreRow | null>;

  insertConsentRecord(row: ConsentRecordRow): Promise<void>;
  listConsentRecords(userId: string): Promise<ConsentRecordRow[]>;

  insertReferral(row: ReferralRow): Promise<void>;
  getReferralByReferredUser(userId: string): Promise<ReferralRow | null>;

  upsertKycStatus(row: KycStatusRow): Promise<void>;
  getKycStatus(userId: string): Promise<KycStatusRow | null>;

  insertAuditLog(row: AuditLogRow): Promise<void>;
  listAuditLogs(userId: string): Promise<AuditLogRow[]>;

  insertLoginSession(row: LoginSessionRow): Promise<void>;
  updateLoginSession(row: LoginSessionRow): Promise<void>;
  findLoginSessionById(sessionId: string): Promise<LoginSessionRow | null>;
  revokeLoginSession(sessionId: string): Promise<void>;

  getIdempotentResponse<TValue = unknown>(scope: string, key: string): Promise<TValue | null>;
  setIdempotentResponse<TValue = unknown>(scope: string, key: string, value: TValue): Promise<void>;
}

type IdempotencyRecord = {
  scope: string;
  key: string;
  value: unknown;
};

export class InMemoryIdentityStorageAdapter implements IdentityStorageAdapter {
  private users = new Map<string, UserRow>();
  private usersByEmail = new Map<string, string>();
  private usersByUsername = new Map<string, string>();
  private usersByReferralCode = new Map<string, string>();

  private userRoles = new Map<string, UserRoleRow>();
  private userLocales = new Map<string, UserLocaleRow>();
  private userSecurity = new Map<string, UserSecurityRow>();
  private trustScores = new Map<string, UserTrustScoreRow>();
  private kycStatuses = new Map<string, KycStatusRow>();

  private consentRecords: ConsentRecordRow[] = [];
  private referrals: ReferralRow[] = [];
  private auditLogs: AuditLogRow[] = [];
  private sessions = new Map<string, LoginSessionRow>();
  private idempotency: IdempotencyRecord[] = [];

  async findUserById(userId: string): Promise<UserRow | null> {
    return this.users.get(userId) || null;
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const id = this.usersByEmail.get(email);
    return id ? this.users.get(id) || null : null;
  }

  async findUserByUsername(username: string): Promise<UserRow | null> {
    const id = this.usersByUsername.get(username);
    return id ? this.users.get(id) || null : null;
  }

  async findUserByReferralCode(referralCode: string): Promise<UserRow | null> {
    const id = this.usersByReferralCode.get(referralCode);
    return id ? this.users.get(id) || null : null;
  }

  async insertUser(user: UserRow): Promise<void> {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user.id);
    this.usersByUsername.set(user.username, user.id);
    this.usersByReferralCode.set(user.referralCode, user.id);
  }

  async updateUser(user: UserRow): Promise<void> {
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user.id);
    this.usersByUsername.set(user.username, user.id);
    this.usersByReferralCode.set(user.referralCode, user.id);
  }

  async upsertUserRole(row: UserRoleRow): Promise<void> {
    this.userRoles.set(row.userId, row);
  }

  async getUserRole(userId: string): Promise<UserRoleRow | null> {
    return this.userRoles.get(userId) || null;
  }

  async upsertUserLocale(row: UserLocaleRow): Promise<void> {
    this.userLocales.set(row.userId, row);
  }

  async getUserLocale(userId: string): Promise<UserLocaleRow | null> {
    return this.userLocales.get(userId) || null;
  }

  async upsertUserSecurity(row: UserSecurityRow): Promise<void> {
    this.userSecurity.set(row.userId, row);
  }

  async getUserSecurity(userId: string): Promise<UserSecurityRow | null> {
    return this.userSecurity.get(userId) || null;
  }

  async upsertTrustScore(row: UserTrustScoreRow): Promise<void> {
    this.trustScores.set(row.userId, row);
  }

  async getTrustScore(userId: string): Promise<UserTrustScoreRow | null> {
    return this.trustScores.get(userId) || null;
  }

  async insertConsentRecord(row: ConsentRecordRow): Promise<void> {
    this.consentRecords.push(row);
  }

  async listConsentRecords(userId: string): Promise<ConsentRecordRow[]> {
    return this.consentRecords.filter((record) => record.userId === userId);
  }

  async insertReferral(row: ReferralRow): Promise<void> {
    this.referrals.push(row);
  }

  async getReferralByReferredUser(userId: string): Promise<ReferralRow | null> {
    return this.referrals.find((referral) => referral.referredUserId === userId) || null;
  }

  async upsertKycStatus(row: KycStatusRow): Promise<void> {
    this.kycStatuses.set(row.userId, row);
  }

  async getKycStatus(userId: string): Promise<KycStatusRow | null> {
    return this.kycStatuses.get(userId) || null;
  }

  async insertAuditLog(row: AuditLogRow): Promise<void> {
    this.auditLogs.push(row);
  }

  async listAuditLogs(userId: string): Promise<AuditLogRow[]> {
    return this.auditLogs.filter((log) => log.userId === userId);
  }

  async insertLoginSession(row: LoginSessionRow): Promise<void> {
    this.sessions.set(row.id, row);
  }

  async updateLoginSession(row: LoginSessionRow): Promise<void> {
    this.sessions.set(row.id, row);
  }

  async findLoginSessionById(sessionId: string): Promise<LoginSessionRow | null> {
    return this.sessions.get(sessionId) || null;
  }

  async revokeLoginSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    this.sessions.set(sessionId, {
      ...session,
      revokedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async getIdempotentResponse<TValue = unknown>(scope: string, key: string): Promise<TValue | null> {
    const record = this.idempotency.find((item) => item.scope === scope && item.key === key);
    return (record?.value as TValue) || null;
  }

  async setIdempotentResponse<TValue = unknown>(scope: string, key: string, value: TValue): Promise<void> {
    const index = this.idempotency.findIndex((item) => item.scope === scope && item.key === key);
    const next = { scope, key, value };
    if (index >= 0) {
      this.idempotency[index] = next;
      return;
    }
    this.idempotency.push(next);
  }
}
