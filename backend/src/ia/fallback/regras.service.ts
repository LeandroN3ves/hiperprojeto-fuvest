import { Injectable } from '@nestjs/common';

interface StatsTema {
  tema: string;
  acertos: number;
  erros: number;
  taxa_erro: number;
}

@Injectable()
export class FallbackRegrasService {

  // Sugestão baseada em estatísticas de desempenho
  gerarSugestao(temasFracos: StatsTema[]): string {
    if (temasFracos.length === 0) {
      return 'Ótimo trabalho! Seu desempenho está equilibrado. Continue praticando com provas variadas para manter a consistência.';
    }

    const pior = temasFracos[0];
    const taxaErroPercent = Math.round(pior.taxa_erro);

    if (taxaErroPercent >= 70) {
      return `Atenção: você está errando ${taxaErroPercent}% das questões de "${pior.tema}". Recomendo pausar outros temas e focar exclusivamente neste antes de avançar. Revise o conteúdo básico do zero.`;
    }

    if (taxaErroPercent >= 50) {
      return `O tema "${pior.tema}" precisa de reforço (${taxaErroPercent}% de erro). Faça uma prova focada neste tema com questões de dificuldade crescente.`;
    }

    const todosFragos = temasFracos.map((t) => `"${t.tema}"`).join(', ');
    return `Seus temas mais fracos são ${todosFragos}. Alterne entre eles nas próximas provas para melhorar de forma equilibrada.`;
  }

  // Resposta de chat baseada em palavras-chave
  responderChat(mensagem: string, contexto: { temasFracos: StatsTema[]; mediaAcertos: number }): string {
    const m = mensagem.toLowerCase();

    if (m.includes('fraco') || m.includes('erro') || m.includes('dificuldade')) {
      return this.gerarSugestao(contexto.temasFracos);
    }

    if (m.includes('prova') && (m.includes('criar') || m.includes('gerar') || m.includes('fazer'))) {
      if (contexto.temasFracos.length > 0) {
        return `Recomendo criar uma prova focada em "${contexto.temasFracos[0].tema}". Use a opção "Sugestão Inteligente" no menu de provas — ela já está configurada com os seus temas mais fracos.`;
      }
      return 'Acesse "Nova Prova" e configure os temas que deseja praticar. Para um desafio equilibrado, distribua 33% de cada dificuldade.';
    }

    if (m.includes('dica') || m.includes('estratégia') || m.includes('estrategia')) {
      const dicas = [
        'Estude em blocos de 25 minutos com pausas de 5 minutos (técnica Pomodoro).',
        'Priorize os temas com maior peso na Fuvest: Português e Matemática valem mais.',
        'Resolva provas antigas da Fuvest — o estilo das questões se repete ao longo dos anos.',
        'Não pule questões que você não sabe — tente eliminar alternativas e cheire o gabarito.',
        `Você está acertando ${Math.round(contexto.mediaAcertos)}% das questões. ${contexto.mediaAcertos >= 60 ? 'Bom ritmo! Continue.' : 'Foque nos conteúdos básicos antes de avançar.'}`,
      ];
      return dicas[Math.floor(Math.random() * dicas.length)];
    }

    if (m.includes('nota') || m.includes('pontuação') || m.includes('passar')) {
      return `Para passar na Fuvest, a nota de corte varia por curso. Geralmente é necessário acertar 60-75% na 1ª fase. Você está em ${Math.round(contexto.mediaAcertos)}% — ${contexto.mediaAcertos >= 60 ? 'na faixa competitiva.' : 'precisando melhorar antes da prova.'}`;
    }

    if (m.includes('matemática') || m.includes('matematica') || m.includes('exatas')) {
      return 'Para Matemática na Fuvest: foque em Funções, Geometria Plana, Progressões e Probabilidade. São os temas mais recorrentes. Resolva pelo menos 5 questões por dia.';
    }

    if (m.includes('português') || m.includes('portugues') || m.includes('redação') || m.includes('redacao')) {
      return 'Para Português: leia textos jornalísticos e literários diariamente. A Fuvest cobra muito interpretação de texto, figuras de linguagem e gramática contextualizada.';
    }

    if (m.includes('biologia') || m.includes('bio')) {
      return 'Biologia na Fuvest: genética, evolução e ecologia são os temas mais cobrados. Foque em resolver questões contextualizadas com situações do cotidiano.';
    }

    // Resposta genérica
    return `Entendi sua pergunta sobre "${mensagem.substring(0, 50)}". No momento, minha análise está baseada nas suas estatísticas: você acerta ${Math.round(contexto.mediaAcertos)}% das questões. ${contexto.temasFracos.length > 0 ? `Seu ponto mais fraco é "${contexto.temasFracos[0].tema}" — recomendo praticar mais nesse tema.` : 'Continue praticando regularmente para manter o ritmo!'}`;
  }
}
