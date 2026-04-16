import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FuvestImporterService } from '../questoes/fuvest-importer.service';
import * as path from 'path';

async function runImport() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const importer = app.get(FuvestImporterService);

  const baseDir = 'c:\\Users\\leand\\OneDrive\\Desktop\\Leandro\\Projetos\\HiperprojetoFuvest\\ProvasFuvest';
  
  const filesToTest = [
    'fuvest2024_primeira_fase_prova_V.pdf',
    'fuvest2024_segunda_fase_prova_1dia.pdf',
    'fuvest2023_primeira_fase_prova_V.pdf',
    'fuv2018_2fase_dia1.pdf',
    'fuvest_2010_1fase_prova_V.pdf',
  ];

  console.log('--- INICIANDO TESTE DE IMPORTAÇÃO (5 PROVAS) ---');

  for (const file of filesToTest) {
    const fullPath = path.join(baseDir, file);
    try {
      console.log(`\nImportando: ${file}...`);
      const result = await importer.importarArquivo(fullPath);
      console.log(`Sucesso! Questões importadas: ${result.questoesTotais}`);
    } catch (error) {
      console.error(`Erro ao importar ${file}:`, error.message);
    }
  }

  console.log('\n--- TESTE CONCLUÍDO ---');
  await app.close();
}

runImport().catch((err) => {
  console.error('Erro fatal no script de importação:', err);
  process.exit(1);
});
