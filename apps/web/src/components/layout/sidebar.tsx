'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeftRight,
  BarChart3,
  BellRing,
  Bot,
  CalendarClock,
  CreditCard,
  FileText,
  FlaskConical,
  ClipboardPenLine,
  HandCoins,
  Home,
  ListChecks,
  MapPin,
  Package,
  Receipt,
  Repeat,
  ShoppingCart,
  Sprout,
  Tags,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const menuGroups = [
  {
    title: 'Início',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Home },
      { href: '/assistant', label: 'Assistente', icon: Bot },
      { href: '/alerts', label: 'Alertas e lembretes', icon: BellRing },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { href: '/revenues', label: 'Receitas', icon: BarChart3 },
      { href: '/expenses', label: 'Despesas', icon: Receipt },
      { href: '/bills', label: 'Boletos', icon: FileText },
      { href: '/bills/installments', label: 'Parcelamentos', icon: ListChecks },
      { href: '/bills/recurring', label: 'Boletos Recorrentes', icon: Repeat },
      { href: '/transfers', label: 'Transferências', icon: ArrowLeftRight },
      { href: '/cashflow/forecast', label: 'Fluxo de Caixa Projetado', icon: CalendarClock },
      { href: '/employee-payments', label: 'Pagamentos de Funcionários', icon: HandCoins },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { href: '/accounts', label: 'Contas', icon: CreditCard },
      { href: '/categories', label: 'Categorias', icon: Tags },
      { href: '/products', label: 'Produtos', icon: Package },
      { href: '/suppliers', label: 'Fornecedores', icon: Truck },
      { href: '/employees', label: 'Funcionários', icon: Users },
    ],
  },
  {
    title: 'Produção',
    items: [
      { href: '/safras', label: 'Safras', icon: Sprout },
      { href: '/farm-locations', label: 'Talhões/Locais', icon: MapPin },
      { href: '/supplies', label: 'Insumos', icon: FlaskConical },
      { href: '/input-purchases', label: 'Compras de Insumos', icon: ShoppingCart },
      { href: '/input-stock', label: 'Estoque de Insumos', icon: Warehouse },
      { href: '/input-applications', label: 'Aplicações de Insumos', icon: ClipboardPenLine },
    ],
  },
  {
    title: 'Relatórios',
    items: [{ href: '/reports/safras', label: 'Relatório por Safra', icon: FileText }],
  },
]

const upcomingItems: Array<{ label: string; icon: typeof FileText }> = []

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

function SidebarContent({ onNavigate, showClose }: { onNavigate?: () => void; showClose?: boolean }) {
  const pathname = usePathname()

  return (
    <>
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <p className="text-base font-semibold text-foreground">AgroFinance</p>
          <p className="text-xs text-muted-foreground">ERP</p>
        </div>
        {showClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            aria-label="Fechar menu"
            onClick={onNavigate}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {group.title}
            </p>

            {group.items.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium leading-snug transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}

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
    </>
  )
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 border-r bg-background lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fechar menu"
            onClick={onMobileClose}
          />
          <aside className="relative flex h-full min-h-0 w-72 max-w-[85vw] flex-col border-r bg-background shadow-xl">
            <SidebarContent onNavigate={onMobileClose} showClose />
          </aside>
        </div>
      )}
    </>
  )
}
