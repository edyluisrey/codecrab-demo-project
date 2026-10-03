export interface User {
  id: number
  email: string
  full_name: string
  is_active: boolean
  created_at: string
}

export interface UserCreate {
  email: string
  full_name: string
  password: string
}

export interface AuthToken {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface Product {
  id: number
  sku: string
  name: string
  description: string
  category: string
  price: number
  stock: number
  image_url: string | null
  is_active: boolean
}

export interface ProductList {
  items: Product[]
  total: number
}

export interface ProductFilters {
  category?: string
  search?: string
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface Order {
  id: number
  status: OrderStatus
  total_amount: number
  payment_intent_id: string | null
  created_at: string
  updated_at: string
  items: OrderItem[]
}

export interface OrderItemCreate {
  product_id: number
  quantity: number
}

export interface OrderCreate {
  items: OrderItemCreate[]
  coupon_code?: string | null
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface ValidationErrorDetail {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface ApiErrorBody {
  detail: string | ValidationErrorDetail[]
  code: string
}

export interface ApiError {
  status: number | null
  code: string
  message: string
}
