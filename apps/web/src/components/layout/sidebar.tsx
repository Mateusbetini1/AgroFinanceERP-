'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  CreditCard,
  FileText,
  HandCoins,
  Home,
  MapPin,
  Package,
  Receipt,
  Sprout,
  Tags,
  Truck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const enabledItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/cashflow/forecast', label: 'Fluxo Projetado', icon: CalendarClock },
  { href: '/accounts', label: 'Contas', icon: CreditCard },
  { href: '/categories', label: 'Categorias', icon: Tags },
  { href: '/products', label: 'Produtos', icon: Package },
  { href: '/suppliers', label: 'Fornecedores', icon: Truck },
  { href: '/revenues', label: 'Receitas', icon: BarChart3 },
  { href: '/expenses', label: 'Despesas', icon: Receipt },
  { href: '/bills', label: 'Boletos', icon: FileText },
  { href: '/safras', label: 'Safras', icon: Sprout },
  { href: '/farm-locations', label: 'Locais', icon: MapPin },
  { href: '/reports/safras', label: 'Relatorios', icon: FileText },
  { href: '/transfers', label: 'Transferências', icon: ArrowLeftRight },
  { href: '/employee-payments', label: 'Pagamentos', icon: HandCoins },
  { href: '/employees', label: 'Funcionários', icon: Users },
]

const upcomingItems: Array<{ label: string; icon: typeof FileText }> = []

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r bg-background lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <p className="text-base font-semibold text-foreground">AgroFinance</p>
          <p className="text-xs text-muted-foreground">ERP</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {enabledItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-3">
          {upcomingItems.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground/60"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
