import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Mnemosyne",
  description:
    "An AI-assisted visual storytelling companion for tabletop RPGs — live campaign illustrator for D&D.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
