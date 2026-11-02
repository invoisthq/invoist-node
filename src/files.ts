/** Raw file contents the SDK can upload. Streams are read into memory first, so a retry can send them again. */
export type FileData = Uint8Array | ArrayBuffer | Blob | ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;

/**
 * A file to upload. Any of:
 *
 * - a `File` (it carries its own name) or a `Blob`;
 * - `{ data, filename, contentType? }`, where `data` is bytes, a `Blob`, a
 *   web `ReadableStream` or a Node stream;
 * - a path on disk, as a string (Node, Bun and Deno only).
 */
export type FileInput = Blob | string | { data: FileData; filename: string; contentType?: string | undefined };

/** A downloaded file: its bytes and the type the server stored with it. */
export interface DownloadedFile {
  data: Uint8Array;
  /** For example `application/pdf`. */
  contentType: string;
  /** The original filename, when the server sent one. */
  filename: string | null;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function guessContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

function baseName(path: string): string {
  return path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1) || "upload";
}

async function readAll(
  stream: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
): Promise<Uint8Array<ArrayBuffer>[]> {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const push = (chunk: unknown): void => {
    if (typeof chunk === "string") chunks.push(new TextEncoder().encode(chunk));
    else if (chunk instanceof Uint8Array) chunks.push(new Uint8Array(chunk));
    else throw new TypeError("A file stream must yield bytes (Uint8Array or Buffer).");
  };
  if ("getReader" in stream) {
    // A web stream. Not every browser can iterate one with for await yet.
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return chunks;
      push(value);
    }
  }
  for await (const chunk of stream) push(chunk);
  return chunks;
}

async function readPath(path: string): Promise<Uint8Array<ArrayBuffer>> {
  // getBuiltinModule rather than an import, so that bundles for browsers and
  // edge runtimes never see a reference to node:fs.
  const fs = globalThis.process?.getBuiltinModule?.("node:fs/promises");
  if (!fs) {
    throw new TypeError(
      "Uploading from a path needs Node 22.3 or later, Bun or Deno. Pass the bytes or a Blob instead.",
    );
  }
  return new Uint8Array(await fs.readFile(path));
}

/**
 * Turns any {@link FileInput} into a Blob and a filename, ready for a
 * multipart form. Bytes are copied, so the caller may reuse its buffer.
 */
export async function toUpload(file: FileInput): Promise<{ blob: Blob; filename: string }> {
  if (typeof file === "string") {
    const filename = baseName(file);
    return { blob: new Blob([await readPath(file)], { type: guessContentType(filename) }), filename };
  }
  if (file instanceof Blob) {
    const name = "name" in file && typeof file.name === "string" && file.name !== "" ? file.name : "upload";
    return { blob: file, filename: name };
  }
  const type = file.contentType ?? guessContentType(file.filename);
  const { data } = file;
  let parts: Array<Blob | Uint8Array<ArrayBuffer> | ArrayBuffer>;
  if (data instanceof Blob) parts = [data];
  else if (data instanceof Uint8Array) parts = [new Uint8Array(data)];
  else if (data instanceof ArrayBuffer) parts = [data.slice(0)];
  else parts = await readAll(data);
  return { blob: new Blob(parts, { type }), filename: file.filename };
}

/** Reads the filename out of a `Content-Disposition` header, if there is one. */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      // Fall through to the plain form.
    }
  }
  const quoted = /filename\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(header);
  if (quoted?.[1] !== undefined) return quoted[1].replace(/\\(.)/g, "$1");
  const bare = /filename\s*=\s*([^;\s]+)/.exec(header);
  return bare?.[1] ?? null;
}
