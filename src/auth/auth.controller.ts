import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { GetUser } from "./decorators/get-user.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { User } from "./entities/user.entity";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.authService.register(createUserDto);
    return {
      message: "User registered successfully.",
      user: { id: user.id, email: user.email },
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(
      loginUserDto,
      request
    );

    response.cookie(
      "accessToken",
      accessToken,
      this.authService.getAccessCookieOptions()
    );
    response.cookie(
      "refreshToken",
      refreshToken,
      this.authService.getRefreshCookieOptions()
    );

    return {
      message: "Logged in successfully.",
      user: { id: user.id, email: user.email },
    };
  }

  @Post("refresh-token")
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const oldRefreshToken = request.cookies.refreshToken;
    const { newAccessToken, newRefreshToken } =
      await this.authService.rotateRefreshToken(oldRefreshToken, request);

    response.cookie(
      "accessToken",
      newAccessToken,
      this.authService.getAccessCookieOptions()
    );
    response.cookie(
      "refreshToken",
      newRefreshToken,
      this.authService.getRefreshCookieOptions()
    );

    return { message: "Tokens refreshed successfully." };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const refreshToken = request.cookies.refreshToken;
    await this.authService.logout(refreshToken);

    response.clearCookie(
      "accessToken",
      this.authService.getAccessCookieOptions()
    );
    response.clearCookie(
      "refreshToken",
      this.authService.getRefreshCookieOptions()
    );

    return { message: "Logged out successfully." };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: User) {
    return user;
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  async getSessions(@GetUser() user: User) {
    const sessions = await this.authService.getSessions(user.id);
    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
    }));
  }

  @Delete("sessions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    await this.authService.revokeSession(user.id, id);
  }

  @Delete("sessions")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async revokeAllSessions(@GetUser() user: User) {
    await this.authService.revokeAllSessions(user.id);
    return { message: "All sessions revoked successfully." };
  }
}
