import "server-only";
import { getDb } from "@/lib/db";
import { parseStoredSources } from "./sources";

export const CONVERSATIONS_PAGE_SIZE = 20;

export type ConversationSummary = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  firstQuestion: string | null;
};

/** Conversations, most recent activity first (SPEC F6). `page` starts at 1. */
export async function listConversations(page = 1) {
  const db = getDb();
  const total = await db.conversation.count();
  const pageCount = Math.max(1, Math.ceil(total / CONVERSATIONS_PAGE_SIZE));
  // Out-of-range pages (?page=0, ?page=99) are clamped instead of rendering an empty page.
  const safePage = Math.min(pageCount, Math.max(1, Math.floor(page) || 1));
  const rows = await db.conversation.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    skip: (safePage - 1) * CONVERSATIONS_PAGE_SIZE,
    take: CONVERSATIONS_PAGE_SIZE,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
      messages: {
        where: { role: "USER" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  const conversations: ConversationSummary[] = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    messageCount: row._count.messages,
    firstQuestion: row.messages[0]?.content ?? null,
  }));
  return { conversations, page: safePage, pageCount, total };
}

/** One conversation with its messages in order, sources parsed from their JSON snapshot. */
export async function getConversation(id: string) {
  const conversation = await getDb().conversation.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, role: true, content: true, sources: true, createdAt: true },
      },
    },
  });
  if (!conversation) return null;
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      sources: parseStoredSources(message.sources),
    })),
  };
}
