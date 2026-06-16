import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';

// Heading Component
const headingVariants = cva(
  'font-semibold tracking-tight text-foreground',
  {
    variants: {
      size: {
        h1: 'text-4xl lg:text-5xl',
        h2: 'text-3xl lg:text-4xl',
        h3: 'text-2xl lg:text-3xl',
        h4: 'text-xl lg:text-2xl',
        h5: 'text-lg lg:text-xl',
        h6: 'text-base lg:text-lg',
      },
      variant: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        accent: 'text-primary',
        gradient: 'bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent',
        glow: 'text-foreground',
      },
      weight: {
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
        extrabold: 'font-extrabold',
      },
    },
    defaultVariants: {
      size: 'h2',
      variant: 'default',
      weight: 'semibold',
    },
  }
);

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  asChild?: boolean;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, size, variant, weight, as, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : as || (size === 'h1' ? 'h1' : size === 'h2' ? 'h2' : size === 'h3' ? 'h3' : size === 'h4' ? 'h4' : size === 'h5' ? 'h5' : 'h6');
    
    return (
      <Comp
        className={cn(headingVariants({ size, variant, weight }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Heading.displayName = 'Heading';

// Text Component
const textVariants = cva(
  'text-foreground',
  {
    variants: {
      size: {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
      },
      variant: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        subtle: 'text-muted-foreground',
        accent: 'text-primary',
        success: 'text-income',
        warning: 'text-pending',
        error: 'text-expense',
        info: 'text-primary',
      },
      weight: {
        light: 'font-light',
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
      align: {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      },
    },
    defaultVariants: {
      size: 'base',
      variant: 'default',
      weight: 'normal',
      align: 'left',
    },
  }
);

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div' | 'label';
  asChild?: boolean;
}

const Text = React.forwardRef<React.ElementRef<'p'>, TextProps>(
  ({ className, size, variant, weight, align, as = 'p', asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(textVariants({ size, variant, weight, align }), className)}
          {...props}
        />
      );
    }
    
    const Comp = as;
    
    return (
      <Comp
          className={cn(textVariants({ size, variant, weight, align }), className)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={ref as any}
          {...props}
        />
    );
  }
);

Text.displayName = 'Text';

// Label Component
const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        required: 'text-foreground after:content-["*"] after:ml-0.5 after:text-destructive',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  asChild?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'label';
    
    return (
      <Comp
        className={cn(labelVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

// Code Component
const codeVariants = cva(
  'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground border border-border',
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground border-border',
        muted: 'bg-muted/60 text-muted-foreground border-border',
        accent: 'bg-primary/15 text-primary border-primary/30',
      },
      size: {
        sm: 'text-xs px-1 py-0.5',
        md: 'text-sm px-[0.3rem] py-[0.2rem]',
        lg: 'text-base px-2 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface CodeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof codeVariants> {
  asChild?: boolean;
}

const Code = React.forwardRef<HTMLElement, CodeProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'code';
    
    return (
      <Comp
        className={cn(codeVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Code.displayName = 'Code';

// Blockquote Component
export interface BlockquoteProps extends React.BlockquoteHTMLAttributes<HTMLQuoteElement> {
  asChild?: boolean;
}

const Blockquote = React.forwardRef<HTMLQuoteElement, BlockquoteProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'blockquote';
    
    return (
      <Comp
        className={cn(
          'mt-6 border-l-2 border-border pl-6 italic text-muted-foreground',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Blockquote.displayName = 'Blockquote';

// List Component
export interface ListProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'ul' | 'ol';
  variant?: 'default' | 'ordered' | 'unordered';
  asChild?: boolean;
}

const List = React.forwardRef<React.ElementRef<'ul'>, ListProps>(
  ({ className, as = 'ul', variant = 'unordered', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : as;
    
    return (
      <Comp
          className={cn(
            'my-6 ml-6 list-outside text-muted-foreground',
            {
              'list-disc': variant === 'unordered' || as === 'ul',
              'list-decimal': variant === 'ordered' || as === 'ol',
            },
            className
          )}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={ref as any}
          {...props}
        />
    );
  }
);

List.displayName = 'List';

// List Item Component
export interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  asChild?: boolean;
}

const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'li';
    
    return (
      <Comp
        className={cn('mt-2', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

ListItem.displayName = 'ListItem';

// Lead Text Component
export interface LeadProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

const Lead = React.forwardRef<HTMLParagraphElement, LeadProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'p';
    
    return (
      <Comp
        className={cn('text-xl text-muted-foreground', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Lead.displayName = 'Lead';

// Large Text Component
export interface LargeProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const Large = React.forwardRef<HTMLDivElement, LargeProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        className={cn('text-lg font-semibold text-foreground', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Large.displayName = 'Large';

// Small Text Component
export interface SmallProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

const Small = React.forwardRef<HTMLElement, SmallProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'small';
    
    return (
      <Comp
        className={cn('text-sm font-medium leading-none text-muted-foreground', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Small.displayName = 'Small';

// Muted Text Component
export interface MutedProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

const Muted = React.forwardRef<HTMLParagraphElement, MutedProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'p';
    
    return (
      <Comp
        className={cn('text-sm text-muted-foreground', className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Muted.displayName = 'Muted';

export {
  Heading,
  Text,
  Label,
  Code,
  Blockquote,
  List,
  ListItem,
  Lead,
  Large,
  Small,
  Muted,
  headingVariants,
  textVariants,
  labelVariants,
  codeVariants,
};