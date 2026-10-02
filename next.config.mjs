/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // HTTP Location header (next/navigation redirect() can omit Location on some crawler requests)
      { source: "/", destination: "/nodes", permanent: true },
      { source: "/leaderboard", destination: "/node-rewards", permanent: true },
      { source: "/contributions", destination: "/node-rewards", permanent: true },
    ];
  },
};

export default nextConfig;
