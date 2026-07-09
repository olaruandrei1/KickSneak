import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "KickSneak Admin Panel",
  description: "Panou de administrare KickSneak",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body>
        <div className="admin-layout">
          <Sidebar />
          <div className="main-content">
            <Header />
            <main className="page-container">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
