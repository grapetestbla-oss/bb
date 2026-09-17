import { Suspense } from 'react'
import { CatalogView } from '@/components/catalog-view'

export const metadata = { title: 'Каталог сетапов — FANTASTIQUEBOY SETUPS' }

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Загрузка каталога…</div>}>
      <CatalogView />
    </Suspense>
  )
}
