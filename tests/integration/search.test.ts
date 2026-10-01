import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createDocument, deleteDocument } from "@/lib/documents/service";
import { searchChunks } from "@/lib/search/search";
import { resetContent } from "./db";

async function addDoc(title: string, content: string) {
  return createDocument({ title, content, source: "PASTE", filename: null });
}

beforeEach(resetContent);
afterAll(async () => {
  await resetContent();
  await getDb().$disconnect();
});

describe("searchChunks (PostgreSQL full-text)", () => {
  it("finds a chunk from a natural-language question (OR semantics, stop words ignored)", async () => {
    await addDoc("Support", "Les horaires du support sont de 9h à 18h du lundi au vendredi.");
    await addDoc("Tarifs", "Le forfait de base coûte 49 € par mois.");

    const hits = await searchChunks("Quels sont les horaires d'ouverture du support client ?");

    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ documentTitle: "Support", chunkIndex: 0 });
    expect(hits[0].content).toContain("9h à 18h");
    expect(hits[0].rank).toBeGreaterThan(0);
  });

  it("matches across French inflections (stemming) and accents", async () => {
    await addDoc("Fermetures", "Le support est fermé les jours fériés.");

    expect(await searchChunks("ferme")).toHaveLength(1); // accent-insensitive
    expect(await searchChunks("férié")).toHaveLength(1); // singular vs plural
    expect(await searchChunks("FERMETURE")).toHaveLength(0); // different word, no false match
  });

  it("ranks chunks matching more of the question first", async () => {
    await addDoc("Livraison", "La livraison est gratuite.");
    await addDoc("Retours", "Les retours de livraison sont gratuits sous 30 jours.");

    const hits = await searchChunks("retours livraison gratuits");
    expect(hits.map((h) => h.documentTitle)).toEqual(["Retours", "Livraison"]);
    expect(hits[0].rank).toBeGreaterThan(hits[1].rank);
  });

  it("returns nothing when no word matches, or when the question has only stop words", async () => {
    await addDoc("Support", "Les horaires du support sont de 9h à 18h.");

    expect(await searchChunks("prix du forfait entreprise")).toEqual([]);
    expect(await searchChunks("le la les de du ?")).toEqual([]);
    expect(await searchChunks("")).toEqual([]);
  });

  it("is safe with tsquery operators and quotes in the question", async () => {
    await addDoc("Support", "Les horaires du support.");
    await expect(searchChunks("horaires' | !support & (x) <-> :* \\")).resolves.toHaveLength(1);
  });

  it("respects the limit and minRank options", async () => {
    for (let i = 0; i < 8; i++) await addDoc(`Doc ${i}`, `Information numéro ${i} sur la garantie.`);

    expect(await searchChunks("garantie")).toHaveLength(5); // default top-k
    expect(await searchChunks("garantie", { limit: 2 })).toHaveLength(2);
    expect(await searchChunks("garantie", { minRank: 1000 })).toEqual([]);
  });

  it("no longer finds the chunks of a deleted document", async () => {
    const { id } = await addDoc("Ancien tarif", "Le tarif historique était de 39 €.");
    expect(await searchChunks("tarif historique")).toHaveLength(1);

    await deleteDocument(id);
    expect(await searchChunks("tarif historique")).toEqual([]);
  });

  it("indexes every chunk of a long document with its position", async () => {
    const sections = Array.from(
      { length: 4 },
      (_, i) => `## Section ${i}\n\n${`Texte de remplissage ${i}. `.repeat(40)}Mot-clé unique zorglub${i}.`,
    ).join("\n\n");
    await addDoc("Long", sections);

    const hits = await searchChunks("zorglub3");
    expect(hits).toHaveLength(1);
    expect(hits[0].chunkIndex).toBeGreaterThan(0);
    expect(hits[0].content).toContain("## Section 3");
  });
});
