import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { productsApi } from '../api/products'
import { ProductCard } from '../components/ProductCard'
import { PageSpinner } from '../components/Spinner'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import type { Product } from '../types'

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') ?? ''
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebouncedValue(search)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    productsApi
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (debouncedSearch.trim()) next.set('search', debouncedSearch.trim())
        else next.delete('search')
        return next
      },
      { replace: true },
    )
  }, [debouncedSearch, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    productsApi
      .list({ category: category || undefined, search: debouncedSearch }, controller.signal)
      .then((res) => setProducts(res.items))
      .catch(() => {
        if (!controller.signal.aborted) setProducts([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [category, debouncedSearch])

  const selectCategory = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set('category', value)
      else next.delete('category')
      return next
    })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Developer Tool Catalog</h1>
        <p className="text-slate-600">
          Hand-picked SaaS tools for modern engineering teams. Billed monthly, cancel anytime.
        </p>
      </section>

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-crab-500 focus:outline-none focus:ring-2 focus:ring-crab-200"
          />
        </label>
        <select
          value={category}
          onChange={(e) => selectCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-crab-500 focus:outline-none focus:ring-2 focus:ring-crab-200"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </section>

      {isLoading ? (
        <PageSpinner />
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-slate-500">No products match your filters.</p>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </div>
  )
}
