import { cn } from "../../lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("shimmer-skeleton ui-transition", className)}
      {...props}
    />
  )
}

export { Skeleton }
