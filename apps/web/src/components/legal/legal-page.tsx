import Link from 'next/link'
import type { ReactNode } from 'react'

// Public contact for privacy requests; review before publishing these pages.
export const PRIVACY_EMAIL = 'mateus.betini@hotmail.com'

export function PrivacyContact() {
  return <a className="break-words text-primary underline underline-offset-4" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
}

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/" className="font-bold text-primary">AgroFinance</Link>
          <Link href="/login" className="text-sm underline underline-offset-4">Acessar sistema</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">AgroFinance ERP · AgroFinance Assistente</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-slate-500">Atualizado em 9 de setembro de 2026</p>
        <p className="mt-6 text-lg leading-relaxed text-slate-700">{intro}</p>
        <div className="mt-9 space-y-8 text-base leading-7 text-slate-700 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-950 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
      </main>
      <footer className="border-t bg-white">
        <nav aria-label="Informações legais" className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-3 px-5 py-6 text-sm">
          <Link href="/privacidade" className="underline underline-offset-4">Privacidade</Link>
          <Link href="/termos" className="underline underline-offset-4">Termos de uso</Link>
          <Link href="/exclusao-de-dados" className="underline underline-offset-4">Exclusão de dados</Link>
        </nav>
      </footer>
    </div>
  )
}
