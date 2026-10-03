import type { Order, OrderCreate } from '../types'
import { apiClient } from './client'

export const ordersApi = {
  async create(payload: OrderCreate): Promise<Order> {
    const { data } = await apiClient.post<Order>('/orders', payload)
    return data
  },

  async list(): Promise<Order[]> {
    const { data } = await apiClient.get<Order[]>('/orders')
    return data
  },

  async get(id: number): Promise<Order> {
    const { data } = await apiClient.get<Order>(`/orders/${id}`)
    return data
  },
}
