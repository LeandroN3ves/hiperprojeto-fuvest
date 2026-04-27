export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.SUPABASE_HOST || process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    username: process.env.SUPABASE_USER || process.env.DB_USERNAME,
    password: process.env.SUPABASE_PASS || process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
});
