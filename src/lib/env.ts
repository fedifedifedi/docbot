import { z } from "zod";

const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgresql:// connection string"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    LLM_PROVIDER: z.enum(["mock", "anthropic"]).default("mock"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5-5"),
  })
  .refine((env) => env.LLM_PROVIDER !== "anthropic" || Boolean(env.ANTHROPIC_API_KEY), {
    path: ["ANTHROPIC_API_KEY"],
    message: "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic",
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  // Empty strings (e.g. `ANTHROPIC_API_KEY=""` copied from .env.example) mean "not set".
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ""));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated server environment. Read lazily so `next build` does not require runtime secrets. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
