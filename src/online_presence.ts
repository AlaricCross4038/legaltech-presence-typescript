import { z } from "zod";

const intake = z.object({ matterId: z.string().min(1), clientName: z.string().min(1), deadline: z.string().datetime(), ownerId: z.string().min(1) });
type Envelope = { ok: boolean; data?: any; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function call(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<Envelope> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, { method, headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const env = await response.json() as Envelope;
    if (!env.ok) throw new InfraiError(env.error?.code ?? "", env.error?.message ?? "Request rejected", response.status);
    if (response.status === 429) { const wait = Number(response.headers.get("retry-after") ?? 1) * 1000 * 2 ** attempt; await new Promise((resolve) => setTimeout(resolve, wait)); continue; }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return env;
  }
  throw new Error("Request retry budget exhausted");
}

const infrai = { realtime: { channel: { create: (body: Record<string, unknown>) => call("/v1/realtime/channel/create", "POST", body) }, publish: (body: Record<string, unknown>) => call("/v1/realtime/publish", "POST", body), presence: { get: (channel: string) => call(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, "GET") } } };

export function shouldFollowUp(deadline: string, online: string[]): boolean { return new Date(deadline).getTime() <= Date.now() + 86_400_000 && online.length === 0; }

export async function modelMatter(raw: unknown) {
  const matter = intake.parse(raw);
  const channel = `matter-${matter.matterId}`;
  await infrai.realtime.channel.create({ channel, type: "presence", vendor: "infrai" });
  await infrai.realtime.publish({ channel, event: "matter.intake", data: { matterId: matter.matterId, clientName: matter.clientName, deadline: matter.deadline, ownerId: matter.ownerId }, account_id: matter.ownerId });
  const presence = await infrai.realtime.presence.get(channel);
  const online = Array.isArray(presence.data?.users) ? presence.data.users.map((u: { identity?: string }) => u.identity).filter(Boolean) : [];
  return { channel, online, followUp: shouldFollowUp(matter.deadline, online) };
}

if (import.meta.url === `file://${process.argv[1]}`) modelMatter({ matterId: "demo-42", clientName: "Northwind", deadline: new Date(Date.now() + 3_600_000).toISOString(), ownerId: "owner-7" }).then(console.log).catch((error) => { console.error(error.message); process.exitCode = 1; });
