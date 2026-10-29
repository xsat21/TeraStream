import "server-only";

// Sangat aman untuk GitHub publik karena nilai aslinya diambil dari server saat aplikasi berjalan
const SECRET_KEY = process.env.HMAC_SECRET;

export async function generateSecureToken(dlink: string, expiry: number): Promise<string> {
  if (!SECRET_KEY) {
    throw new Error("Sistem Error: Variabel lingkungan HMAC_SECRET belum dikonfigurasi di server!");
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const messageData = encoder.encode(`${dlink}:${expiry}`);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw", 
    keyData, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  
  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, messageData);
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
