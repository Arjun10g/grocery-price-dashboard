import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Canadian Grocery Prices",
  description:
    "Live Canadian grocery prices ingested from StatCan, retailer APIs, and crowdsourced data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
              grocery-prices.ca
            </Link>
            <nav className="flex gap-6 text-sm text-neutral-600">
              <Link href="/" className="hover:text-neutral-900">Search</Link>
              <Link href="/sources" className="hover:text-neutral-900">Sources</Link>
              <Link href="/stores" className="hover:text-neutral-900">Stores</Link>
              <a
                href="https://github.com/Arjun10g/grocery-price-rag"
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-neutral-900"
              >
                GitHub →
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
        <footer className="border-t border-neutral-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-neutral-500">
            Data ingested via the open-source <a href="https://github.com/Arjun10g/grocery-price-rag" className="underline">grocery-price-rag</a> pipeline. All prices are sightings, not guarantees.
          </div>
        </footer>
      </body>
    </html>
  );
}
