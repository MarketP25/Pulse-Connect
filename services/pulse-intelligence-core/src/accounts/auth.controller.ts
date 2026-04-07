import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Get,
  Res
} from "@nestjs/common";
import { AccountsService, RegisterUserDto } from "./accounts.service";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Response } from "express";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly authService: AuthService
  ) {}

  @Post("register")
  async register(@Body() dto: RegisterUserDto) {
    return this.accountsService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get("2fa/generate")
  async generateTwoFactor(@Request() req, @Res() res: Response) {
    const { otpauthUrl } = await this.accountsService.generateTwoFactorSecret(req.user);
    const qrCode = await this.accountsService.generateTwoFactorQrCode(otpauthUrl);
    res.setHeader("Content-Type", "image/png");
    res.send(qrCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post("2fa/enable")
  async enableTwoFactor(@Request() req, @Body() body) {
    const isTokenValid = this.accountsService.isTwoFactorTokenValid(body.token, req.user);
    if (!isTokenValid) {
      throw new UnauthorizedException("Invalid two-factor token");
    }
    await this.accountsService.enableTwoFactorAuth(req.user);
    return { message: "Two-factor authentication enabled successfully" };
  }
}
