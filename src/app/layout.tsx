import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Council Finance Radar",
  description: "England-first public council finance monitoring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <Link href="/" className="text-lg font-bold text-slate-900">Council Finance Radar</Link>
              <div className="flex gap-6 text-sm font-medium text-slate-600">
                <Link href="/" className="hover:text-slate-900">Today</Link>
                <Link href="/watchlist" className="hover:text-slate-900">Watchlist</Link>
                <Link href="/methodology" className="hover:text-slate-900">Methodology</Link>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
