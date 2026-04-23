/** @type {import('next').NextConfig} */

// Derive the Supabase image host from the public URL so that forks/other
// projects don't need to edit this file. Falls back to the known production
// host if the env var isn't available at build time.
function resolveSupabaseImageHost() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    try {
      return new URL(url).hostname;
    } catch {
      // fall through
    }
  }
  return 'wuiyqlrztxyfcdnoplvb.supabase.co';
}

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: resolveSupabaseImageHost(),
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config) => {
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