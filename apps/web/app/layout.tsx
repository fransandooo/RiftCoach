import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiftCoach",
  description: "Post-game League of Legends coaching dashboard",
};

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Setup", "/setup"],
  ["Champions", "/champions"],
  ["Matches", "/matches/demo"],
  ["Coach", "/coach"],
] as const;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#eef2f7] text-[#202d37]">
          <header className="sticky top-0 z-40 border-b border-[#dbe3ef] bg-white/90 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
              <Link className="group flex items-center gap-3" href="/">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#5383e8] text-sm font-black text-white shadow-sm">
                  RC
                </span>
                <span className="text-base font-bold tracking-[-0.02em] text-[#202d37] group-hover:text-[#5383e8]">
                  RiftCoach
                </span>
              </Link>
              <div className="flex gap-1 rounded-lg border border-[#dbe3ef] bg-[#f7f9fc] p-1 text-sm font-semibold text-[#758592]">
                {navItems.map(([label, href]) => (
                  <Link
                    className="rounded-md px-3 py-1.5 transition hover:bg-white hover:text-[#5383e8] hover:shadow-sm"
                    href={href}
                    key={href}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
