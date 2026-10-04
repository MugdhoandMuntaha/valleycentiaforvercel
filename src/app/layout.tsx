import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css"; // styles
import { LayoutShell } from "@/components/LayoutShell";
import ScrollToTop from "@/components/ScrollToTop";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Valleycentia — Premium Fashion & Accessories",
  description:
    "Discover curated collections of premium fashion, accessories, and lifestyle essentials. Free shipping on orders over $100.",
  keywords: ["fashion", "accessories", "luxury", "online store", "premium", "valleycentia"],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Valleycentia",
  "url": "https://valleycentia.com",
  "logo": "https://valleycentia.com/logo.png",
  "description": "Premium authentic beauty, skincare, and hair care products in Bangladesh.",
  "sameAs": [
    "https://facebook.com/valleycentia",
    "https://instagram.com/valleycentia"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "areaServed": "BD"
  }
};

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Valleycentia",
  "url": "https://valleycentia.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://valleycentia.com/shop?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
        <body>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
          />
          <ScrollToTop />
          <LayoutShell>{children}</LayoutShell>
        </body>
      </html>
    </ClerkProvider>
  );
}

