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
    ];
  },
};

module.exports = nextConfig;

