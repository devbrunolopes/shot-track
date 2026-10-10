import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Shot Track",
  description: "Registro pessoal de aplicações",
  applicationName: "Shot Track",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Shot Track" },
  formatDetection: { telephone: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><PwaRegister />{children}</body>
    </html>
  );
}