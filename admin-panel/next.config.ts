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
        destination: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
