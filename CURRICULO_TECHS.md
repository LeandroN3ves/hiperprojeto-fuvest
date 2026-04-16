# 🚀 Tecnologias e Métodos: HiperprojetoFuvest

Este documento resume as competências técnicas, tecnologias e metodologias utilizadas no desenvolvimento do **HiperprojetoFuvest**, organizadas para facilitar a inclusão em currículos, portfólios ou perfis do LinkedIn.

---

## 🛠️ Stack de Tecnologias

### **Frontend**
*   **Angular 21**: Utilização de **Standalone Components**, sinais (**Signals**) para gerenciamento de estado e arquitetura moderna.
*   **RxJS**: Programação reativa para manipulação de fluxos de dados e eventos assíncronos.
*   **Sass (SCSS) / CSS Moderno**: Implementação de um Design System customizado ("Tech Light"), suporte nativo a **Dark Mode** via variáveis CSS e transições suaves.
*   **Socket.io-Client**: Integração com WebSockets para atualizações em tempo real (Leaderboard).
*   **TypeScript**: Tipagem estrita para maior segurança e manutenibilidade do código.

### **Backend**
*   **NestJS 11**: Framework Node.js progressivo, utilizando a arquitetura de **Módulos, Controllers e Services**.
*   **TypeORM**: ORM para interação com banco de dados relacional, utilizando o padrão **Repository**.
*   **PostgreSQL 16**: Banco de dados relacional robusto para armazenamento de questões, usuários e estatísticas.
*   **Socket.io**: Implementação de Gateways para comunicação bidirecional em tempo real.
*   **Passport.js / JWT**: Autenticação segura de usuários e proteção de rotas via **Guards** e **Strategies**.
*   **Bcrypt**: Hashing de senhas para segurança de dados sensíveis.
*   **Node.js**: Ambiente de execução Javascript de alta performance.

### **IA e Processamento de Dados**
*   **Ollama (Local AI)**: Integração com modelos LLM (**Llama 3, Phi-3**) rodando localmente via Docker.
*   **HuggingFace API**: Fallback e processamento auxiliar de linguagem natural.
*   **Processamento de PDFs**: Pipeline para extração de dados de provas oficiais da Fuvest e conversão para formatos estruturados (JSON).

### **Infraestrutura e Ferramentas**
*   **Docker & Docker Compose**: Containerização total do ambiente de desenvolvimento (Banco, IA, Backend).
*   **Environment Management**: Gerenciamento de segredos e configurações via `.env`.
*   **Eslint / Prettier**: Padronização e qualidade de código.
*   **Git**: Controle de versão.

---

## 🧩 Metodologias e Padrões de Projeto (Skills)

*   **Arquitetura de Software**: Separação clara de responsabilidades entre cliente e servidor (Full-Stack).
*   **RESTful API Design**: Desenvolvimento de endpoints estruturados e semânticos.
*   **Desenvolvimento em Tempo Real**: Experiência com WebSockets para funcionalidades dinâmicas (Leaderboard ao vivo).
*   **Clean Code**: Aplicação de boas práticas como DTOs (Data Transfer Objects), Interceptors e Custom Decorators.
*   **Segurança de Aplicações Web**: Implementação de autenticação JWT, proteção contra ataques comuns e tratamento de senhas.
*   **UI/UX Design Implementation**: Criação de interfaces responsivas, com foco em usabilidade (UX de 1 questão por vez) e estética premium (Glassmorphism).
*   **Gerenciamento de Estado**: Uso de Angular Signals para controle de tema (Dark/Light mode) e estado da aplicação.
*   **Inteligência Artificial Aplicada**: Desenvolvimento de sistemas de tutoria inteligente e automação de classificação de conteúdo via LLMs.
*   **Modelagem de Dados**: Design de esquemas relacionais complexos (8+ tabelas) com relacionamentos UUID, Foreign Keys e uso de JSONB.

---

## 🚀 Destaques do Projeto para o Currículo

1.  **Plataforma Full-Stack Completa**: Desenvolvimento ponta a ponta, desde a infraestrutura local (Docker) até a interface final.
2.  **Integração de IA Nativa**: Sistema de chat com tutor IA capaz de dar feedback em tempo real sobre questões de vestibular.
3.  **Dashboard de Performance**: Implementação de sistema de estatísticas que identifica fraquezas do usuário e sugere temas de estudo.
4.  **Gamificação em Tempo Real**: Ranking global que atualiza instantaneamente à medida que os usuários completam provas.
5.  **Automação de Dados**: Criação de scripts para transformar centenas de páginas de PDFs em dados estruturados para o banco de dados.
