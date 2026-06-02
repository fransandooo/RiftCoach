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
        <header className="border-b border-slate-800 bg-slate-950/80">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link
              className="text-xl font-bold tracking-tight text-cyan-300"
              href="/"
            >
              RiftCoach
            </Link>
            <div className="flex gap-4 text-sm text-slate-300">
              {navItems.map(([label, href]) => (
                <Link className="hover:text-cyan-300" href={href} key={href}>
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
