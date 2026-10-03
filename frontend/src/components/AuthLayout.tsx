import type { ReactNode } from 'react'

import { Card } from './Card'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="space-y-6">
        <div className="space-y-1 text-center">
          <div className="text-4xl" aria-hidden>
            🦀
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        {children}
        <p className="text-center text-sm text-slate-600">{footer}</p>
      </Card>
    </div>
  )
}

export const inputClass =
  'h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-crab-500 focus:outline-none focus:ring-2 focus:ring-crab-200'
