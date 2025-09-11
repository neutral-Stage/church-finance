/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['apfjyghvbkgucylipmdf.supabase.co'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;