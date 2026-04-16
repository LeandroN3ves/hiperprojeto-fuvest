/**
 * Script de teste: importa 1 prova (Fuvest 2024 1ª fase) em modo dry-run.
 * Não salva no banco, apenas gera o JSON para validação.
 *
 * Uso: npx ts-node src/scripts/test-extraction.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FuvestImporterService } from '../questoes/fuvest-importer.service';
import * as path from 'path';

async function run() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  TESTE DE EXTRAÇÃO — Fuvest 2024 (1ª Fase)      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Criar contexto NestJS (sem HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const importer = app.get(FuvestImporterService);

  const baseDir = path.resolve(
    __dirname, '..', '..', '..', 'ProvasFuvest',
  );

  const testFile = path.join(baseDir, 'fuvest2024_primeira_fase_prova_V.pdf');

  console.log(`Arquivo: ${testFile}\n`);

  try {
    const result = await importer.importarArquivo(testFile, 2024, true); // dry-run = true

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log(`║  RESULTADO: ${result.questoesTotais} questões extraídas`);
    console.log(`║  Erros: ${result.erros}`);
    console.log('╚══════════════════════════════════════════════════╝');

    if (result.questoesTotais > 0) {
      console.log('\n✅ Verifique o arquivo gerado em: backend/tmp/fuvest2024_primeira_fase_prova_V_extraido.json');
      console.log('   Confira se as questões têm enunciado, alternativas, resposta correta e tema.');
    } else {
      console.log('\n⚠️  Nenhuma questão extraída. Verifique se o Ollama está respondendo corretamente.');
    }
  } catch (error) {
    console.error('\n❌ Erro durante extração:', error.message);
    console.error('\nDicas:');
    console.error('  1. Verifique se o Ollama está rodando: docker exec hiperprojetofuvest-ollama-1 ollama list');
    console.error('  2. Verifique se o modelo llama3 está disponível');
    console.error('  3. O Ollama pode demorar na primeira chamada (carregando modelo)');
  }

  await app.close();
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
