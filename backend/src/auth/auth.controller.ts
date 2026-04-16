import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Redireciona para Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const result = await this.authService.loginOuCriarGoogle(req.user);
    const frontendUrl = this.configService.get<string>('frontendUrl');
    // Redireciona para o frontend com o token na URL
    res.redirect(`${frontendUrl}/auth/google/callback?token=${result.access_token}`);
  }

  // Rota para verificar token (útil para o frontend)
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any) {
    return req.user;
  }
}
