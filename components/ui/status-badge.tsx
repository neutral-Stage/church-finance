import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { CheckCircle, XCircle, AlertCircle, Clock, Info, Zap, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

// Status Badge Component
const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 border',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground border-border hover:bg-accent',
        success: 'bg-income/15 text-income border-income/30 hover:bg-income/25',
        error: 'bg-expense/15 text-expense border-expense/30 hover:bg-expense/25',
        warning: 'bg-pending/15 text-pending border-pending/30 hover:bg-pending/25',
        info: 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25',
        pending: 'bg-pending/15 text-pending border-pending/30 hover:bg-pending/25',
        active: 'bg-income/15 text-income border-income/30 hover:bg-income/25',
        inactive: 'bg-muted text-muted-foreground border-border hover:bg-accent',
        primary: 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25',
        secondary: 'bg-secondary text-secondary-foreground border-border hover:bg-accent',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
        xl: 'px-4 py-1.5 text-sm',
      },
      glow: {
        none: '',
        subtle: 'shadow-sm',
        medium: 'shadow-md shadow-current/20',
        strong: 'shadow-lg shadow-current/30',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      glow: 'none',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  icon?: React.ReactNode;
  showIcon?: boolean;
  pulse?: boolean;
  asChild?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, size, glow, icon, showIcon = true, pulse = false, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span';
    
    // Default icons for each variant
    const defaultIcons = {
      success: <CheckCircle className="w-3 h-3" />,
      error: <XCircle className="w-3 h-3" />,
      warning: <AlertCircle className="w-3 h-3" />,
      info: <Info className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      active: <Zap className="w-3 h-3" />,
      inactive: <XCircle className="w-3 h-3" />,
      primary: <CheckCircle className="w-3 h-3" />,
      secondary: <Info className="w-3 h-3" />,
      default: null,
    };
    
    const displayIcon = icon || (showIcon && variant ? defaultIcons[variant] : null);
    
    return (
      <Comp
        className={cn(
          statusBadgeVariants({ variant, size, glow }),
          pulse && 'animate-pulse',
          className
        )}
        ref={ref}
        {...props}
      >
        {displayIcon}
        {children}
      </Comp>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Financial Status Badge Component
const financialBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 border',
  {
    variants: {
      type: {
        income: 'bg-income/15 text-income border-income/30 hover:bg-income/25',
        expense: 'bg-expense/15 text-expense border-expense/30 hover:bg-expense/25',
        profit: 'bg-income/15 text-income border-income/30 hover:bg-income/25',
        loss: 'bg-expense/15 text-expense border-expense/30 hover:bg-expense/25',
        neutral: 'bg-muted text-muted-foreground border-border hover:bg-accent',
        pending: 'bg-pending/15 text-pending border-pending/30 hover:bg-pending/25',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      trend: {
        up: 'shadow-sm',
        down: 'shadow-sm',
        neutral: '',
      },
    },
    defaultVariants: {
      type: 'neutral',
      size: 'md',
      trend: 'neutral',
    },
  }
);

export interface FinancialBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof financialBadgeVariants> {
  amount?: number;
  currency?: string;
  showTrendIcon?: boolean;
  asChild?: boolean;
}

const FinancialBadge = React.forwardRef<HTMLSpanElement, FinancialBadgeProps>(
  ({ className, type, size, trend, amount, currency = '$', showTrendIcon = true, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span';
    
    const trendIcons = {
      up: <TrendingUp className="w-3 h-3" />,
      down: <TrendingDown className="w-3 h-3" />,
      neutral: <DollarSign className="w-3 h-3" />,
    };
    
    const formatAmount = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency === '$' ? 'USD' : currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Math.abs(value));
    };
    
    return (
      <Comp
        className={cn(financialBadgeVariants({ type, size, trend }), className)}
        ref={ref}
        {...props}
      >
        {showTrendIcon && trend && trendIcons[trend]}
        {amount !== undefined ? formatAmount(amount) : children}
      </Comp>
    );
  }
);

FinancialBadge.displayName = 'FinancialBadge';

// Priority Badge Component
const priorityBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 border',
  {
    variants: {
      priority: {
        low: 'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25',
        medium: 'bg-pending/15 text-pending border-pending/30 hover:bg-pending/25',
        high: 'bg-pending/20 text-pending border-pending/40 hover:bg-pending/30',
        urgent: 'bg-expense/15 text-expense border-expense/30 hover:bg-expense/25',
        critical: 'bg-expense/20 text-expense border-expense/40 hover:bg-expense/30 shadow-sm',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      priority: 'medium',
      size: 'md',
    },
  }
);

export interface PriorityBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof priorityBadgeVariants> {
  asChild?: boolean;
}

const PriorityBadge = React.forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ className, priority, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span';
    
    return (
      <Comp
        className={cn(priorityBadgeVariants({ priority, size }), className)}
        ref={ref}
        {...props}
      >
        {children || (priority && priority.charAt(0).toUpperCase() + priority.slice(1))}
      </Comp>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';

// Category Badge Component
const categoryBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 border',
  {
    variants: {
      category: {
        tithe: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/25',
        offering: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/25',
        donation: 'bg-income/15 text-income border-income/30 hover:bg-income/25',
        expense: 'bg-expense/15 text-expense border-expense/30 hover:bg-expense/25',
        salary: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/25',
        utilities: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25',
        maintenance: 'bg-muted text-muted-foreground border-border hover:bg-accent',
        ministry: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25',
        missions: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 hover:bg-teal-500/25',
        other: 'bg-muted text-muted-foreground border-border hover:bg-accent',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      category: 'other',
      size: 'md',
    },
  }
);

export interface CategoryBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof categoryBadgeVariants> {
  asChild?: boolean;
}

const CategoryBadge = React.forwardRef<HTMLSpanElement, CategoryBadgeProps>(
  ({ className, category, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span';
    
    return (
      <Comp
        className={cn(categoryBadgeVariants({ category, size }), className)}
        ref={ref}
        {...props}
      >
        {children || (category && category.charAt(0).toUpperCase() + category.slice(1))}
      </Comp>
    );
  }
);

CategoryBadge.displayName = 'CategoryBadge';

// Animated Counter Badge (for displaying numbers with animation)
export interface AnimatedCounterBadgeProps extends StatusBadgeProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const AnimatedCounterBadge = React.forwardRef<HTMLSpanElement, AnimatedCounterBadgeProps>(
  ({ value, duration = 1000, prefix = '', suffix = '', decimals = 0, ...props }, ref) => {
    const [count, setCount] = React.useState(0);
    
    React.useEffect(() => {
      let startTime: number;
      let animationFrame: number;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        setCount(Math.floor(progress * value));
        
        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }, [value, duration]);
    
    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
    };
    
    return (
      <StatusBadge ref={ref} {...props}>
        {prefix}{formatNumber(count)}{suffix}
      </StatusBadge>
    );
  }
);

AnimatedCounterBadge.displayName = 'AnimatedCounterBadge';

export {
  StatusBadge,
  FinancialBadge,
  PriorityBadge,
  CategoryBadge,
  AnimatedCounterBadge,
  statusBadgeVariants,
  financialBadgeVariants,
  priorityBadgeVariants,
  categoryBadgeVariants,
};