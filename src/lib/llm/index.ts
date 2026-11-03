import { localEmbedder } from "@/lib/embeddings/local";
import { getEnv } from "@/lib/env";
import { AnthropicProvider } from "./anthropic";
import { ExtractiveProvider } from "./extractive";
import { MockLLMProvider } from "./mock";
import type { LLMProvider } from "./provider";

let provider: LLMProvider | undefined;

/** Provider selected by LLM_PROVIDER (default: mock). */
export function getLLMProvider(): LLMProvider {
  if (provider) return provider;
  const env = getEnv();
  switch (env.LLM_PROVIDER) {
    case "anthropic":
      provider = new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY!, model: env.ANTHROPIC_MODEL });
      break;
    case "extractive":
      provider = new ExtractiveProvider({
        embedder: localEmbedder,
        minSimilarity: env.EXTRACTIVE_MIN_SIMILARITY,
        abbreviations: env.MEDICAL_ABBREVIATIONS,
      });
      break;
    default:
      provider = new MockLLMProvider();
  }
  return provider;
}
