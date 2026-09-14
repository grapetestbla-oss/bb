export function PageHeader({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  children?: React.ReactNode
}) {
  return (
    <div className="hero-grid border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-12">
        {eyebrow && (
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-primary/80">{eyebrow}</div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              <span className="text-gradient-gold">{title}</span>
            </h1>
            {subtitle && <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
