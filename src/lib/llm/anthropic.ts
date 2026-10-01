import Anthropic from "@anthropic-ai/sdk";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { LLMError, type GenerateAnswerInput, type LLMProvider } from "./provider";

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

export type AnthropicProviderOptions = {
  apiKey: string;
  model?: string;
  /** Test seams: a fake fetch lets unit tests check requests without network or key. */
  fetch?: typeof fetch;
  maxRetries?: number;
};

/** Haiku 4.5 rejects the `effort` parameter; newer models accept it. */
function supportsEffort(model: string): boolean {
  return !model.startsWith("claude-haiku");
}

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
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        // Grounded Q&A over short excerpts: low effort keeps latency and cost down.
        ...(supportsEffort(this.model) ? { output_config: { effort: "low" as const } } : {}),
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
