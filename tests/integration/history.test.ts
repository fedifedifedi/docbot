import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CONVERSATIONS_PAGE_SIZE, getConversation, listConversations } from "@/lib/chat/history";
import { saveExchange } from "@/lib/chat/store";
import { getDb } from "@/lib/db";
import { resetContent } from "./db";

const source = { ref: 1, documentId: "d1", documentTitle: "Support", chunkIndex: 0, excerpt: "9h-18h" };

beforeEach(resetContent);
afterAll(async () => {
  await resetContent();
  await getDb().$disconnect();
});

describe("conversation history", () => {
  it("lists conversations by latest activity with message count and first question", async () => {
    const first = await saveExchange({ question: "Horaires ?", answer: "9h-18h [1].", sources: [source] });
    await saveExchange({ question: "Prix ?", answer: "Je ne sais pas.", sources: [] });
    // New activity on the first conversation moves it to the top.
    await new Promise((resolve) => setTimeout(resolve, 20));
    await saveExchange({ conversationId: first, question: "Et le samedi ?", answer: "Fermé [1].", sources: [source] });

    const { conversations, total, page, pageCount } = await listConversations();

    expect({ total, page, pageCount }).toEqual({ total: 2, page: 1, pageCount: 1 });
    expect(conversations.map((c) => [c.firstQuestion, c.messageCount])).toEqual([
      ["Horaires ?", 4],
      ["Prix ?", 2],
    ]);
  });

  it("paginates", async () => {
    for (let i = 0; i < CONVERSATIONS_PAGE_SIZE + 3; i++) {
      await saveExchange({ question: `Q${i}`, answer: "R", sources: [] });
    }
    const second = await listConversations(2);
    expect(second.pageCount).toBe(2);
    expect(second.conversations).toHaveLength(3);
    expect((await listConversations(0)).page).toBe(1); // out-of-range pages are clamped
  });

  it("returns a conversation's messages in order with parsed sources", async () => {
    const id = await saveExchange({ question: "Horaires ?", answer: "9h-18h [1].", sources: [source] });
    await saveExchange({ conversationId: id, question: "Prix ?", answer: "Je ne sais pas.", sources: [] });

    const conversation = await getConversation(id);
    expect(conversation?.messages.map((m) => [m.role, m.content, m.sources])).toEqual([
      ["USER", "Horaires ?", []],
      ["ASSISTANT", "9h-18h [1].", [source]],
      ["USER", "Prix ?", []],
      ["ASSISTANT", "Je ne sais pas.", []],
    ]);
  });

  it("returns null for an unknown conversation", async () => {
    expect(await getConversation("nope")).toBeNull();
  });
});
