// Discord signs every interaction with Ed25519. We verify with WebCrypto (built into Workers
// and Node 20), so there's no crypto dependency.

const hexToBytes = (hex: string): Uint8Array | null => {
  if (!hex || hex.length % 2 || /[^0-9a-f]/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

const keyCache = new Map<string, Promise<CryptoKey>>();
function importKey(publicKeyHex: string): Promise<CryptoKey> {
  let k = keyCache.get(publicKeyHex);
  if (!k) {
    const raw = hexToBytes(publicKeyHex);
    if (!raw || raw.length !== 32) return Promise.reject(new Error("DISCORD_PUBLIC_KEY must be 64 hex characters"));
    k = crypto.subtle.importKey("raw", raw, { name: "Ed25519" }, false, ["verify"])
      .catch(() => crypto.subtle.importKey("raw", raw, { name: "NODE-ED25519", namedCurve: "NODE-ED25519" } as unknown as SubtleCryptoImportKeyAlgorithm, false, ["verify"]));
    keyCache.set(publicKeyHex, k);
  }
  return k;
}

/** True only for a well-formed, valid signature over timestamp + body. */
export async function verifyDiscordRequest(publicKeyHex: string, signatureHex: string | null, timestamp: string | null, body: string): Promise<boolean> {
  if (!signatureHex || !timestamp || !publicKeyHex) return false;
  const sig = hexToBytes(signatureHex);
  if (!sig || sig.length !== 64) return false;
  try {
    const key = await importKey(publicKeyHex);
    const algo = key.algorithm.name === "NODE-ED25519" ? { name: "NODE-ED25519" } : { name: "Ed25519" };
    return await crypto.subtle.verify(algo, key, sig, new TextEncoder().encode(timestamp + body));
  } catch {
    return false;
  }
}
