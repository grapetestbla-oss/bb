'use client'

import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SETUP_FIELDS, type SetupData } from '@/lib/f1-data'

export function SetupValues({ data, locked }: { data: Partial<SetupData> | null; locked?: boolean }) {
  const groups = Array.from(new Set(SETUP_FIELDS.map((f) => f.group)))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group} className="gap-0 border-border/70 bg-card/80 p-0">
          <div className="carbon border-b border-border/70 px-4 py-2.5">
            <h4 className="text-sm font-bold uppercase tracking-wide">{group}</h4>
          </div>
          <div className="divide-y divide-border/60">
            {SETUP_FIELDS.filter((f) => f.group === group).map((field) => {
              const value = data?.[field.key]
              const has = value !== undefined && value !== null
              return (
                <div key={field.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{field.label}</span>
                  {has ? (
                    <span className="font-mono font-semibold">
                      {String(value)}
                      {field.unit ? ` ${field.unit}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-muted-foreground/70">
                      <Lock className="h-3 w-3" /> {locked ? '••.•' : '—'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}
