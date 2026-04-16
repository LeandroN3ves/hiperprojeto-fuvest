# STEP 03 — Módulo de Autenticação (JWT + Google OAuth)

## Contexto
Passo 3 da Plataforma Fuvest. Banco conectado, entidades criadas (Step 02).
Agora implementar autenticação completa: registro, login com JWT e Google OAuth.

## Regras
- Senhas criptografadas com `bcrypt` (saltRounds: 12)
- Token JWT com expiração de 7 dias
- Google OAuth via Passport.js (implementar depois do JWT estar funcionando)
- Toda rota protegida usa `@UseGuards(JwtAuthGuard)`
- O guard injeta o usuário via `@GetUser()` decorator customizado

---

## Tarefa 1 — Criar `src/auth/dto/register.dto.ts`

```typescript
import { IsEmail, IsNotEmpty, IsOptional, IsNumber, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  senha: string;

  @IsOptional()
  @IsNumber()
  curso_id?: number;
}
```

---

## Tarefa 2 — Criar `src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  senha: string;
}
```

---

## Tarefa 3 — Criar `src/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../database/entities/usuario.entity';

export interface JwtPayload {
  sub: string;  // usuario.id
  email: string;
  curso_id: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { id: payload.sub } });
    if (!usuario) throw new UnauthorizedException('Token inválido');
    return usuario;
  }
}
```

---

## Tarefa 4 — Criar `src/auth/strategies/google.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('google.clientId'),
      clientSecret: configService.get('google.clientSecret'),
      callbackURL: configService.get('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      nome: name.givenName + ' ' + name.familyName,
      provider: 'google',
    };
    done(null, user);
  }
}
```

---

## Tarefa 5 — Criar `src/auth/guards/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

---

## Tarefa 6 — Criar `src/common/decorators/get-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Usuario } from '../../database/entities/usuario.entity';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Usuario => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

## Tarefa 7 — Criar `src/auth/auth.service.ts`

```typescript
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../database/entities/usuario.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existe = await this.usuarioRepo.findOne({ where: { email: dto.email } });
    if (existe) throw new ConflictException('Email já cadastrado');

    const senhaHash = await bcrypt.hash(dto.senha, 12);

    const usuario = this.usuarioRepo.create({
      nome: dto.nome,
      email: dto.email,
      senha: senhaHash,
      provider: 'local',
      curso_id: dto.curso_id,
    });

    const salvo = await this.usuarioRepo.save(usuario);
    return this.gerarToken(salvo);
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'nome', 'email', 'senha', 'curso_id', 'provider'],
    });

    if (!usuario || !usuario.senha) throw new UnauthorizedException('Credenciais inválidas');

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha);
    if (!senhaValida) throw new UnauthorizedException('Credenciais inválidas');

    return this.gerarToken(usuario);
  }

  async loginOuCriarGoogle(googleUser: { email: string; nome: string; provider: string }) {
    let usuario = await this.usuarioRepo.findOne({ where: { email: googleUser.email } });

    if (!usuario) {
      usuario = this.usuarioRepo.create({
        nome: googleUser.nome,
        email: googleUser.email,
        provider: 'google',
      });
      usuario = await this.usuarioRepo.save(usuario);
    }

    return this.gerarToken(usuario);
  }

  private gerarToken(usuario: Usuario) {
    const payload = { sub: usuario.id, email: usuario.email, curso_id: usuario.curso_id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        curso_id: usuario.curso_id,
      },
    };
  }
}
```

---

## Tarefa 8 — Criar `src/auth/auth.controller.ts`

```typescript
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
  async googleCallback(@Req() req, @Res() res) {
    const result = await this.authService.loginOuCriarGoogle(req.user);
    const frontendUrl = this.configService.get<string>('frontendUrl');
    // Redireciona para o frontend com o token na URL
    res.redirect(`${frontendUrl}/auth/google/callback?token=${result.access_token}`);
  }

  // Rota para verificar token (útil para o frontend)
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req) {
    return req.user;
  }
}
```

---

## Tarefa 9 — Criar `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { Usuario } from '../database/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
```

---

## Tarefa 10 — Atualizar `src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT || 3000);
  console.log(`Backend rodando em: http://localhost:${process.env.PORT || 3000}`);
}
bootstrap();
```

---

## Tarefa 11 — Adicionar AuthModule no AppModule

No `app.module.ts`, importar `AuthModule`:
```typescript
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // ... configs anteriores ...
    AuthModule,
  ],
})
export class AppModule {}
```

---

## Endpoints gerados neste passo

| Método | Rota | Proteção | Descrição |
|--------|------|----------|-----------|
| POST | `/api/auth/register` | Pública | Cadastro com email/senha |
| POST | `/api/auth/login` | Pública | Login com email/senha |
| GET | `/api/auth/google` | Pública | Inicia OAuth Google |
| GET | `/api/auth/google/callback` | Pública | Callback OAuth Google |
| GET | `/api/auth/me` | JWT | Retorna usuário logado |

---

## Teste manual (curl)

```bash
# Registro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Leandro","email":"leandro@test.com","senha":"123456","curso_id":1}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leandro@test.com","senha":"123456"}'

# Verificar token (substitua TOKEN pelo access_token retornado)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## Resultado esperado ao final deste passo
- [ ] `POST /api/auth/register` retorna `access_token` e `user`
- [ ] `POST /api/auth/login` retorna `access_token` e `user`
- [ ] `GET /api/auth/me` com token válido retorna dados do usuário
- [ ] `GET /api/auth/me` sem token retorna 401
- [ ] Google OAuth redireciona corretamente (testar no browser)

## Próximo passo
`STEP_04_QUESTOES_CURSOS.md` — Módulo de Questões e Cursos
