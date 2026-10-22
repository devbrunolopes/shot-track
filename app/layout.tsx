import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Diário Fitness",
  description: "Registro pessoal de aplicações",
  applicationName: "Diário Fitness",
  themeColor: "#C5A12B",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Diário Fitness" },
  icons: { icon: "/icons/shot-track-192.png", apple: "/icons/shot-track-192.png" },
  formatDetection: { telephone: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><PwaRegister />{children}</body>
    </html>
  );
}