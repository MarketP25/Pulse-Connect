import { generateVerificationToken } from "@/lib/utils/token";
import { hashPassword } from "@/lib/utils/password";
import { getRedisClient } from "@/lib/redis";
import { MAX_ADMINS } from "@/config/admin";
import { PermissionManager } from "@/lib/auth/PermissionManager";
import { UserRole, PermissionScope } from "@/lib/auth/types";

interface AdminUser {
  email: string;
  fullName: string;
  password: string;
}

// Helper function to check permissions
async function checkAdminPermission(
  role: UserRole,
  requiredPermission: PermissionScope
): Promise<void> {
  const permissionManager = new PermissionManager(role);
  if (!permissionManager.hasPermission(requiredPermission)) {
    throw new Error("Unauthorized: Insufficient permissions");
  }
}

export async function createAdminUser(userData: AdminUser, role: UserRole) {
  await checkAdminPermission(role, "admin:manage");

  const client = getRedisClient();

  // Check if max admins reached
  const adminCount = await client.get<string>("admin:count");
  if (adminCount && parseInt(adminCount) >= MAX_ADMINS) {
    throw new Error("Maximum number of admins reached");
  }

  // Check if email already exists
  const emailExists = await client.get<string>(`admin:email:${userData.email}`);
  if (emailExists) {
    const error = new Error(
      "An account with this email already exists"
    ) as Error & {
      code: string;
    };
    error.code = "EMAIL_ALREADY_EXISTS";
    throw error;
  }

  // Generate verification code
  const verificationCode = generateVerificationToken();

  // Hash password
  const hashedPassword = await hashPassword(userData.password);

  // Store user data with verification pending status
  const adminData = {
    email: userData.email,
    fullName: userData.fullName,
    password: hashedPassword,
    verified: "false",
    createdAt: Date.now().toString(),
  };

  // Store the data
  await client.set(
    `admin:pending:${verificationCode}`,
    JSON.stringify(adminData)
  );
  await client.set(`admin:email:${userData.email}`, verificationCode);
  await client.expire(`admin:pending:${verificationCode}`, 24 * 60 * 60); // 24 hours expiry
  await client.expire(`admin:email:${userData.email}`, 24 * 60 * 60);

  return { verificationCode };
}

export async function verifyAdminUser(verificationCode: string) {
  const client = getRedisClient();

  // Get pending admin data
  const pendingAdmin = await client.get<string>(
    `admin:pending:${verificationCode}`
  );
  if (!pendingAdmin) {
    throw new Error("Invalid or expired verification code");
  }

  const adminData = JSON.parse(pendingAdmin);

  // Check if max admins reached before confirming
  const adminCount = (await client.get<string>("admin:count")) || "0";
  if (parseInt(adminCount) >= MAX_ADMINS) {
    throw new Error("Maximum number of admins reached");
  }

  // Store confirmed admin data
  await client.hset(`admin:${adminData.email}`, {
    ...adminData,
    verified: "true",
    verifiedAt: Date.now().toString(),
  });

  // Increment admin count
  await client.incr("admin:count");

  // Clean up pending data
  await client.del(`admin:pending:${verificationCode}`);
  await client.del(`admin:email:${adminData.email}`);

  return { email: adminData.email };
}

export async function getAdminByEmail(email: string) {
  const client = getRedisClient();
  const adminData = await client.hgetall(`admin:${email}`);

  if (!adminData || Object.keys(adminData).length === 0) {
    return null;
  }

  return {
    ...adminData,
    verified: adminData.verified === "true",
  };
}

export class AdminService {
  /**
   * Generate a unique admin code
   */
  private static async generateUniqueCode(): Promise<string> {
    const code = nanoid(ADMIN_CODE_LENGTH).toUpperCase();
    const exists = await redis.exists(`${ADMIN_KEY_PREFIX}${code}`);

    if (exists) {
      return this.generateUniqueCode();
    }

    return code;
  }

  /**
   * Create a new admin code and send it via email
   */
  static async createAdminCode(email: string): Promise<string> {
    try {
      // Check current admin count
      const currentCount = (await redis.get<number>(ADMIN_COUNT_KEY)) || 0;

      if (currentCount >= ADMIN_MAX_COUNT) {
        throw new AppError(
          "Maximum number of admins reached",
          "MAX_ADMINS_REACHED",
          403,
          true
        );
      }

      // Generate unique code
      const adminCode = await this.generateUniqueCode();

      // Store admin details
      await redis.set(`${ADMIN_KEY_PREFIX}${adminCode}`, {
        email,
        createdAt: new Date().toISOString(),
        lastUsed: null,
      });

      // Increment admin count
      await redis.incr(ADMIN_COUNT_KEY);

      // Send email with admin code
      await sendEmail({
        to: email,
        subject: "Your Pulse Connect Admin Access Code",
        template: "admin-code",
        variables: {
          adminCode,
          validityPeriod: "∞ (Never expires)",
          maxUses: "∞ (Unlimited uses)",
        },
      });

      logger.info({ email }, "New admin code generated and sent");

      return adminCode;
    } catch (error) {
      logger.error({ error, email }, "Failed to create admin code");
      throw error;
    }
  }

  /**
   * Validate an admin code
   */
  static async validateCode(code: string): Promise<boolean> {
    try {
      const adminDetails = await redis.get(`${ADMIN_KEY_PREFIX}${code}`);

      if (!adminDetails) {
        return false;
      }

      // Update last used timestamp
      await redis.set(`${ADMIN_KEY_PREFIX}${code}`, {
        ...adminDetails,
        lastUsed: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logger.error({ error, code }, "Failed to validate admin code");
      return false;
    }
  }

  /**
   * List all admin codes
   */
  static async listAdminCodes(): Promise<
    Array<{
      code: string;
      email: string;
      createdAt: string;
      lastUsed: string | null;
    }>
  > {
    try {
      const keys = await redis.keys(`${ADMIN_KEY_PREFIX}*`);
      const adminCodes = await Promise.all(
        keys.map(async (key) => {
          const details = await redis.get(key);
          return {
            code: key.replace(ADMIN_KEY_PREFIX, ""),
            ...details,
          };
        })
      );

      return adminCodes;
    } catch (error) {
      logger.error({ error }, "Failed to list admin codes");
      throw error;
    }
  }

  /**
   * Revoke an admin code
   */
  static async revokeCode(code: string, role: UserRole): Promise<boolean> {
    await checkAdminPermission(role, "admin:manage");

    const exists = await redis.exists(`${ADMIN_KEY_PREFIX}${code}`);

    if (!exists) {
      return false;
    }

    await redis.del(`${ADMIN_KEY_PREFIX}${code}`);
    await redis.decr(ADMIN_COUNT_KEY);

    logger.info({ code }, "Admin code revoked");
    return true;
  }
}
