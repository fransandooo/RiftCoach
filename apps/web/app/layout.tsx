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
        <div className="min-h-screen bg-[#08090a] text-slate-100">
          <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#08090a]/85 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link className="group flex items-center gap-3" href="/">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-300/20 bg-indigo-400/10 text-sm font-semibold text-indigo-200 shadow-lg shadow-indigo-950/30">
                  RC
                </span>
                <span className="text-sm font-medium tracking-[-0.02em] text-slate-50 group-hover:text-indigo-200">
                  RiftCoach
                </span>
              </Link>
              <div className="flex gap-1 rounded-full border border-white/[0.06] bg-white/[0.025] p-1 text-sm text-slate-400">
                {navItems.map(([label, href]) => (
                  <Link
                    className="rounded-full px-3 py-1.5 transition hover:bg-white/[0.05] hover:text-slate-100"
                    href={href}
                    key={href}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8 md:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
