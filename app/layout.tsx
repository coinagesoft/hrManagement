import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HR Platform",
  description: "Attendance, leave, work from home and salary in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
