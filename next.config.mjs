/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['wuiyqlrztxyfcdnoplvb.supabase.co'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  webpack: (config, { isServer }) => {
    // Suppress warnings from Supabase realtime-js dynamic imports
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;

    // Ignore specific warnings from websocket-factory.js
    config.ignoreWarnings = [
      {
        module: /node_modules\/@supabase\/realtime-js\/dist\/module\/lib\/websocket-factory\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
};

export default nextConfig;