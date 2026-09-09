import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Fonte unica da marca — texto e titulos (pesos altos para titulos).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alumaxi",
  description: "Gestao de obras, materiais e equipe — Alumaxi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
