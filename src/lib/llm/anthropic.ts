import Anthropic from "@anthropic-ai/sdk";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { LLMError, type GenerateAnswerInput, type LLMProvider } from "./provider";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

// Models that accept server-side refusal fallbacks (`fallbacks: "default"`).
const SERVER_FALLBACK_MODELS = new Set([
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

export type AnthropicProviderOptions = {
  apiKey: string;
  model?: string;
  /** Test seams: a fake fetch lets unit tests check requests without network or key. */
  fetch?: typeof fetch;
  maxRetries?: number;
};

/** Claude, through the official SDK. Single non-streaming call: answers are short. */
export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  private readonly model: string;

  constructor({ apiKey, model = DEFAULT_ANTHROPIC_MODEL, fetch, maxRetries = 2 }: AnthropicProviderOptions) {
    this.client = new Anthropic({ apiKey, timeout: 60_000, maxRetries, ...(fetch ? { fetch } : {}) });
    this.model = model;
  }

  async generateAnswer(input: GenerateAnswerInput): Promise<string> {
    const useFallback = SERVER_FALLBACK_MODELS.has(this.model);
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        // Grounded Q&A over short excerpts: low effort keeps latency and cost down.
        ...(this.model.startsWith("claude-haiku") ? {} : { output_config: { effort: "low" as const } }),
        ...(useFallback
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(input) }],
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new LLMError(`Anthropic API error (status ${error.status ?? "n/a"})`, { cause: error });
      }
      throw new LLMError("Anthropic request failed", { cause: error });
    }

    if (response.stop_reason === "refusal") {
      throw new LLMError("The model declined to answer");
    }
    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();
    if (!text) throw new LLMError(`Empty answer (stop_reason: ${response.stop_reason})`);
    return text;
  }
}
