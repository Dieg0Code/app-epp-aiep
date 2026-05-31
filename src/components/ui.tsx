import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
      <span className="inline-block w-5 h-5 border-2 border-slate-300 border-t-brand-500 rounded-full animate-spin" />
      {label && <span>{label}</span>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {children}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const variants: Record<NonNullable<BtnProps['variant']>, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    ghost: 'text-brand-600 hover:bg-brand-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function EmptyState({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-slate-700 font-medium">{titulo}</p>
      {descripcion && <p className="text-slate-400 text-sm mt-1">{descripcion}</p>}
    </div>
  )
}

export function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-accent-600'
      }`}
    >
      {children}
    </span>
  )
}
