import "server-only";

// Ganti string di bawah ini dengan kata kunci rahasia Anda jika tidak memakai env variable
const SECRET_KEY = process.env.HMAC_SECRET || "ganti_dengan_string_acak_dan_panjang_anda";

export async function generateSecureToken(dlink: string, expiry: number): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const messageData = encoder.encode(`${dlink}:${expiry}`);

  // Perbaikan: Menghapus 'typeof' sebelum globalThis
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw", 
    keyData, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );
  
  // Perbaikan: Menghapus 'typeof' sebelum globalThis
  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, messageData);
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
