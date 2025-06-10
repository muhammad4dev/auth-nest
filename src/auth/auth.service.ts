import { EntityRepository, wrap } from "@mikro-orm/core";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/sqlite";
import {
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as crypto from "crypto";
import { CookieOptions, Request } from "express";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { RefreshToken } from "./entities/refresh-token.entity";
import { User } from "./entities/user.entity";

const bcrypt = require("bcryptjs");

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(User)
    private readonly usersRepository: EntityRepository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: EntityRepository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;

    const existingUser = await this.usersRepository.findOne({ email });
    if (existingUser) {
      throw new ConflictException("Email already in use.");
    }

    const user = new User();
    Object.assign(user, { email, password });

    try {
      await this.em.persistAndFlush(user);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to register user: ${error.message}`,
        error.stack
      );
      throw new InternalServerErrorException("Failed to register user.");
    }
  }

  async login(
    loginUserDto: LoginUserDto,
    req: Request
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const { email, password } = loginUserDto;
    const user = await this.usersRepository.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Revoke all previous sessions for the user if any
      // await this.revokeAllSessions(user.id);

      // Generate access and refresh tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.createAndStoreRefreshToken(user, req);

      return { user, accessToken, refreshToken };
    } else {
      throw new UnauthorizedException("Invalid credentials.");
    }
  }

  async logout(refreshTokenValue: string): Promise<void> {
    if (!refreshTokenValue) return;

    const hashedToken = crypto
      .createHash("sha256")
      .update(refreshTokenValue)
      .digest("hex");
    await this.refreshTokensRepository.nativeDelete({ token: hashedToken });
  }

  private generateAccessToken(user: User): string {
    const payload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload);
  }

  private async createAndStoreRefreshToken(
    user: User,
    req: Request
  ): Promise<string> {
    const refreshTokenSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET");
    const refreshTokenExpiresIn = "7d";

    const jti = crypto.randomBytes(16).toString("hex");
    const refreshTokenValue = this.jwtService.sign(
      { sub: user.id, jti },
      { secret: refreshTokenSecret, expiresIn: refreshTokenExpiresIn }
    );

    const hashedToken = crypto
      .createHash("sha256")
      .update(refreshTokenValue)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"] || "unknown";

    const newRefreshToken = new RefreshToken();
    Object.assign(newRefreshToken, {
      token: hashedToken,
      user,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await this.em.persistAndFlush(newRefreshToken);
    return refreshTokenValue;
  }

  async rotateRefreshToken(
    oldRefreshTokenValue: string,
    req: Request
  ): Promise<{ newAccessToken: string; newRefreshToken: string }> {
    if (!oldRefreshTokenValue) {
      throw new GoneException("Refresh token not found.");
    }

    let payload;
    const refreshTokenSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET");
    try {
      payload = this.jwtService.verify(oldRefreshTokenValue, {
        secret: refreshTokenSecret,
      });
    } catch (error) {
      this.logger.warn(`Invalid refresh token received: ${error.message}`);
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const hashedOldToken = crypto
      .createHash("sha256")
      .update(oldRefreshTokenValue)
      .digest("hex");
    const tokenRecord = await this.refreshTokensRepository.findOne(
      { token: hashedOldToken },
      { populate: ["user"] }
    );

    if (!tokenRecord) {
      this.logger.warn(
        `Attempted reuse of refresh token for user ID: ${payload.sub}`
      );
      await this.refreshTokensRepository.nativeDelete({
        user: { id: payload.sub },
      });
      throw new UnauthorizedException(
        "Refresh token reuse detected. Please log in again."
      );
    }

    // Update last used time on the existing token before removing
    wrap(tokenRecord).assign({ lastUsedAt: new Date() });
    await this.em.removeAndFlush(tokenRecord);

    const user = tokenRecord.user;
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.createAndStoreRefreshToken(user, req);

    return { newAccessToken, newRefreshToken };
  }

  async getSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokensRepository.find(
      { user: { id: userId } },
      { orderBy: { lastUsedAt: "DESC" } }
    );
  }

  async revokeSession(
    userId: string,
    sessionIdToRevoke: string
  ): Promise<void> {
    const session = await this.refreshTokensRepository.findOne({
      id: sessionIdToRevoke,
      user: { id: userId },
    });

    if (!session) {
      throw new NotFoundException(
        "Session not found or you do not have permission to revoke it."
      );
    }

    await this.em.removeAndFlush(session);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.refreshTokensRepository.nativeDelete({ user: { id: userId } });
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ id: userId });
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }
    return user;
  }

  getAccessCookieOptions(): CookieOptions {
    const isProduction = this.configService.get("NODE_ENV") === "production";
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    };
  }

  getRefreshCookieOptions(): CookieOptions {
    const isProduction = this.configService.get("NODE_ENV") === "production";
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/auth/refresh-token",
    };
  }
}
