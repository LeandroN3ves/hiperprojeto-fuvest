import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';

// Entidades
import { Curso } from './database/entities/curso.entity';
import { CursoTema } from './database/entities/curso-tema.entity';
import { Usuario } from './database/entities/usuario.entity';
import { Questao } from './database/entities/questao.entity';
import { Prova } from './database/entities/prova.entity';
import { Resposta } from './database/entities/resposta.entity';
import { Estatistica } from './database/entities/estatistica.entity';
import { LeaderboardSemanal } from './database/entities/leaderboard-semanal.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { QuestoesModule } from './questoes/questoes.module';
import { CursosModule } from './cursos/cursos.module';
import { ProvasModule } from './provas/provas.module';
import { EstatisticasModule } from './estatisticas/estatisticas.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { IaModule } from './ia/ia.module';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [Curso, CursoTema, Usuario, Questao, Prova, Resposta, Estatistica, LeaderboardSemanal],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production',
        extra: process.env.NODE_ENV === 'production' ? {
          ssl: {
            rejectUnauthorized: false,
          },
        } : {},
      }),
    }),
    AuthModule,
    QuestoesModule,
    CursosModule,
    ProvasModule,
    EstatisticasModule,
    LeaderboardModule,
    IaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
