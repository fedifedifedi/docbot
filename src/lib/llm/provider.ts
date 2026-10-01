/** A numbered excerpt given to the model; answers cite it as `[ref]`. */
export type ContextExcerpt = {
  ref: number;
  documentTitle: string;
  content: string;
};

export type GenerateAnswerInput = {
  question: string;
  excerpts: ContextExcerpt[];
};

/**
 * The only LLM surface the application depends on. Implementations: `mock` (deterministic,
 * offline — tests, CI, demo without a key) and `anthropic` (Claude).
 */
export interface LLMProvider {
  readonly name: string;
  generateAnswer(input: GenerateAnswerInput): Promise<string>;
}

/** The provider could not produce an answer (network, API error, refusal…). */
export class LLMError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LLMError";
  }
}
