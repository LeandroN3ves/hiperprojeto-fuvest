# 📋 Formato de Questões para Importação — HiperprojetoFuvest

## Objetivo

Extrair questões das provas da Fuvest (2010–2026) e gerar arquivos JSON que serão importados diretamente no banco de dados PostgreSQL da plataforma.

---

## Formato do Arquivo

- **Tipo**: JSON (`.json`)
- **Encoding**: UTF-8
- **Estrutura**: Um **array** de objetos, onde cada objeto é uma questão
- **Nomeação sugerida**: `fuvest_YYYY_fase_N.json` (ex: `fuvest_2024_fase_1.json`)

---

## Estrutura de Cada Questão

```json
{
  "enunciado": "Texto completo do enunciado da questão, incluindo contextos, citações e referências que aparecem antes das alternativas.",
  "alternativas": [
    { "letra": "A", "texto": "Texto da alternativa A" },
    { "letra": "B", "texto": "Texto da alternativa B" },
    { "letra": "C", "texto": "Texto da alternativa C" },
    { "letra": "D", "texto": "Texto da alternativa D" },
    { "letra": "E", "texto": "Texto da alternativa E" }
  ],
  "resposta_correta": "B",
  "tema": "Biologia - Ecologia",
  "categoria": "Biologicas",
  "ano_fuvest": 2024,
  "explicacao": "Breve explicação de por que a alternativa B é correta."
}
```

---

## Detalhamento de Cada Campo

### `enunciado` (obrigatório)
- **Tipo**: `string` (texto longo)
- **O que incluir**: Todo o texto que antecede as alternativas — incluindo contextos, textos de apoio, citações, dados de tabelas/gráficos descritos textualmente
- **O que NÃO incluir**: As alternativas em si (elas vão no campo separado)
- **Tip**: Se houver imagem no enunciado que não pode ser descrita, adicionar `[IMAGEM]` como placeholder

### `alternativas` (obrigatório)
- **Tipo**: Array de objetos `{ "letra": string, "texto": string }`
- **SEMPRE 5 alternativas**: A, B, C, D, E
- **Letras em MAIÚSCULO**: `"A"`, `"B"`, `"C"`, `"D"`, `"E"`
- **Para questões de 1ª Fase**: extrair as alternativas exatamente como aparecem na prova
- **Para questões de 2ª Fase (dissertativas)**: criar 5 alternativas plausíveis baseadas na resposta correta. As incorretas devem ser distratores realistas

### `resposta_correta` (obrigatório)
- **Tipo**: `string` — apenas a LETRA: `"A"`, `"B"`, `"C"`, `"D"` ou `"E"`
- **MAIÚSCULA**
- **Fonte**: usar o gabarito oficial quando disponível

### `tema` (obrigatório)
- **Tipo**: `string`
- **Formato**: `"Área - Subárea"` (granular)
- **Exemplos válidos**:

| Tema | Uso |
|------|-----|
| `Matemática - Geometria Analítica` | Questão de geometria analítica |
| `Matemática - Funções` | Funções e gráficos |
| `Matemática - Probabilidade` | Probabilidade e combinatória |
| `Física - Mecânica` | Leis de Newton, cinemática |
| `Física - Termodinâmica` | Calor, temperatura, gases |
| `Física - Eletromagnetismo` | Circuitos, campo elétrico |
| `Química - Orgânica` | Química orgânica |
| `Química - Estequiometria` | Cálculos estequiométricos |
| `Química - Físico-Química` | Equilíbrio, termoquímica |
| `Biologia - Genética` | Herança, DNA, genes |
| `Biologia - Ecologia` | Ecossistemas, cadeias alimentares |
| `Biologia - Citologia` | Célula, organelas |
| `Biologia - Evolução` | Seleção natural, especiação |
| `Biologia - Fisiologia` | Sistemas do corpo humano |
| `História - Brasil Colonial` | Período colonial brasileiro |
| `História - Brasil Império` | Período imperial |
| `História - Brasil República` | República Velha a contemporâneo |
| `História - Antiguidade` | Grécia, Roma |
| `História - Medieval` | Feudalismo, cruzadas |
| `História - Moderna` | Absolutismo, Iluminismo |
| `História - Contemporânea` | Revoluções, guerras mundiais |
| `Geografia - Geopolítica` | Conflitos, relações internacionais |
| `Geografia - Climatologia` | Climas, aquecimento global |
| `Geografia - Urbanização` | Cidades, favelização |
| `Geografia - Cartografia` | Mapas, projeções |
| `Português - Gramática` | Sintaxe, morfologia |
| `Português - Interpretação` | Compreensão de texto |
| `Português - Literatura` | Obras literárias, autores |
| `Inglês - Interpretação` | Compreensão de texto em inglês |
| `Filosofia` | Questões de filosofia |
| `Sociologia` | Questões de sociologia |

### `categoria` (obrigatório)
- **Tipo**: `string`
- **Valores permitidos** (EXATAMENTE um destes):
  - `"Exatas"` → Matemática, Física, Química
  - `"Humanas"` → História, Geografia, Português, Literatura, Filosofia, Sociologia, Inglês
  - `"Biologicas"` → Biologia

