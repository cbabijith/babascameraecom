// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-accordion',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-avatar',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      'date-fns',
      'sonner',
      'zod',
      'react-hook-form',
      '@hookform/resolvers',
      'clsx',
      'tailwind-merge',
    ],
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'babas.blr1.cdn.digitaloceanspaces.com',
        port: '',
        pathname: '/**',
      },
      // Add other CDN domains if needed
      {
        protocol: 'https',
        hostname: 'your-other-cdn-domain.com',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'babasphotostore.blr1.cdn.digitaloceanspaces.com',
        port: '',
        pathname: '/**',
      }
    ],
    // Optional: Set image formats and sizes
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Skip ESLint during builds (fix warnings separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Security headers for Best Practices score
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          }
        ],
      },
    ]
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig
