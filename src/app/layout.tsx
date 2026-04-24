import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "McDonald's Local Competitor Radar",
  description: "Operator-friendly competitor intelligence dashboard for McDonald's franchise teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