### `ano_fuvest` (obrigatório)
- **Tipo**: `number` (inteiro)
- **Exemplo**: `2024`
- **Atenção**: O ano da Fuvest geralmente é o ano de aplicação (ex: Fuvest 2024 foi aplicada em nov/2023 para ingressar em 2024)

### `explicacao` (opcional, mas recomendado)
- **Tipo**: `string` ou `null`
- **O que incluir**: 1-3 frases explicando por que a resposta correta é a certa
- **Se não souber**: pode ser `null`

---

## Exemplo Completo de 1 Arquivo

```json
[
  {
    "enunciado": "Considere as afirmações sobre o processo de fotossíntese:\nI. Ocorre em todos os seres vivos.\nII. Requer luz solar como fonte de energia.\nIII. Produz oxigênio como subproduto.\n\nEstá correto o que se afirma em:",
    "alternativas": [
      { "letra": "A", "texto": "I, apenas." },
      { "letra": "B", "texto": "II, apenas." },
      { "letra": "C", "texto": "I e II, apenas." },
      { "letra": "D", "texto": "II e III, apenas." },
      { "letra": "E", "texto": "I, II e III." }
    ],
    "resposta_correta": "D",
    "tema": "Biologia - Citologia",
    "categoria": "Biologicas",
    "ano_fuvest": 2024,
    "explicacao": "A fotossíntese não ocorre em todos os seres vivos (apenas em autótrofos), requer luz e produz O2, portanto II e III estão corretas."
  },
  {
    "enunciado": "Um corpo de massa 5 kg é abandonado do repouso no topo de um plano inclinado de 30° com a horizontal, sem atrito. Considere g = 10 m/s². Qual a aceleração do corpo ao longo do plano?",
    "alternativas": [
      { "letra": "A", "texto": "2,5 m/s²" },
      { "letra": "B", "texto": "5,0 m/s²" },
      { "letra": "C", "texto": "7,5 m/s²" },
      { "letra": "D", "texto": "8,7 m/s²" },
      { "letra": "E", "texto": "10,0 m/s²" }
    ],
    "resposta_correta": "B",
    "tema": "Física - Mecânica",
    "categoria": "Exatas",
    "ano_fuvest": 2024,
    "explicacao": "a = g·sen(30°) = 10·0,5 = 5,0 m/s²."
  }
]
```

---

## Regras para Questões da 2ª Fase (Dissertativas)

As provas de 2ª fase são **dissertativas** (sem alternativas). Para adaptar ao formato:

1. **Leia a questão e a resposta esperada**
2. **Crie a alternativa correta** baseada na resposta oficial
3. **Crie 4 distratores plausíveis** — erros comuns que alunos cometem:
   - Inversão de conceitos
   - Cálculo parcial correto mas conclusão errada
   - Confusão com temas adjacentes
   - Generalização incorreta
4. **Distribua aleatoriamente** a posição da resposta correta (não sempre A)

---

## Validações — O que CAUSA ERRO na importação

| Erro | O que acontece |
|------|---------------|
| `resposta_correta` fora de A-E | ❌ Questão ignorada |
| Menos de 2 alternativas | ❌ Questão ignorada |
| `alternativas` não é um array | ❌ Questão ignorada |
| `enunciado` vazio | ❌ Questão ignorada |
| `tema` vazio | ⚠️ Aceita, mas ficará como `null` |
| `categoria` fora dos 3 valores | ⚠️ Será tratada como `"Exatas"` |
| JSON inválido (sintaxe) | ❌ Arquivo inteiro rejeitado |

---

## Organização dos Arquivos

Coloque todos os JSONs gerados na mesma pasta. Estrutura sugerida:

```
ProvasFuvest/
├── fuvest_2010_fase_1.json
├── fuvest_2010_fase_2_dia1.json
├── fuvest_2010_fase_2_dia2.json
├── fuvest_2011_fase_1.json
├── ...
├── fuvest_2026_fase_1.json
└── (PDFs originais continuam aqui)
```

---

## Quantidade Esperada de Questões

| Tipo de Prova | Questões por prova |
|---------------|-------------------|
| 1ª Fase (objetiva) | ~90 questões |
| 2ª Fase Dia 1 (Português/Redação) | ~10 questões (converter para múltipla escolha) |
| 2ª Fase Dia 2 (Específicas) | ~12-16 questões (converter para múltipla escolha) |
| 2ª Fase Dia 3 (até 2018) | ~12-16 questões (converter para múltipla escolha) |

**Total estimado**: ~1.500-2.000 questões de toda a coleção (2010-2026).

---

## Após Gerar os JSONs

Quando você tiver os arquivos prontos, me avise que eu crio o script de importação para injetar tudo no banco de dados PostgreSQL de uma vez. O script vai:

1. Ler todos os `.json` da pasta
2. Validar cada questão
3. Inserir no banco evitando duplicatas
4. Reportar quantas questões foram importadas por arquivo
