import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandiport",
  description: "Mandi prices and export demand, crop by crop.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
