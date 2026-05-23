import fs from "node:fs";
import { createReadStream } from "node:fs";
import type { Context } from "hono";

export const streamMp4File = (c: Context, filePath: string): Response => {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const range = c.req.header("range");

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m) return c.json({ error: "invalid range" }, 416);
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : size - 1;
    if (start >= size || end >= size || start > end) {
      return c.json({ error: "range not satisfiable" }, 416);
    }
    const chunk = end - start + 1;
    const stream = createReadStream(filePath, { start, end });
    return new Response(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunk),
        "Content-Type": "video/mp4",
      },
    });
  }

  const stream = createReadStream(filePath);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Content-Type": "video/mp4",
    },
  });
};
