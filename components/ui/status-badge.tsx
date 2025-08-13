import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { CheckCircle, XCircle, AlertCircle, Clock, Info, Zap, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

// Status Badge Component
const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm border',
  {
    variants: {
      variant: {
        default: 'bg-white/10 text-white border-white/20 hover:bg-white/20',
        success: 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30',
        error: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30',
        info: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
        pending: 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30',
        active: 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 animate-pulse',
        inactive: 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30',
        primary: 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
        secondary: 'bg-secondary/20 text-secondary border-secondary/30 hover:bg-secondary/30',
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
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm border',
  {
    variants: {
      type: {
        income: 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30',
        expense: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
        profit: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30',
        loss: 'bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30',
        neutral: 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30',
        pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
      trend: {
        up: 'shadow-green-500/20 shadow-md',
        down: 'shadow-red-500/20 shadow-md',
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
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm border',
  {
    variants: {
      priority: {
        low: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
        medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30',
        high: 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30',
        urgent: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30 animate-pulse',
        critical: 'bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30 animate-pulse shadow-red-500/30 shadow-lg',
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
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 backdrop-blur-sm border',
  {
    variants: {
      category: {
        tithe: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30',
        offering: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
        donation: 'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30',
        expense: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
        salary: 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30',
        utilities: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30',
        maintenance: 'bg-gray-500/20 text-gray-300 border-gray-500/30 hover:bg-gray-500/30',
        ministry: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30',
        missions: 'bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/30',
        other: 'bg-slate-500/20 text-slate-300 border-slate-500/30 hover:bg-slate-500/30',
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