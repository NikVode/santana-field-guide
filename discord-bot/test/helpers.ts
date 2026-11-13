export const ctx = () => {
  const pending: Promise<unknown>[] = [];
  return { waitUntil: (p: Promise<unknown>) => { pending.push(p); }, passThroughOnException() {}, pending } as unknown as ExecutionContext & { pending: Promise<unknown>[] };
};

export class FakeCache {
  store = new Map<string, Response>();
  async match(req: string) { const r = this.store.get(String(req)); return r ? r.clone() : undefined; }
  async put(req: string, res: Response) { this.store.set(String(req), res.clone()); }
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
export async function keypair() {
  const kp = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pub = hex(await crypto.subtle.exportKey("raw", kp.publicKey) as ArrayBuffer);
  const sign = async (ts: string, body: string) => hex(await crypto.subtle.sign({ name: "Ed25519" }, kp.privateKey, new TextEncoder().encode(ts + body)));
  return { pub, sign };
}
