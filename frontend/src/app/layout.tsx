import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Japan Itinerary Planner",
  description: "Plan your perfect Japan trip",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-2xl">🗾</span>
                <h1 className="text-xl font-bold text-foreground">Japan Planner</h1>
              </a>
            </div>
          </header>
          <main className="container mx-auto px-4 py-6">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
