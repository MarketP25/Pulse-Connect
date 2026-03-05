// Zero-Trust Authentication Client for Pulsco Admin Governance System
// Implements email-only login with one-time codes and 15-minute sessions

import { AdminRole, AdminRoleType, ADMIN_EMAILS, MAX_ADMIN_COUNT, AuthSession, OneTimeCode, AuditEvent } from '@pulsco/admin-shared-types';
import { createHash, randomBytes } from 'crypto';

export interface AuthConfig {
  apiBaseUrl: string;
  sessionDurationMinutes: number;
  codeExpirySeconds: number;
  maxRetries: number;
}

export interface LoginRequest {
  email: string;
  deviceFingerprint: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
  deviceFingerprint: string;
}

export interface AuthResponse {
  success: boolean;
  session?: AuthSession;
  error?: string;
  requiresCode?: boolean;
}

export class AdminAuthClient {
  private config: AuthConfig;
  private currentSession: AuthSession | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Initiate login process - validates email and triggers one-time code generation
   */
  async initiateLogin(request: LoginRequest): Promise<AuthResponse> {
    try {
      // Validate email is in allowed admin list
      const role = this.getAdminRoleByEmail(request.email);
      if (!role) {
        await this.auditEvent('admin-login', request.email, 'unknown', 'login-attempt', 'blocked', 'Email not in admin registry', request.deviceFingerprint);
        return { success: false, error: 'Unauthorized email address' };
      }

      // Check admin count limit
      const adminCount = await this.getActiveAdminCount();
      if (adminCount >= MAX_ADMIN_COUNT) {
        await this.auditEvent('admin-login', request.email, role, 'login-attempt', 'blocked', 'Admin count limit exceeded', request.deviceFingerprint);
        return { success: false, error: 'Maximum admin count reached' };
      }

      // Generate and send one-time code
      const codeResponse = await fetch(`${this.config.apiBaseUrl}/auth/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          deviceFingerprint: request.deviceFingerprint
        })
      });

      if (!codeResponse.ok) {
        await this.auditEvent('admin-login', request.email, role, 'code-generation', 'failure', 'API error', request.deviceFingerprint);
        return { success: false, error: 'Failed to generate authentication code' };
      }

      await this.auditEvent('admin-login', request.email, role, 'code-generation', 'success', undefined, request.deviceFingerprint);
      return { success: true, requiresCode: true };

    } catch (error) {
      console.error('Login initiation failed:', error);
      return { success: false, error: 'Authentication service unavailable' };
    }
  }

  /**
   * Verify one-time code and establish session
   */
  async verifyCode(request: VerifyCodeRequest): Promise<AuthResponse> {
    try {
      const role = this.getAdminRoleByEmail(request.email);
      if (!role) {
        return { success: false, error: 'Unauthorized email address' };
      }

      const verifyResponse = await fetch(`${this.config.apiBaseUrl}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          code: request.code,
          deviceFingerprint: request.deviceFingerprint
        })
      });

      if (!verifyResponse.ok) {
        await this.auditEvent('admin-login', request.email, role, 'code-verification', 'failure', 'Invalid code', request.deviceFingerprint);
        return { success: false, error: 'Invalid or expired code' };
      }

      const sessionData = await verifyResponse.json();
      const session: AuthSession = {
        id: sessionData.sessionId,
        adminId: sessionData.adminId,
        email: request.email,
        role: role,
        deviceFingerprint: request.deviceFingerprint,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.sessionDurationMinutes * 60 * 1000),
        isActive: true
      };

      this.currentSession = session;
      await this.auditEvent('admin-login', request.email, role, 'session-established', 'success', undefined, request.deviceFingerprint);
      
      return { success: true, session };

    } catch (error) {
      console.error('Code verification failed:', error);
      return { success: false, error: 'Authentication service unavailable' };
    }
  }

  /**
   * Get current active session
   */
  getCurrentSession(): AuthSession | null {
    if (!this.currentSession) return null;
    
    // Check if session is expired
    if (new Date() > this.currentSession.expiresAt) {
      this.currentSession = null;
      return null;
    }

    return this.currentSession;
  }

  /**
   * Logout and invalidate session
   */
  async logout(): Promise<void> {
    if (!this.currentSession) return;

    try {
      await fetch(`${this.config.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentSession.id}`
        }
      });

      await this.auditEvent('admin-logout', this.currentSession.email, this.currentSession.role, 'session-terminated', 'success', undefined, this.currentSession.deviceFingerprint);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      this.currentSession = null;
    }
  }

  /**
   * Check if current session is valid and not expired
   */
  isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session !== null && session.isActive;
  }

  /**
   * Validate current session in server/client contexts.
   * Falls back to in-memory session when remote validation is unavailable.
   */
  async validateSession(): Promise<AuthSession | null> {
    const localSession = this.getCurrentSession();
    if (localSession) {
      return localSession;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/session`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const sessionData = await response.json();
      if (!sessionData?.sessionId || !sessionData?.role || !sessionData?.email) {
        return null;
      }

      const session: AuthSession = {
        id: sessionData.sessionId,
        adminId: sessionData.adminId || sessionData.sessionId,
        email: sessionData.email,
        role: sessionData.role as AdminRoleType,
        deviceFingerprint: sessionData.deviceFingerprint || 'server',
        issuedAt: new Date(sessionData.issuedAt || Date.now()),
        expiresAt: new Date(sessionData.expiresAt || Date.now()),
        isActive: sessionData.isActive !== false
      };

      this.currentSession = session;
      return session;
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }

  /**
   * Get admin role by email address
   */
  private getAdminRoleByEmail(email: string): AdminRoleType | null {
    for (const [role, adminEmail] of Object.entries(ADMIN_EMAILS)) {
      if (adminEmail === email) {
        return role as AdminRoleType;
      }
    }
    return null;
  }

  /**
   * Get current active admin count from API
   */
  private async getActiveAdminCount(): Promise<number> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/admin-count`);
      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
    } catch (error) {
      console.error('Failed to get admin count:', error);
    }
    return 0;
  }

  /**
   * Generate device fingerprint for browser identification
   */
  static generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }

    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      timestamp: Date.now()
    };

    return createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate secure one-time code
   */
  static generateOneTimeCode(): string {
    const bytes = randomBytes(3);
    return bytes.toString('hex').toUpperCase();
  }

  /**
   * Audit authentication events
   */
  private async auditEvent(
    type: string,
    email: string,
    role: AdminRoleType | 'unknown',
    action: string,
    result: 'success' | 'failure' | 'blocked',
    reason?: string,
    deviceFingerprint?: string
  ): Promise<void> {
    try {
      const auditEvent: Partial<AuditEvent> = {
        type: type as any,
        adminEmail: email,
        adminRole: role as AdminRoleType,
        action,
        result,
        reason,
        deviceFingerprint: deviceFingerprint || 'unknown',
        timestamp: new Date()
      };

      await fetch(`${this.config.apiBaseUrl}/audit/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditEvent)
      });
    } catch (error) {
      console.error('Audit event failed:', error);
    }
  }
}

export default AdminAuthClient;
