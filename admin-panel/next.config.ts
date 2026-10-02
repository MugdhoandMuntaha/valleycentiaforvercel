import type { NextConfig } from "next";
import os from "os";

// Find local IPv4 address dynamically for local network access
const interfaces = os.networkInterfaces();
let localIp = 'localhost';
for (const name of Object.keys(interfaces)) {
  const iface = interfaces[name];
  if (iface) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        localIp = alias.address;
        break;
      }
    }
  }
  if (localIp !== 'localhost') break;
}

if (process.env.NODE_ENV === 'development') {
  const currentNextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
  if (currentNextAuthUrl.includes('localhost') || currentNextAuthUrl.includes('127.0.0.1')) {
    process.env.NEXTAUTH_URL = currentNextAuthUrl.replace('localhost', localIp).replace('127.0.0.1', localIp);
    console.log(`\x1b[33m[NextAuth] Dynamically configured NEXTAUTH_URL to ${process.env.NEXTAUTH_URL} for local network access\x1b[0m`);
  }
}

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
  allowedDevOrigins: [
    'localhost:3001',
    'localhost:3000',
    '192.168.0.104:3001',
    '192.168.0.104:3000',
    `${localIp}:3001`,
    `${localIp}:3000`,
    localIp
  ],
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
