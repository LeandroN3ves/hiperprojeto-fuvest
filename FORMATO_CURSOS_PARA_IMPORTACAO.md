# 📋 Formato de Cursos para Importação — HiperprojetoFuvest

## Objetivo

Criar uma listagem padronizada de cursos e seus temas principais de relevância (focados no peso das provas de 2ª fase ou áreas de conhecimento exigidas) no formato JSON, para que possam ser facilmente importados para o banco de dados do sistema PostgreSQL.

---

## Formato do Arquivo

- **Tipo**: JSON (`.json`)
- **Encoding**: UTF-8
- **Estrutura**: Um **array** de objetos, onde cada objeto é um curso e seus temas.
- **Nomeação sugerida**: `cursos_fuvest.json`

---

## Estrutura de Cada Curso

```json
[
  {
    "nome": "Medicina",
    "descricao": "Curso focado nas ciências biológicas e da saúde. Alta relevância para Biologia, Química e Física.",
    "temas": [
      "Biologia - Ecologia",
      "Biologia - Fisiologia",
      "Química - Orgânica",
      "Química - Físico-Química",
      "Física - Termodinâmica",
      "Português - Interpretação"
    ]
  }
]
```

---

## Detalhamento de Cada Campo

### `nome` (obrigatório)
- **Tipo**: `string`
- **O que incluir**: O nome oficial ou popular do curso. 
- **Exemplo**: `"Engenharia de Computação"`, `"Direito"`, `"Arquitetura e Urbanismo"`.
- **Validação**: O nome deve ser único para não causar duplicatas.

### `descricao` (obrigatório)
- **Tipo**: `string`
- **O que incluir**: Uma breve explicação sobre o curso e quais as áreas de maior afinidade ou disciplinas com maior peso para o exame de 2ª fase e a futura grade curricular.
- **Tamanho**: O ideal é manter entre 1 e 3 frases curtas.

### `temas` (obrigatório)
- **Tipo**: Array de `string`
- **O que incluir**: A lista exata dos nomes dos temas que são mais relevantes para aquele curso. Quando o sistema for gerar dicas, direcionar estatísticas ou montar os *simulados/provas semanais* automáticos de maior concorrência desse curso, ele buscará primeiramente na base de dados das questões que pertencerem a esses temas indicados no array.
- **Formato**: Eles devem idealmente coincidir com os mesmos temas cadastrados no JSON das questões (ex: `"Física - Mecânica"`, `"Matemática - Geometria Analítica"`, `"História - Brasil Colônia"`, etc.).
- **Recomendação**: Use de 5 a 15 temas essenciais para cada curso.

---

## Exemplo Completo de 1 Arquivo com Múltiplos Cursos

```json
[
  {
    "nome": "Direito",
    "descricao": "Exige forte leitura crítica, argumentação, história e geopolítica ao longo de toda graduação.",
    "temas": [
      "História - Brasil República",
      "História - Moderna",
      "Geografia - Geopolítica",
      "Português - Interpretação",
      "Português - Gramática",
      "Filosofia",
      "Sociologia"
    ]
  },
  {
    "nome": "Engenharia Civil",
    "descricao": "Domínio lógico-matemático e física estrutural para projeção de infraestruturas.",
    "temas": [
      "Matemática - Geometria",
      "Matemática - Álgebra",
      "Física - Mecânica",
      "Física - Eletromagnetismo",
      "Química - Inorgânica"
    ]
  }
]
```

---

## Validações — O que CAUSARÁ ERRO na importação

| Erro | O que vai acontecer |
|------|---------------|
| `nome` repetido ou vazio | ❌ Curso ignorado (para evitar crash com unique index) |
| `temas` não for um array | ❌ Curso ignorado |
| `temas` com um tema vazio na string | ⚠️ Serão removidos os temas vazios, e salva o resto |
| JSON inválido (sintaxe quebrada) | ❌ Arquivo inteiro rejeitado pelo importador |

---

## O Propósito Real dos Cursos na Plataforma

Quando gerarmos essas rotas de curso e associarmos as entidades no banco de dados (`curso_temas`), estaremos alimentando o **Core da Gamificação e Preparo do vestibular**:
1. **Seleção Inicial**: Os alunos escolhem seu "curso alvo" quando fazem a conta;
2. **Provas Dinâmicas**: As provas semanais automáticas usarão os temas dessa lista para montar um desafio específico e cirúrgico para a carreira da pessoa.
3. **Leaderboards Diferenciados**: Haverá listas de melhores estudantes ranqueados competindo exclusivamente contra quem quer o mesmo curso que eles (trazendo a realidade da Fuvest: a concorrência focada para as mesas limitadas da carreira).

## Após Gerar o JSON

Quando você conseguir gerar o `.json` (através do Claude, ChatGPT, Gemini, etc.) listando todos os cursos da Fuvest (ou os principais), basta seguir o que fizemos pelas questões da prova: você avisa e nós estruturamos o endpoint para injetá-los no banco em `curso` e `curso_temas`.
