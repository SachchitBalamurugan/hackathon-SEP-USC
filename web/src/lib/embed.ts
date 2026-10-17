import "server-only";
import OpenAI from "openai";
import { env } from "./env";

// Embeddings only: text-embedding-3-small at 1536 dimensions, matching FschoolAI api/rag.ts.
// All generation goes through Claude (lib/llm.ts). Without OPENAI_API_KEY, search runs on
// full-text alone, which is enough for a demo.

const MODEL = "text-embedding-3-small";
let client: OpenAI | null = null;

export async function embed(texts: string[]): Promise<number[][] | null> {
  const key = env.openaiKey();
  if (!key || texts.length === 0) return null;
  client ??= new OpenAI({ apiKey: key });
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await client.embeddings.create({ model: MODEL, input: texts.slice(i, i + 100) });
    for (const d of res.data) out.push(d.embedding);
  }
  return out;
}

/** pgvector literal for supabase-js inserts and RPC arguments. */
export const toVector = (v: number[]) => `[${v.join(",")}]`;
