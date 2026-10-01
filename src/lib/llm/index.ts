import { getEnv } from "@/lib/env";
import { AnthropicProvider } from "./anthropic";
import { MockLLMProvider } from "./mock";
import type { LLMProvider } from "./provider";

let provider: LLMProvider | undefined;

/** Provider selected by LLM_PROVIDER (default: mock). */
export function getLLMProvider(): LLMProvider {
  if (provider) return provider;
  const env = getEnv();
  provider =
    env.LLM_PROVIDER === "anthropic"
      ? new AnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY!, model: env.ANTHROPIC_MODEL })
      : new MockLLMProvider();
  return provider;
}
