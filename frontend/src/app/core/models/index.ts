export interface Usuario {
  id: string;
  nome: string;
  email: string;
  curso_id?: number;
}

export interface AuthResponse {
  access_token: string;
  user: Usuario;
}

export interface Questao {
  id: number;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  numero: number;
  total: number;
}

export interface ProvaGerada {
  prova_id: string;
  primeira_questao: Questao;
}

export interface RespostaQuestao {
  correta: boolean;
  resposta_correta: string;
  proxima_questao: Questao | null;
  finalizada: boolean;
}

export interface ResultadoProva {
  acertos: number;
  total: number;
  percentual: number;
  por_tema: { tema: string; acertos: number; erros: number; taxa_acerto: number }[];
  sugestao_ia?: string;
}

export interface StatsTema {
  tema: string;
  acertos: number;
  erros: number;
  taxa_acerto: number;
  taxa_erro: number;
}

export interface LeaderboardEntry {
  posicao: number;
  nome: string;
  acertos?: number;
  total_provas?: number;
  media_acertos?: number;
}

export interface Curso {
  id: number;
  nome: string;
  descricao?: string;
  temas: { tema: string }[];
}
