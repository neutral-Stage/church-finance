import React from 'react';
import Head from 'next/head';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Container Component
const containerVariants = cva(
  'w-full mx-auto px-4 sm:px-6 lg:px-8',
  {
    variants: {
      size: {
        sm: 'max-w-2xl',
        md: 'max-w-4xl',
        lg: 'max-w-6xl',
        xl: 'max-w-7xl',
        full: 'max-w-full',
        screen: 'max-w-screen-2xl',
      },
      padding: {
        none: 'px-0',
        sm: 'px-2 sm:px-4',
        md: 'px-4 sm:px-6 lg:px-8',
        lg: 'px-6 sm:px-8 lg:px-12',
        xl: 'px-8 sm:px-12 lg:px-16',
      },
    },
    defaultVariants: {
      size: 'xl',
      padding: 'md',
    },
  }
);

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  asChild?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        className={cn(containerVariants({ size, padding }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Container.displayName = 'Container';

// Grid Component
const gridVariants = cva(
  'grid',
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
        auto: 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
        'auto-sm': 'grid-cols-[repeat(auto-fit,minmax(200px,1fr))]',
        'auto-lg': 'grid-cols-[repeat(auto-fit,minmax(300px,1fr))]',
      },
      gap: {
        none: 'gap-0',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
      },
      justify: {
        start: 'justify-items-start',
        center: 'justify-items-center',
        end: 'justify-items-end',
        stretch: 'justify-items-stretch',
      },
    },
    defaultVariants: {
      cols: 'auto',
      gap: 'md',
      align: 'stretch',
      justify: 'stretch',
    },
  }
);

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  asChild?: boolean;
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, align, justify, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        className={cn(gridVariants({ cols, gap, align, justify }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Grid.displayName = 'Grid';

// Flex Component
const flexVariants = cva(
  'flex',
  {
    variants: {
      direction: {
        row: 'flex-row',
        'row-reverse': 'flex-row-reverse',
        col: 'flex-col',
        'col-reverse': 'flex-col-reverse',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      wrap: {
        nowrap: 'flex-nowrap',
        wrap: 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse',
      },
      gap: {
        none: 'gap-0',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
      },
    },
    defaultVariants: {
      direction: 'row',
      align: 'center',
      justify: 'start',
      wrap: 'nowrap',
      gap: 'md',
    },
  }
);

export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
  asChild?: boolean;
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction, align, justify, wrap, gap, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        className={cn(flexVariants({ direction, align, justify, wrap, gap }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Flex.displayName = 'Flex';

// Stack Component (Vertical Flex)
export interface StackProps
  extends Omit<FlexProps, 'direction'> {
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, spacing = 'md', gap, ...props }, ref) => {
    return (
      <Flex
        direction="col"
        gap={gap || spacing}
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);

Stack.displayName = 'Stack';

// HStack Component (Horizontal Flex)
export interface HStackProps
  extends Omit<FlexProps, 'direction'> {
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  ({ className, spacing = 'md', gap, ...props }, ref) => {
    return (
      <Flex
        direction="row"
        gap={gap || spacing}
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);

HStack.displayName = 'HStack';

// Section Component
const sectionVariants = cva(
  'w-full',
  {
    variants: {
      padding: {
        none: 'py-0',
        sm: 'py-8',
        md: 'py-12',
        lg: 'py-16',
        xl: 'py-20',
        '2xl': 'py-24',
      },
      background: {
        none: '',
        glass: 'bg-white/5 backdrop-blur-xl border-y border-white/10',
        'glass-card': 'bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl',
        gradient: 'bg-gradient-to-br from-primary/10 to-secondary/10',
      },
    },
    defaultVariants: {
      padding: 'md',
      background: 'none',
    },
  }
);

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  asChild?: boolean;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, padding, background, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'section';
    
    return (
      <Comp
        className={cn(sectionVariants({ padding, background }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Section.displayName = 'Section';

// Page Component
export interface PageProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  asChild?: boolean;
}

const Page = React.forwardRef<HTMLDivElement, PageProps>(
  ({ className, title, description, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        className={cn(
          'min-h-screen w-full relative overflow-hidden',
          className
        )}
        ref={ref}
        {...props}
      >
        {title && (
          <Head>
            <title>{title}</title>
            {description && <meta name="description" content={description} />}
          </Head>
        )}
        {children}
      </Comp>
    );
  }
);

Page.displayName = 'Page';

// PageHeader Component
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  asChild?: boolean;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        className={cn(
          'flex flex-col space-y-4 pb-8 md:flex-row md:items-center md:justify-between md:space-y-0',
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="space-y-2">
          {title && (
            <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-lg text-white/70">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
        {children}
      </Comp>
    );
  }
);

PageHeader.displayName = 'PageHeader';

// PageContent Component
export interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const PageContent = React.forwardRef<HTMLDivElement, PageContentProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        className={cn('flex-1 space-y-6', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

PageContent.displayName = 'PageContent';

// Spacer Component
export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  axis?: 'x' | 'y' | 'both';
  asChild?: boolean;
}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ className, size = 'md', axis = 'y', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    const sizeClasses = {
      xs: '2',
      sm: '4',
      md: '6',
      lg: '8',
      xl: '12',
      '2xl': '16',
      '3xl': '20',
    };
    
    const axisClasses = {
      x: `w-${sizeClasses[size]}`,
      y: `h-${sizeClasses[size]}`,
      both: `w-${sizeClasses[size]} h-${sizeClasses[size]}`,
    };
    
    return (
      <Comp
        className={cn(axisClasses[axis], className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Spacer.displayName = 'Spacer';

// Divider Component
export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'dashed' | 'dotted';
  asChild?: boolean;
}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation = 'horizontal', variant = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'hr';
    
    return (
      <Comp
        className={cn(
          'border-white/20',
          {
            'w-full border-t': orientation === 'horizontal',
            'h-full border-l': orientation === 'vertical',
            'border-solid': variant === 'default',
            'border-dashed': variant === 'dashed',
            'border-dotted': variant === 'dotted',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';

export {
  Container,
  Grid,
  Flex,
  Stack,
  HStack,
  Section,
  Page,
  PageHeader,
  PageContent,
  Spacer,
  Divider,
  containerVariants,
  gridVariants,
  flexVariants,
  sectionVariants,
};