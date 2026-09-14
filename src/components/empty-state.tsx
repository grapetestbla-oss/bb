import { Inbox } from 'lucide-react'

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="rounded-full border border-border bg-muted p-3 text-muted-foreground">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="text-base font-semibold">{title}</div>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
