import type { Metadata } from "next";
import { Inter, Irish_Grover, Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import StarField from "@/components/StarField";
import YakaLlama from "@/components/YakaLlama";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const irishGrover = Irish_Grover({
  variable: "--font-irish-grover",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yakana's Team",
  description: "Yakana's Team · NASA Space Apps Challenge",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jakarta.variable} ${irishGrover.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StarField />
        <div className="nebula" aria-hidden="true" />
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
        <YakaLlama />
      </body>
    </html>
  );
}
