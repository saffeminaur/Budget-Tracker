import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Femina Budget Tracker",
  description: "Personal budget tracker: savings, spending, receivables, investments and loans.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Femina Budget Tracker",
  },
  icons: {
    icon: [
      // SVG first — browsers that support it prefer it over the raster
      // fallbacks below (crisper, scales to any chrome size).
      { url: "/icons/femina_icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0d0d",
};

// Runs before hydration (and before first paint) so the .dark class is
// already correct by the time anything renders — otherwise the page would
// briefly flash the wrong theme while React boots. Defaults to dark when
// nothing is stored yet.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var isDark = stored ? stored === "dark" : true;
    document.documentElement.classList.toggle("dark", isDark);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0d0d0d" : "#f4f3ed");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
