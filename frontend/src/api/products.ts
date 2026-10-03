import type { Product, ProductFilters, ProductList } from '../types'
import { apiClient } from './client'

export const productsApi = {
  async list(filters: ProductFilters = {}, signal?: AbortSignal): Promise<ProductList> {
    const params: Record<string, string> = {}
    if (filters.category) params.category = filters.category
    if (filters.search?.trim()) params.search = filters.search.trim()
    const { data } = await apiClient.get<ProductList>('/products', { params, signal })
    return data
  },

  async categories(): Promise<string[]> {
    const { data } = await apiClient.get<string[]>('/products/categories')
    return data
  },

  async get(id: number): Promise<Product> {
    const { data } = await apiClient.get<Product>(`/products/${id}`)
    return data
  },
}
