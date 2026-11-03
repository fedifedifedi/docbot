/**
 * Downloads the embedding model files into a local folder (default `.models/`), so the app
 * then runs without network access. Resumes interrupted downloads (HTTP Range) and checks
 * the SHA-256 of large files published by Hugging Face.
 *
 *   npm run model:download
 */
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, truncateSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { EMBEDDING_MODEL_FILES, embeddingModelId, embeddingModelDir } from "../src/lib/embeddings/config";

const HUB = "https://huggingface.co";
const MAX_ATTEMPTS = 40;

type TreeEntry = { path: string; size: number; lfs?: { oid: string } };

async function remoteFiles(model: string): Promise<Map<string, TreeEntry>> {
  const entries = new Map<string, TreeEntry>();
  for (const folder of ["", "/onnx"]) {
    const res = await fetch(`${HUB}/api/models/${model}/tree/main${folder}`);
    if (!res.ok) throw new Error(`Liste des fichiers inaccessible (HTTP ${res.status})`);
    for (const entry of (await res.json()) as TreeEntry[]) entries.set(entry.path, entry);
  }
  return entries;
}

function sha256(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

async function isComplete(file: string, entry: TreeEntry): Promise<boolean> {
  if (!existsSync(file) || statSync(file).size !== entry.size) return false;
  return entry.lfs ? (await sha256(file)) === entry.lfs.oid : true;
}

async function download(model: string, entry: TreeEntry, file: string): Promise<void> {
  mkdirSync(dirname(file), { recursive: true });
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (await isComplete(file, entry)) return;
    let have = existsSync(file) ? statSync(file).size : 0;
    if (have > entry.size) {
      truncateSync(file, 0); // Wrong content: start over.
      have = 0;
    }
    try {
      const res = await fetch(`${HUB}/${model}/resolve/main/${entry.path}`, {
        headers: have ? { Range: `bytes=${have}-` } : {},
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const append = res.status === 206;
      await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file, { flags: append ? "a" : "w" }));
      if (statSync(file).size === entry.size && !(await isComplete(file, entry))) {
        console.log(`  ${entry.path} : empreinte incorrecte, nouveau téléchargement`);
        truncateSync(file, 0);
      }
    } catch (error) {
      const done = existsSync(file) ? statSync(file).size : 0;
      console.log(`  ${entry.path} : ${(error as Error).message} à ${Math.round((100 * done) / entry.size)} %, reprise (${attempt})`);
    }
  }
  if (!(await isComplete(file, entry))) throw new Error(`${entry.path} : échec après ${MAX_ATTEMPTS} tentatives`);
}

async function main() {
  const model = embeddingModelId();
  const target = join(embeddingModelDir(), model);
  console.log(`Modèle ${model} → ${target}`);
  const remote = await remoteFiles(model);
  for (const path of EMBEDDING_MODEL_FILES) {
    const entry = remote.get(path);
    if (!entry) throw new Error(`Fichier absent du dépôt Hugging Face : ${path}`);
    await download(model, entry, join(target, path));
    console.log(`ok ${path} (${(entry.size / 1e6).toFixed(1)} Mo${entry.lfs ? ", SHA-256 vérifié" : ""})`);
  }
  console.log("Modèle prêt : l'application peut maintenant fonctionner sans réseau.");
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
