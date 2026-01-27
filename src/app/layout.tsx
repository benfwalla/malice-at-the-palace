import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Malice at the Palace | Basketball Schedule",
  description: "Team schedule for Malice at the Palace - NY Urban Basketball League",
  icons: {
    icon: "/basketball.png",
    apple: "/basketball.png",
  },
  openGraph: {
    title: "Malice at the Palace",
    description: "Team schedule for Malice at the Palace - NY Urban Basketball League",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
