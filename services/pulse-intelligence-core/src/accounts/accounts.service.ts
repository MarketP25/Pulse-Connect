import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserStatus } from "./user.entity";
import { AccountHistory, AccountAction, ActorType } from "./account-history.entity";
import { HashChain } from "@pulsco/shared-lib";
import * as bcrypt from "bcrypt";
import { authenticator } from "otplib";
import { toDataURL } from "qrcode";

export interface CreateUserDto {
  email: string;
  phone?: string;
  region: string;
  policy_version: string;
  password?: string;
}

export interface ModifyUserDto {
  phone?: string;
  region?: string;
  policy_version: string;
}

export interface DeleteUserDto {
  reason_code: string;
  policy_version: string;
}

export interface RegisterUserDto {
  email: string;
  password;
  string;
  region: string;
  policy_version: string;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AccountHistory)
    private accountHistoryRepository: Repository<AccountHistory>,
    private readonly hashChain: HashChain
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email }
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    // Create user
    const user = this.userRepository.create({
      email: dto.email,
      password_hash: hashedPassword,
      phone: dto.phone,
      region: dto.region,
      status: UserStatus.ACTIVE
    });

    const savedUser = await this.userRepository.save(user);

    // Create account history entry
    await this.createAccountHistoryEntry(
      savedUser.id,
      AccountAction.CREATE,
      ActorType.SYSTEM,
      "USER_CREATED",
      dto.policy_version,
      "system-device"
    );

    return savedUser;
  }

  async register(dto: RegisterUserDto): Promise<User> {
    return this.createUser(dto);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }

  async generateTwoFactorSecret(user: User) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, "Pulsco", secret);

    await this.userRepository.update(user.id, { two_factor_secret: secret });

    return {
      secret,
      otpauthUrl
    };
  }

  async generateTwoFactorQrCode(otpauthUrl: string) {
    return toDataURL(otpauthUrl);
  }

  async enableTwoFactorAuth(user: User) {
    await this.userRepository.update(user.id, { two_factor_enabled: true });
  }

  isTwoFactorTokenValid(token: string, user: User) {
    return authenticator.verify({
      token,
      secret: user.two_factor_secret
    });
  }

  async modifyUser(userId: string, dto: ModifyUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Update user fields
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.region !== undefined) user.region = dto.region;

    const savedUser = await this.userRepository.save(user);

    // Create account history entry
    await this.createAccountHistoryEntry(
      savedUser.id,
      AccountAction.MODIFY,
      ActorType.FOUNDER,
      "USER_MODIFIED",
      dto.policy_version,
      "founder-device" // Would come from PC365 headers
    );

    return savedUser;
  }

  async deactivateUser(userId: string, dto: DeleteUserDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.status = UserStatus.DEACTIVATED;
    await this.userRepository.save(user);

    // Create account history entry
    await this.createAccountHistoryEntry(
      userId,
      AccountAction.DEACTIVATE,
      ActorType.FOUNDER,
      dto.reason_code,
      dto.policy_version,
      "founder-device" // Would come from PC365 headers
    );
  }

  async deleteUser(userId: string, dto: DeleteUserDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.status = UserStatus.DELETED;
    await this.userRepository.save(user);

    // Create account history entry
    await this.createAccountHistoryEntry(
      userId,
      AccountAction.DELETE,
      ActorType.FOUNDER,
      dto.reason_code,
      dto.policy_version,
      "founder-device" // Would come from PC365 headers
    );
  }

  async getUserHistory(userId: string): Promise<AccountHistory[]> {
    return this.accountHistoryRepository.find({
      where: { user_id: userId },
      order: { created_at: "DESC" }
    });
  }

  private async createAccountHistoryEntry(
    userId: string,
    action: AccountAction,
    actorType: ActorType,
    reasonCode: string,
    policyVersion: string,
    deviceFingerprint: string
  ): Promise<void> {
    // Get the last history entry for hash chaining
    const lastEntry = await this.accountHistoryRepository.findOne({
      order: { created_at: "DESC" }
    });

    const prevHash = lastEntry?.curr_hash || "";

    const historyEntry = this.accountHistoryRepository.create({
      user_id: userId,
      action,
      actor_type: actorType,
      reason_code: reasonCode,
      policy_version: policyVersion,
      device_fingerprint: deviceFingerprint,
      prev_hash: prevHash
    });

    // Generate current hash
    historyEntry.curr_hash = this.hashChain.generateHash(
      prevHash +
        JSON.stringify({
          user_id: historyEntry.user_id,
          action: historyEntry.action,
          actor_type: historyEntry.actor_type,
          reason_code: historyEntry.reason_code,
          policy_version: historyEntry.policy_version,
          device_fingerprint: historyEntry.device_fingerprint,
          created_at: historyEntry.created_at
        })
    );

    await this.accountHistoryRepository.save(historyEntry);
  }
}
