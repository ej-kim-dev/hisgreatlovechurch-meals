import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSameOrigin, currentUser, isDemo } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { storageBucket } from "@/lib/firebase";
export const runtime = "nodejs";
const maxBytes = 5 * 1024 * 1024;
function imageExtension(bytes: Buffer): string | null {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await currentUser();
    if (!user || user.role === "viewer") return jsonError(new Error("사진을 올릴 권한이 없습니다."), 403);
    const length = Number(request.headers.get("content-length"));
    if (length > maxBytes + 32_768) throw new Error("사진은 5MB 이하만 올릴 수 있습니다.");
    const reader = request.body?.getReader();
    if (!reader) throw new Error("사진을 선택해 주세요.");
    const parts: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes + 32_768) { await reader.cancel(); throw new Error("사진은 5MB 이하만 올릴 수 있습니다."); }
      parts.push(value);
    }
    const form = await new Response(Buffer.concat(parts), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > maxBytes) throw new Error("사진은 5MB 이하만 올릴 수 있습니다.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = imageExtension(bytes);
    if (!extension) throw new Error("JPG, PNG, WebP 사진만 올릴 수 있습니다.");
    const filename = `${randomUUID()}.${extension}`;
    if (isDemo()) {
      const dir = path.join(process.cwd(), ".demo-media");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), bytes, { flag: "wx" });
    } else {
      await storageBucket().file(`restaurants/${filename}`).save(bytes, { resumable: false, contentType: `image/${extension === "jpg" ? "jpeg" : extension}`, metadata: { cacheControl: "private, max-age=3600" } });
    }
    return Response.json({ url: `/api/media/${filename}` });
  } catch (error) { return jsonError(error); }
}
