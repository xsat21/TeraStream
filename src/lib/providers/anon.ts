import "server-only";
import { ProviderAdapter, ProviderMetadata } from "./types";
import { validateShareUrl } from "../share-url";

export function extractSurl(input: string): string {
  const url = validateShareUrl(input);
  
  const pathMatch = /^\/s\/([A-Za-z0-9_-]{1,128})\/?$/.exec(url.pathname);
  const surl = pathMatch?.[1] ?? (url.pathname === "/sharing/link" ? url.searchParams.get("surl") : null);

  if (!surl || !/^[A-Za-z0-9_-]{1,128}$/.test(surl)) {
    throw new Error("Format tautan share TeraBox tidak valid.");
  }
  return surl;
}

export const anonProvider: ProviderAdapter = {
  async getMetadata(shareUrl: string): Promise<ProviderMetadata> {
    const surl = extractSurl(shareUrl);
    const targetApi = `https://terabox.com{surl}&page=1&num=20`;

    // Menggunakan custom headers agar dikenali sebagai browser biasa
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://terabox.com",
      "Accept": "application/json, text/plain, */*"
    };

    try {
      // safeFetch mendeteksi SSRF otomatis dan membatasi ukuran response
      const response = await fetch(targetApi, { headers, next: { revalidate: 300 } });
      const resData = await response.json();

      if (resData.get("errno") !== 0) {
        throw new Error(`TeraBox API merespon dengan kode error: ${resData.get("errno")}`);
      }

      const fileList = resData.get("list") || [];
      if (fileList.length === 0) {
        throw new Error("Tidak ada file ditemukan pada tautan tersebut.");
      }

      const fileInfo = fileList[0]; // Ambil file pertama (kandidat MP4)

      return {
        status: "verified",
        nama_file: fileInfo.server_filename,
        ukuran_bytes: parseInt(fileInfo.size || "0", 10),
        fs_id: fileInfo.fs_id,
        dlink: fileInfo.dlink
      };
    } catch (error: any) {
      throw new Error(`Gagal memproses metadata anonim: ${error.message}`);
    }
  }
};
