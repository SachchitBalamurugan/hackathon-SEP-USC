// Paragraph/sentence-boundary chunking for course materials, after FschoolAI api/rag.ts
// chunkText. Every chunk is bounded even when the source has no punctuation to split on.

export const CHUNK_MAX = 900;

export function chunkText(text: string, max = CHUNK_MAX): string[] {
  const paras = String(text)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  };

  for (const para of paras) {
    if (para.length > max) {
      flush();
      const sentences = para.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [para];
      let sBuf = "";
      for (const s of sentences) {
        if ((sBuf + s).length > max) {
          if (sBuf.trim()) chunks.push(sBuf.trim());
          sBuf = "";
        }
        if (s.length > max) {
          for (let i = 0; i < s.length; i += max) {
            const piece = s.slice(i, i + max).trim();
            if (piece) chunks.push(piece);
          }
          continue;
        }
        sBuf += s;
      }
      if (sBuf.trim()) chunks.push(sBuf.trim());
      continue;
    }
    if ((buf + "\n\n" + para).length > max) flush();
    buf = buf ? buf + "\n\n" + para : para;
  }
  flush();
  return chunks;
}
