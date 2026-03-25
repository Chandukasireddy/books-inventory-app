import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookshelf",
  description: "Personal book collection — FastAPI + Next.js learning project",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
