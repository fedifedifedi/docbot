import { describe, expect, it } from "vitest";
import { AnthropicProvider } from "@/lib/llm/anthropic";
import { SYSTEM_PROMPT } from "@/lib/llm/prompt";
import { LLMError } from "@/lib/llm/provider";

const input = {
  question: "Horaires ?",
  excerpts: [{ ref: 1, documentTitle: "Support", content: "Ouvert de 9h à 18h." }],
};

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: "Ouvert de 9h à 18h [1]." }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
    ...overrides,
  };
}

/** Fake fetch: records requests and replies with a canned response. No network, no key. */
function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fn, calls };
}

describe("AnthropicProvider", () => {
  it("sends the system prompt, the excerpts and the model, and returns the text", async () => {
    const { fn, calls } = fakeFetch(200, message());
    const provider = new AnthropicProvider({ apiKey: "test-key", fetch: fn, maxRetries: 0 });

    await expect(provider.generateAnswer(input)).resolves.toBe("Ouvert de 9h à 18h [1].");

    expect(calls).toHaveLength(1);
    const { url, headers, body } = calls[0];
    expect(url).toContain("/v1/messages");
    expect(headers.get("x-api-key")).toBe("test-key");
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.system).toBe(SYSTEM_PROMPT);
    expect(body.fallbacks).toBe("default");
    expect(body.output_config).toEqual({ effort: "low" });
    expect(JSON.stringify(body.messages)).toContain("Ouvert de 9h à 18h.");
  });

  it("does not send fallbacks for models that do not support them", async () => {
    const { fn, calls } = fakeFetch(200, message());
    const provider = new AnthropicProvider({
      apiKey: "k",
      model: "claude-haiku-4-5",
      fetch: fn,
      maxRetries: 0,
    });
    await provider.generateAnswer(input);
    expect(calls[0].body.fallbacks).toBeUndefined();
    expect(calls[0].body.output_config).toBeUndefined();
  });

  it("maps API errors to LLMError", async () => {
    const { fn } = fakeFetch(500, { type: "error", error: { type: "api_error", message: "boom" } });
    const provider = new AnthropicProvider({ apiKey: "k", fetch: fn, maxRetries: 0 });
    await expect(provider.generateAnswer(input)).rejects.toBeInstanceOf(LLMError);
  });

  it("treats a refusal as an error, not as an answer", async () => {
    const { fn } = fakeFetch(200, message({ stop_reason: "refusal", content: [] }));
    const provider = new AnthropicProvider({ apiKey: "k", fetch: fn, maxRetries: 0 });
    await expect(provider.generateAnswer(input)).rejects.toThrow(/declined/);
  });
});
