import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const glassCardVariants = cva(
  // Base glass-morphism styles from globals.css
  'relative overflow-hidden rounded-xl backdrop-blur-xl border transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-2xl',
  {
    variants: {
      variant: {
        default: 'bg-white/10 border-white/20 shadow-lg hover:bg-white/15',
        success: 'bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/10 hover:bg-green-500/15',
        warning: 'bg-yellow-500/10 border-yellow-500/30 shadow-lg shadow-yellow-500/10 hover:bg-yellow-500/15',
        error: 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/10 hover:bg-red-500/15',
        info: 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/10 hover:bg-blue-500/15',
        primary: 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/10 hover:bg-primary/15',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      animation: {
        none: '',
        fadeIn: 'animate-fade-in',
        slideUp: 'animate-slide-up',
        scaleIn: 'animate-scale-in',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      animation: 'fadeIn',
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, size, animation, children, hover = true, glow = false, ...props }, ref) => {
    return (
      <div
        className={cn(
          glassCardVariants({ variant, size, animation }),
          {
            'hover:scale-100': !hover,
            'before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500': glow,
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

// Header component for cards
export interface GlassCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GlassCardHeader = React.forwardRef<HTMLDivElement, GlassCardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('flex flex-col space-y-1.5 pb-4', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCardHeader.displayName = 'GlassCardHeader';

// Title component for cards
export interface GlassCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const GlassCardTitle = React.forwardRef<HTMLHeadingElement, GlassCardTitleProps>(
  ({ className, children, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        className={cn('text-lg font-semibold leading-none tracking-tight text-white', className)}
        ref={ref}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCardTitle.displayName = 'GlassCardTitle';

// Description component for cards
export interface GlassCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const GlassCardDescription = React.forwardRef<HTMLParagraphElement, GlassCardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        className={cn('text-sm text-white/70', className)}
        ref={ref}
        {...props}
      >
        {children}
      </p>
    );
  }
);

GlassCardDescription.displayName = 'GlassCardDescription';

// Content component for cards
export interface GlassCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GlassCardContent = React.forwardRef<HTMLDivElement, GlassCardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('pt-0', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCardContent.displayName = 'GlassCardContent';

// Footer component for cards
export interface GlassCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const GlassCardFooter = React.forwardRef<HTMLDivElement, GlassCardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        className={cn('flex items-center pt-4', className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCardFooter.displayName = 'GlassCardFooter';

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
  glassCardVariants,
};