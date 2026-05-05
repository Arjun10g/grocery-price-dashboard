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
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 selection:bg-emerald-500/30 selection:text-emerald-100">
        <header className="sticky top-0 z-20 backdrop-blur-md bg-neutral-950/80 border-b border-neutral-800/80">
          <div className="mx-auto max-w-6xl px-6 py-3.5 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight"
            >
              <span className="inline-block size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              <span className="text-neutral-100">grocery-prices.ca</span>
            </Link>
            <nav className="flex gap-1 text-sm">
              {[
                { href: "/", label: "Search" },
                { href: "/sources", label: "Sources" },
                { href: "/stores", label: "Stores" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-1.5 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://github.com/Arjun10g/grocery-price-rag"
                target="_blank"
                rel="noreferrer noopener"
                className="ml-2 px-3 py-1.5 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-neutral-800/80 mt-12">
          <div className="mx-auto max-w-6xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-neutral-500">
            <span>
              Data ingested via{" "}
              <a
                href="https://github.com/Arjun10g/grocery-price-rag"
                className="underline hover:text-neutral-300"
              >
                grocery-price-rag
              </a>{" "}
              · 9 source modules · biweekly cron
            </span>
            <span className="font-mono">
              All prices are sightings, not guarantees.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
