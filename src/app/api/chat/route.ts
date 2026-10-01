import { z } from "zod";
import { answerQuestion, MAX_QUESTION_LENGTH } from "@/lib/chat/answer";
import { saveExchange } from "@/lib/chat/store";
import { getLLMProvider } from "@/lib/llm";
import { LLMError } from "@/lib/llm/provider";
import { searchChunks } from "@/lib/search/search";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "La question est vide.")
    .max(MAX_QUESTION_LENGTH, `La question doit faire au plus ${MAX_QUESTION_LENGTH} caractères.`),
  conversationId: z.string().max(64).nullish(),
});

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/** Public chat endpoint (SPEC F5). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "Requête invalide.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return error(400, parsed.error.issues[0].message);
  const { question, conversationId } = parsed.data;

  try {
    const result = await answerQuestion(question, { search: searchChunks, llm: getLLMProvider() });
    const id = await saveExchange({
      conversationId,
      question,
      answer: result.answer,
      sources: result.sources,
    });
    return Response.json({ conversationId: id, ...result });
  } catch (err) {
    if (err instanceof LLMError) {
      console.error("[chat] LLM provider failed", err);
      return error(502, "Le service de réponse est momentanément indisponible. Réessayez dans un instant.");
    }
    console.error("[chat] unexpected error", err);
    return error(500, "Une erreur est survenue.");
  }
}
