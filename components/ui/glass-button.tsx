import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 backdrop-blur-xl border active:scale-95',
  {
    variants: {
      variant: {
        default:
          'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30 shadow-lg hover:shadow-xl',
        primary:
          'bg-primary/20 text-white border-primary/30 hover:bg-primary/30 hover:border-primary/40 shadow-lg shadow-primary/20 hover:shadow-primary/30',
        secondary:
          'bg-secondary/20 text-white border-secondary/30 hover:bg-secondary/30 hover:border-secondary/40 shadow-lg shadow-secondary/20',
        success:
          'bg-green-500/20 text-white border-green-500/30 hover:bg-green-500/30 hover:border-green-500/40 shadow-lg shadow-green-500/20',
        warning:
          'bg-yellow-500/20 text-white border-yellow-500/30 hover:bg-yellow-500/30 hover:border-yellow-500/40 shadow-lg shadow-yellow-500/20',
        error:
          'bg-red-500/20 text-white border-red-500/30 hover:bg-red-500/30 hover:border-red-500/40 shadow-lg shadow-red-500/20',
        info:
          'bg-blue-500/20 text-white border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/40 shadow-lg shadow-blue-500/20',
        outline:
          'border-white/30 text-white hover:bg-white/10 hover:border-white/40 shadow-lg',
        ghost:
          'text-white hover:bg-white/10 border-transparent hover:border-white/20',
        link:
          'text-white underline-offset-4 hover:underline border-transparent',
        gradient:
          'bg-gradient-to-r from-primary/20 to-secondary/20 text-white border-primary/30 hover:from-primary/30 hover:to-secondary/30 shadow-lg shadow-primary/20',
        transaction:
          'relative overflow-hidden bg-gradient-to-r from-blue-500/20 via-cyan-500/15 to-blue-600/20 text-white border border-blue-400/30 hover:from-blue-500/30 hover:via-cyan-500/25 hover:to-blue-600/30 hover:border-blue-400/50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 backdrop-blur-2xl hover:backdrop-blur-3xl transition-all duration-500 hover:scale-105 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 before:ease-out',
        offering:
          'relative overflow-hidden bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-600/20 text-white border border-green-400/30 hover:from-green-500/30 hover:via-emerald-500/25 hover:to-green-600/30 hover:border-green-400/50 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 backdrop-blur-2xl hover:backdrop-blur-3xl transition-all duration-500 hover:scale-105 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 before:ease-out',
      },
      size: {
        sm: 'h-9 rounded-md px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
      },
      animation: {
        none: '',
        pulse: 'animate-pulse',
        bounce: 'hover:animate-bounce',
        glow: 'relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      animation: 'none',
    },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant,
      size,
      animation,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(
          glassButtonVariants({ variant, size, animation }),
          {
            'cursor-not-allowed opacity-50': loading || disabled,
            'gap-2': leftIcon || rightIcon,
          },
          className
        )}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children && <span className="ml-2">{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);

GlassButton.displayName = 'GlassButton';

// Button Group Component
export interface GlassButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const GlassButtonGroup = React.forwardRef<HTMLDivElement, GlassButtonGroupProps>(
  ({ className, children, orientation = 'horizontal', spacing = 'sm', ...props }, ref) => {
    const spacingClasses = {
      none: '',
      sm: orientation === 'horizontal' ? 'space-x-2' : 'space-y-2',
      md: orientation === 'horizontal' ? 'space-x-4' : 'space-y-4',
      lg: orientation === 'horizontal' ? 'space-x-6' : 'space-y-6',
    };

    return (
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
          spacingClasses[spacing],
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

GlassButtonGroup.displayName = 'GlassButtonGroup';

// Icon Button Component
export interface GlassIconButtonProps
  extends Omit<GlassButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  'aria-label': string;
}

const GlassIconButton = React.forwardRef<HTMLButtonElement, GlassIconButtonProps>(
  ({ icon, className, size = 'icon', ...props }, ref) => {
    return (
      <GlassButton
        className={cn('flex-shrink-0', className)}
        size={size}
        ref={ref}
        {...props}
      >
        {icon}
      </GlassButton>
    );
  }
);

GlassIconButton.displayName = 'GlassIconButton';

export { GlassButton, GlassButtonGroup, GlassIconButton, glassButtonVariants };