import { readFile } from "node:fs/promises";
import path from "node:path";
import { currentUser, isDemo } from "@/lib/auth";
import { storageBucket } from "@/lib/firebase";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const namePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!namePattern.test(name)) return new Response(null, { status: 404 });
  if (!await currentUser()) return new Response(null, { status: 401 });
  try {
    const bytes = isDemo() ? await readFile(path.join(process.cwd(), ".demo-media", name)) : (await storageBucket().file(`restaurants/${name}`).download())[0];
    const ext = name.split(".").pop();
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": ext === "jpg" ? "image/jpeg" : `image/${ext}`, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 404 }); }
}
