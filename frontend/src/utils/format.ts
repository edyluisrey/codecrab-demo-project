const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}
