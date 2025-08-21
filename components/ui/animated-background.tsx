'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

const speedMultiplier = {
  slow: 1.5,
  normal: 1,
  fast: 0.7
};

export interface AnimatedBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'vibrant' | 'minimal';
  orbCount?: number;
  speed?: 'slow' | 'normal' | 'fast';
  colors?: string[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  blur?: boolean;
  opacity?: number;
}

interface Orb {
  id: number;
  size: number;
  x: number;
  y: number;
  color: string;
  animationDuration: number;
  animationDelay: number;
}

const AnimatedBackground = React.forwardRef<HTMLDivElement, AnimatedBackgroundProps>(
  ({
    className,
    variant = 'default',
    orbCount = 6,
    speed = 'normal',
    colors,
    size = 'md',
    blur = true,
    opacity = 0.6,
    children,
    ...props
  }, ref) => {
    const defaultColors = {
      default: ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'],
      subtle: ['#E0E7FF', '#F3E8FF', '#ECFEFF', '#ECFDF5', '#FFFBEB', '#FEF2F2'],
      vibrant: ['#1D4ED8', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'],
      minimal: ['#6B7280', '#9CA3AF', '#D1D5DB']
    };

    const sizeClasses = {
      sm: { min: 100, max: 200 },
      md: { min: 150, max: 300 },
      lg: { min: 200, max: 400 },
      xl: { min: 300, max: 500 }
    };

    const orbColors = colors || defaultColors[variant];
    const sizeRange = sizeClasses[size];

    const orbs: Orb[] = useMemo(() => {
      return Array.from({ length: orbCount }, (_, i) => ({
        id: i,
        size: Math.random() * (sizeRange.max - sizeRange.min) + sizeRange.min,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: orbColors[i % orbColors.length],
        animationDuration: (Math.random() * 20 + 15) * speedMultiplier[speed],
        animationDelay: Math.random() * 10
      }));
    }, [orbCount, orbColors, sizeRange, speed]);

    return (
      <div
        className={cn('relative overflow-hidden', className)}
        ref={ref}
        {...props}
      >
        {/* Animated Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          {orbs.map((orb) => (
            <div
              key={orb.id}
              className={cn(
                'absolute rounded-full animate-float',
                blur && 'blur-xl'
              )}
              style={{
                width: `${orb.size}px`,
                height: `${orb.size}px`,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
                background: `radial-gradient(circle, ${orb.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, transparent 70%)`,
                animationDuration: `${orb.animationDuration}s`,
                animationDelay: `${orb.animationDelay}s`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/5 to-black/10 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translate(-50%, -50%) translateY(0px) rotate(0deg);
            }
            25% {
              transform: translate(-50%, -50%) translateY(-20px) rotate(90deg);
            }
            50% {
              transform: translate(-50%, -50%) translateY(-10px) rotate(180deg);
            }
            75% {
              transform: translate(-50%, -50%) translateY(-30px) rotate(270deg);
            }
          }
          
          .animate-float {
            animation: float var(--animation-duration, 20s) ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }
);

AnimatedBackground.displayName = 'AnimatedBackground';

// Preset variants for common use cases
export const BackgroundVariants = {
  Dashboard: (props?: Partial<AnimatedBackgroundProps>) => (
    <AnimatedBackground
      variant="default"
      orbCount={6}
      speed="normal"
      size="lg"
      {...props}
    />
  ),
  
  Login: (props?: Partial<AnimatedBackgroundProps>) => (
    <AnimatedBackground
      variant="vibrant"
      orbCount={4}
      speed="slow"
      size="xl"
      opacity={0.4}
      {...props}
    />
  ),
  
  Subtle: (props?: Partial<AnimatedBackgroundProps>) => (
    <AnimatedBackground
      variant="subtle"
      orbCount={3}
      speed="slow"
      size="md"
      opacity={0.3}
      {...props}
    />
  ),
  
  Minimal: (props?: Partial<AnimatedBackgroundProps>) => (
    <AnimatedBackground
      variant="minimal"
      orbCount={2}
      speed="slow"
      size="sm"
      opacity={0.2}
      blur={false}
      {...props}
    />
  )
};

// Floating Particles Component (Alternative animation style)
export interface FloatingParticlesProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
  colors?: string[];
  size?: { min: number; max: number };
  speed?: { min: number; max: number };
}

export const FloatingParticles = React.forwardRef<HTMLDivElement, FloatingParticlesProps>(
  ({ className, count = 20, colors = ['#ffffff'], size = { min: 2, max: 6 }, speed = { min: 10, max: 30 }, ...props }, ref) => {
    const particles = useMemo(() => {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        size: Math.random() * (size.max - size.min) + size.min,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * (speed.max - speed.min) + speed.min,
        delay: Math.random() * 5
      }));
    }, [count, colors, size, speed]);

    return (
      <div
        className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
        ref={ref}
        {...props}
      >
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: particle.color,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
              opacity: 0.6
            }}
          />
        ))}
      </div>
    );
  }
);

FloatingParticles.displayName = 'FloatingParticles';

export { AnimatedBackground };