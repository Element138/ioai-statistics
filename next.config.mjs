/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    tsconfigPath: "tsconfig.vercel.json",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
