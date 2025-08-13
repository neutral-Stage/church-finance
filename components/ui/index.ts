// Glass Components
export * from './glass-card';
export * from './glass-button';
export * from './glass-table';

// Layout Components
export * from './layout';

// Typography Components
export * from './typography';

// Status & Badge Components
export * from './status-badge';

// Background Components
export * from './animated-background';

// Re-export existing components for consistency
export { Button } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Badge } from './badge';
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './table';
export { Alert, AlertDescription, AlertTitle } from './alert';
export { Input } from './input';
export { Label as UILabel } from './label';
export { Textarea } from './textarea';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu';
export { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './sheet';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';
export { Checkbox } from './checkbox';

// Loader Components
export { FullScreenLoader, InlineLoader } from './loader';

// Component Type Definitions
export type {
  GlassCardProps,
  GlassCardHeaderProps,
  GlassCardTitleProps,
  GlassCardDescriptionProps,
  GlassCardContentProps,
  GlassCardFooterProps,
} from './glass-card';

export type {
  GlassButtonProps,
  GlassButtonGroupProps,
  GlassIconButtonProps,
} from './glass-button';

export type {
  GlassTableProps,
  GlassTableHeaderProps,
  GlassTableBodyProps,
  GlassTableFooterProps,
  GlassTableRowProps,
  GlassTableHeadProps,
  GlassTableCellProps,
  GlassTableCaptionProps,
  GlassTableEmptyProps,
  GlassTableLoadingProps,
} from './glass-table';

export type {
  ContainerProps,
  GridProps,
  FlexProps,
  StackProps,
  HStackProps,
  SectionProps,
  PageProps,
  PageHeaderProps,
  PageContentProps,
  SpacerProps,
  DividerProps,
} from './layout';

export type {
  HeadingProps,
  TextProps,
  LabelProps,
  CodeProps,
  BlockquoteProps,
  ListProps,
  ListItemProps,
  LeadProps,
  LargeProps,
  SmallProps,
  MutedProps,
} from './typography';

export type {
  StatusBadgeProps,
  FinancialBadgeProps,
  PriorityBadgeProps,
  CategoryBadgeProps,
  AnimatedCounterBadgeProps,
} from './status-badge';

export type {
  AnimatedBackgroundProps,
  FloatingParticlesProps,
} from './animated-background';