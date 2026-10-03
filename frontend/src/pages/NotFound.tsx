import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🦀
      </p>
      <h1 className="text-3xl font-bold">404 - Page not found</h1>
      <p className="text-slate-600">This crab scuttled off somewhere else.</p>
      <Link to="/" className="text-crab-700 hover:underline">
        Back to catalog
      </Link>
    </div>
  )
}
