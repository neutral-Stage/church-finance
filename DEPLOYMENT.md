# Deployment Guide - Church Finance Management App

This guide covers deploying the Church Finance Management App to various platforms.

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Project**: Set up and configured with all migrations applied
2. **Environment Variables**: Properly configured for production
3. **Build Success**: The app builds without errors (`npm run build`)

## Environment Variables

Set these environment variables in your deployment platform:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication (Required)
NEXTAUTH_SECRET=your_secure_random_string
NEXTAUTH_URL=https://your-deployed-app-url.com
```

## Deployment Options

### 1. Vercel (Recommended)

Vercel is the easiest option for Next.js apps:

#### Option A: Deploy via Git Integration (Recommended)
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Configure environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to your deployed URL, e.g., https://your-app.vercel.app)
6. Deploy

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel@latest

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL

# Deploy from project root
vercel --prod
```

**Note**: If you encounter CLI issues, use the Git integration method instead.

### 2. Netlify

#### Deploy via Netlify CLI:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy --prod --dir=.next
```

#### Deploy via Git Integration:
1. Push code to your Git repository
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Connect your repository
5. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables in Site Settings

### 3. Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Connect your GitHub repository
4. Railway will auto-detect Next.js
5. Add environment variables in the Variables tab
6. Deploy

### 4. DigitalOcean App Platform

1. Go to DigitalOcean App Platform
2. Create new app from GitHub repository
3. Configure build settings:
   - Build command: `npm run build`
   - Run command: `npm start`
4. Add environment variables
5. Deploy

### 5. Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t church-finance .
docker run -p 3000:3000 church-finance
```

## Post-Deployment Checklist

After deploying, verify:

1. **Database Connection**: Ensure Supabase connection works
2. **Authentication**: Test login/signup functionality
3. **API Routes**: Verify all API endpoints respond correctly
4. **Environment Variables**: Check all variables are set correctly
5. **SSL Certificate**: Ensure HTTPS is working
6. **Performance**: Test app loading speed
7. **Mobile Responsiveness**: Test on mobile devices

## Database Setup

Ensure your Supabase database has:

1. **Migrations Applied**: Run all migration files in `supabase/migrations/`
2. **RLS Policies**: Row Level Security policies are active
3. **Demo Data**: Optionally run `npm run setup-demo` for test accounts

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check TypeScript errors: `npm run check`
   - Verify all dependencies are installed

2. **Environment Variable Issues**:
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify Supabase URL and keys are correct

3. **Database Connection Issues**:
   - Verify Supabase project is active
   - Check RLS policies allow access
   - Ensure database migrations are applied

4. **Authentication Issues**:
   - Verify NEXTAUTH_URL matches your deployed URL
   - Check NEXTAUTH_SECRET is set
   - Ensure Supabase auth is configured

## Security Considerations

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Always use HTTPS in production
3. **Database Security**: Ensure RLS policies are properly configured
4. **API Security**: Validate all API inputs
5. **Authentication**: Use strong passwords and consider 2FA

## Monitoring

Consider setting up:

1. **Error Tracking**: Sentry or similar service
2. **Performance Monitoring**: Vercel Analytics or Google Analytics
3. **Uptime Monitoring**: Pingdom or UptimeRobot
4. **Database Monitoring**: Supabase dashboard metrics

## Support

For deployment issues:
1. Check the deployment platform's documentation
2. Review build logs for specific errors
3. Verify environment variables are correctly set
4. Test locally with production build: `npm run build && npm start`