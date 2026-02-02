/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: '/docs',
        destination: 'https://lucas-documentation.gitbook.io/filautocap-docs',
      },
      {
        source: '/docs/:path*',
        destination: 'https://lucas-documentation.gitbook.io/filautocap-docs/:path*',
      },
      // Handle GitBook's default paths (redirect to /docs)
      {
        source: '/filautocap-docs/:path*',
        destination: 'https://lucas-documentation.gitbook.io/filautocap-docs/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

