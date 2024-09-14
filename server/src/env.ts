// import z from "zod";

// const envSchema = z.object({
//   DATABASE_URL: z.string().url(),
// });

// export const env = envSchema.parse(process.env);

import * as dotenv from "dotenv";
import z from "zod";

// Carrega as variáveis do arquivo .env
dotenv.config();

// Define o schema usando Zod
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
});

// Faz a validação e lança erro caso falhe
export const env = envSchema.parse(process.env);
