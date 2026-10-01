import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { saveExchange } from "@/lib/chat/store";
import { getDb } from "@/lib/db";
import { resetContent } from "./db";

const source = {
  ref: 1,
  documentId: "doc_1",
  documentTitle: "Support",
  chunkIndex: 0,
  excerpt: "Ouvert de 9h à 18h.",
};

beforeEach(resetContent);
afterAll(async () => {
  await resetContent();
  await getDb().$disconnect();
});

describe("saveExchange", () => {
  it("creates a conversation with the question and the answer (sources snapshot)", async () => {
    const id = await saveExchange({ question: "Horaires ?", answer: "9h-18h [1].", sources: [source] });

    const messages = await getDb().message.findMany({
      where: { conversationId: id },
      orderBy: [{ createdAt: "asc" }, { role: "desc" }],
    });
    expect(messages.map((m) => [m.role, m.content])).toEqual([
      ["USER", "Horaires ?"],
      ["ASSISTANT", "9h-18h [1]."],
    ]);
    expect(messages[1].sources).toEqual([source]);
  });

  it("appends to an existing conversation and bumps updatedAt", async () => {
    const id = await saveExchange({ question: "Q1", answer: "R1", sources: [] });
    const before = await getDb().conversation.findUniqueOrThrow({ where: { id } });

    await new Promise((resolve) => setTimeout(resolve, 20));
    const sameId = await saveExchange({ conversationId: id, question: "Q2", answer: "R2", sources: [] });

    expect(sameId).toBe(id);
    expect(await getDb().message.count({ where: { conversationId: id } })).toBe(4);
    const after = await getDb().conversation.findUniqueOrThrow({ where: { id } });
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  it("starts a new conversation when the given id does not exist", async () => {
    const id = await saveExchange({ conversationId: "does-not-exist", question: "Q", answer: "R", sources: [] });
    expect(id).not.toBe("does-not-exist");
    expect(await getDb().conversation.count()).toBe(1);
  });
});
