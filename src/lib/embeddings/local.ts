import { existsSync } from "node:fs";
import { join } from "node:path";
import { EMBEDDING_DTYPE, EMBEDDING_MODEL_FILES, embeddingModelDir, embeddingModelId } from "./config";
import { toPassageInput, toQueryInput, type Embedder } from "./embedder";

/** Passages embedded per model call: bounded memory on large documents. */
const BATCH_SIZE = 16;

type FeatureExtractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

let extractor: Promise<FeatureExtractor> | undefined;

/**
 * Loads the model once, from the local folder only (`allowRemoteModels = false`): the app
 * never downloads anything at runtime. Transformers.js is imported lazily, so fulltext mode
 * (and the CI) never loads it.
 */
function loadExtractor(): Promise<FeatureExtractor> {
  extractor ??= (async () => {
    const model = embeddingModelId();
    const dir = embeddingModelDir();
    const missing = EMBEDDING_MODEL_FILES.filter((file) => !existsSync(join(dir, model, file)));
    if (missing.length > 0) {
      throw new Error(`Embedding model files missing in ${join(dir, model)} (run \`npm run model:download\`)`);
    }
    const { env, pipeline } = await import("@huggingface/transformers");
    env.localModelPath = dir;
    env.allowRemoteModels = false;
    return (await pipeline("feature-extraction", model, { dtype: EMBEDDING_DTYPE })) as unknown as FeatureExtractor;
  })().catch((error) => {
    extractor = undefined; // Allow a retry once the files are there.
    throw error;
  });
  return extractor;
}

/** Mean pooling + L2 normalization: cosine similarity becomes a plain dot product. */
async function embed(texts: string[]): Promise<number[][]> {
  const run = await loadExtractor();
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const output = await run(texts.slice(i, i + BATCH_SIZE), { pooling: "mean", normalize: true });
    vectors.push(...output.tolist());
  }
  return vectors;
}

/** Xenova/multilingual-e5-small through Transformers.js (ONNX Runtime, CPU, offline). */
export const localEmbedder: Embedder = {
  embedQuery: async (text) => (await embed([toQueryInput(text)]))[0],
  embedPassages: (texts) => embed(texts.map(toPassageInput)),
};
