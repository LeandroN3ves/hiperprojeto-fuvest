import * as dns from 'node:dns';
// Força o Node.js a preferir IPv4 sobre IPv6. 
// Essencial para evitar erros ENETUNREACH em ambientes como Railway conectando ao Supabase.
dns.setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api');

    // Configuração de CORS robusta
    app.enableCors({
      origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || 
            origin.includes('vercel.app') || 
            origin.includes('localhost') ||
            origin.includes('up.railway.app') ||
            origin === process.env.FRONTEND_URL) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    const port = process.env.PORT || 3000;
    // Escuta em 0.0.0.0 para garantir acessibilidade no container
    await app.listen(port, '0.0.0.0');
    
    console.log(`🚀 Backend inicializado com sucesso na porta: ${port}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Banco de Dados Host: ${process.env.SUPABASE_HOST ? 'SUPABASE_HOST detectado' : 'Usando DB_HOST'}`);
    console.log(`👤 Usuário Detectado: ${process.env.SUPABASE_USER ? process.env.SUPABASE_USER.substring(0, 12) + '...' : 'Nenhum SUPABASE_USER'}`);
    console.log(`🔗 URL da API: ${process.env.RAILWAY_STATIC_URL || 'localhost'}`);
  } catch (error) {
    console.error('❌ ERRO CRÍTICO NA INICIALIZAÇÃO:', error);
    process.exit(1);
  }
}
bootstrap();
