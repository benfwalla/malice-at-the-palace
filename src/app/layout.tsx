import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Malice at the Palace | Basketball Schedule",
  description: "Team schedule for Malice at the Palace - NY Urban Basketball League",
  icons: {
    icon: "/basketball.png",
    apple: "/basketball.png",
  },
  // No openGraph image on purpose: with an og:image, iMessage/Slack render a
  // large hero-image link preview (the giant basketball). Without one, they fall
  // back to a compact card with a small icon + title, which is what we want.
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
