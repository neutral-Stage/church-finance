import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-white/10 backdrop-blur-xl text-white hover:bg-white/15",
        secondary:
          "border-white/20 bg-white/5 backdrop-blur-xl text-white hover:bg-white/10",
        destructive:
          "border-red-500/30 bg-red-500/20 backdrop-blur-xl text-white hover:bg-red-500/30",
        outline: "border-white/20 bg-transparent text-white hover:bg-white/5",
        success:
          "border-green-500/30 bg-green-500/20 backdrop-blur-xl text-white hover:bg-green-500/30",
        warning:
          "border-yellow-500/30 bg-yellow-500/20 backdrop-blur-xl text-white hover:bg-yellow-500/30",
        info:
          "border-blue-500/30 bg-blue-500/20 backdrop-blur-xl text-white hover:bg-blue-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }