import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border',
  {
    variants: {
      variant: {
        default:
          'bg-secondary text-secondary-foreground border-border hover:bg-accent shadow-sm',
        primary:
          'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 shadow-sm',
        success:
          'bg-income text-income-foreground border-transparent hover:bg-income/90 shadow-sm',
        warning:
          'bg-pending text-pending-foreground border-transparent hover:bg-pending/90 shadow-sm',
        error:
          'bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90 shadow-sm',
        info:
          'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm',
        outline:
          'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost:
          'text-foreground hover:bg-accent hover:text-accent-foreground border-transparent',
        link:
          'text-primary underline-offset-4 hover:underline border-transparent',
        gradient:
          'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm',
        transaction:
          'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm',
        offering:
          'bg-income text-income-foreground border-transparent hover:bg-income/90 shadow-sm',
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