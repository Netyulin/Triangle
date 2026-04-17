import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: string
  description?: string
  icon?: ReactNode
  iconClassName?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon,
  iconClassName,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm",
              iconClassName ??
                "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400",
            )}
          >
            {icon}
          </span>
        ) : null}

        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
