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
      secretOrKey: configService.get<string>('jwt.secret') || 'default',
    });
  }

  async validate(payload: JwtPayload): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { id: payload.sub } });
    if (!usuario) throw new UnauthorizedException('Token inválido');
    return usuario;
  }
}
