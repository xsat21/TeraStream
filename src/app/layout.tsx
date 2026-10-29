import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeraStream — your link, your screen",
  description: "An open-source, privacy-conscious TeraBox public-share viewer prototype. Demo provider only; live streaming is not verified.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
