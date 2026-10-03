import { Loader2 } from 'lucide-react'

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' } as const

interface SpinnerProps {
  size?: keyof typeof sizes
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return <Loader2 className={`animate-spin ${sizes[size]} ${className}`} aria-label="Loading" />
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-crab-600">
      <Spinner size="lg" />
    </div>
  )
}
