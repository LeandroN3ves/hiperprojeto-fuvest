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
