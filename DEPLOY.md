# 🚀 Guia de Deploy — Hiperprojeto Fuvest

> [!CAUTION]
> **ALERTA DE SEGURANÇA**: Você adicionou sua senha do Supabase e sua chave do Gemini em texto aberto neste arquivo. 
> 1. **MUDE SUA SENHA DO SUPABASE IMEDIATAMENTE** no painel do Supabase.
> 2. Se a chave do Gemini for privada, gere uma nova e apague a antiga.
> 3. Nunca cole senhas ou chaves diretamente em arquivos que vão para o GitHub. Use variáveis de ambiente.

---

## 1. 🔑 Chaves e Credenciais
- **Google Gemini**: [Gere aqui](https://aistudio.google.com/app/apikey).
- **Supabase**: [Painel do Projeto](https://supabase.com/).

---

## 2. 🗄️ Banco de Dados (Supabase) — Correção para Arquivos Grandes
O editor do Supabase tem um limite de tamanho. Por isso, dividi os dados em **3 partes menores**.
1. Vá em **SQL Editor** no Supabase.
2. Execute o conteúdo destes arquivos **na ordem**:
    - **Parte 1 (Estrutura e Cursos)**: [`seed_1.sql`](file:///c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/seed_1.sql)
    - **Parte 2 (Questões A)**: [`seed_2.sql`](file:///c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/seed_2.sql)
    - **Parte 3 (Questões B)**: [`seed_3.sql`](file:///c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/seed_3.sql)
3. Clique em **Run** para cada uma.

---

## 3. ⚙️ Backend (Railway)
1. Conecte seu repositório GitHub ao Railway.
2. Configure estas **Variáveis de Ambiente**:
   - `NODE_ENV=production`
   - `DB_HOST=` (db.tcogmwctcayymjgvnvzf.supabase.co)
   - `DB_PORT=5432`
   - `DB_USERNAME=postgres`
   - `DB_PASSWORD=` (**SUA NOVA SENHA**)
   - `DB_DATABASE=postgres`
   - `GEMINI_API_KEY=` (**SUA CHAVE**)
   - `JWT_SECRET=` (Crie uma frase secreta longa)

---

## 4. 💻 Frontend (Vercel)
1. Conecte a pasta `frontend` à Vercel.
2. Configure a `API_URL` com o endereço que o Railway vai te dar.

---

## 📌 Links Gerados
- [seed_1.sql](file:///c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/seed_1.sql)
- [seed_2.sql](file:///c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/seed_2.sql)
- [seed_3.sql](file:///c:/Users/leand/OneDrive/Desktop/Leandro/Projetos/HiperprojetoFuvest/seed_3.sql)

**Próximo passo: Faça o Push para o GitHub** para que o Railway e a Vercel consigam ler seu código.
