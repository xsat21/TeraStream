import "server-only";

const SECRET_KEY = process.env.HMAC_SECRET || "ganti_dengan_string_acak_dan_panjang_anda";

export async function generateSecureToken(dlink: string, expiry: number): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const messageData = encoder.encode(`${dlink}:${expiry}`);

  const cryptoKey = await typeof globalThis.crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  
  const signature = await typeof globalThis.crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}
