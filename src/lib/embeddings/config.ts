/**
 * Embedding model settings, shared by the app and the download script.
 * Kept free of imports so scripts can use it without the app's environment.
 */

/** Multilingual (French included), 384 dimensions, small enough for a laptop CPU. */
export const DEFAULT_EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
export const EMBEDDING_DIMENSIONS = 384;

/** 8-bit quantized weights: 4× smaller than fp32 (113 MB vs 449 MB), negligible quality loss. */
export const EMBEDDING_DTYPE = "q8";

/** Files Transformers.js needs for this model and dtype (`q8` → onnx/model_quantized.onnx). */
export const EMBEDDING_MODEL_FILES = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/model_quantized.onnx",
] as const;

export function embeddingModelId(): string {
  return process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

/** Local folder holding the model files (layout: <dir>/<org>/<model>/...). */
export function embeddingModelDir(): string {
  return process.env.EMBEDDING_MODEL_DIR || ".models";
}
