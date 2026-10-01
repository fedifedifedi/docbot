import "server-only";
import { getDb } from "@/lib/db";
import type { Source } from "./answer";

export type Exchange = {
  /** Existing conversation to continue; unknown or missing ids start a new one. */
  conversationId?: string | null;
  question: string;
  answer: string;
  sources: Source[];
};

/** Stores a question and its answer; returns the conversation id. */
export async function saveExchange({ conversationId, question, answer, sources }: Exchange) {
  return getDb().$transaction(async (tx) => {
    const existing = conversationId
      ? await tx.conversation.findUnique({ where: { id: conversationId }, select: { id: true } })
      : null;
    const conversation =
      existing ?? (await tx.conversation.create({ data: {}, select: { id: true } }));

    // Explicit timestamps: inside a transaction CURRENT_TIMESTAMP is frozen, so both
    // messages would share the same created_at and their order would be undefined.
    const askedAt = new Date();
    const answeredAt = new Date(askedAt.getTime() + 1);
    await tx.message.createMany({
      data: [
        { conversationId: conversation.id, role: "USER", content: question, createdAt: askedAt },
        {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: answer,
          sources,
          createdAt: answeredAt,
        },
      ],
    });
    // Adding messages does not touch the conversation row: bump it for "most recent" sorting.
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return conversation.id;
  });
}
