import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border-transparent px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-outline focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary",
        secondary: "bg-secondary-container text-on-secondary-container",
        destructive: "bg-error text-on-error",
        outline: "border border-outline-variant/20 text-on-surface-variant",
        success: "bg-tertiary-fixed-dim/20 text-on-tertiary-container",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
