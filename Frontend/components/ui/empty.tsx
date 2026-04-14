import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const emptyVariants = cva(
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed p-8 text-center transition-all md:p-12',
  {
    variants: {
      variant: {
        default: 'border-border bg-card',
        muted: 'border-muted-foreground/20 bg-muted/50',
      },
      size: {
        default: '',
        sm: 'p-4 md:p-6',
        lg: 'p-12 md:p-16',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Empty({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof emptyVariants>) {
  return (
    <div
      data-slot="empty"
      className={cn(emptyVariants({ variant, size, className }))}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-3 text-center', className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  'flex shrink-0 items-center justify-center transition-transform [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: 'bg-secondary text-foreground flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-sm [&_svg:not([class*="size-"])]:size-7',
        'icon-lg': 'bg-secondary text-foreground flex size-20 shrink-0 items-center justify-center rounded-3xl shadow-md [&_svg:not([class*="size-"])]:size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('text-xl font-bold text-foreground tracking-tight', className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        'text-muted-foreground text-sm leading-relaxed [&>a:hover]:text-accent [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn('flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm', className)}
      {...props}
    />
  )
}

function EmptyAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-action"
      className={cn('flex flex-wrap items-center justify-center gap-3', className)}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
  EmptyAction,
}
