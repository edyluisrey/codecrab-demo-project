import { LogIn, LogOut, Package, ShoppingCart, Store, UserCircle2 } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { Button } from './Button'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-crab-50 text-crab-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-2xl" aria-hidden>
            🦀
          </span>
          <span className="hidden sm:inline">codecrab-demo-project</span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <Store className="h-4 w-4" />
            <span className="hidden md:inline">Catalog</span>
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/orders" className={navLinkClass}>
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">Orders</span>
            </NavLink>
          )}
          <NavLink to="/cart" className={navLinkClass} aria-label={`Cart with ${itemCount} items`}>
            <span className="relative">
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-2.5 -top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crab-600 px-1 text-[10px] font-bold text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </span>
            <span className="hidden md:inline">Cart</span>
          </NavLink>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <span className="hidden items-center gap-1.5 text-sm text-slate-600 sm:flex">
                <UserCircle2 className="h-4 w-4" />
                {user.full_name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
