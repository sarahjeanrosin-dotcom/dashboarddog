import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LayoutDashboard, Settings, Image, Users } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const [{ count: verticalCount }, { count: widgetCount }] = await Promise.all([
    supabase.from('verticals').select('*', { count: 'exact', head: true }),
    supabase.from('widgets').select('*', { count: 'exact', head: true }),
  ])

  const cards = [
    {
      href: '/builder',
      icon: LayoutDashboard,
      label: 'Dashboard Builder',
      description: 'Select a vertical and role to assemble and export a branded dashboard.',
      cta: 'Open Builder',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      href: '/manage/verticals',
      icon: Users,
      label: 'Verticals & Roles',
      description: `Manage ${verticalCount ?? 0} verticals and their associated roles.`,
      cta: 'Manage',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      href: '/manage/widgets',
      icon: Image,
      label: 'Widgets',
      description: `Manage ${widgetCount ?? 0} widgets — upload screenshots and apply anonymization masks.`,
      cta: 'Manage',
      color: 'bg-green-50 text-green-700 border-green-200',
    },
    {
      href: '/manage/branding',
      icon: Settings,
      label: 'Branding',
      description: 'Set logo, primary color, accent color, and font for exports.',
      cta: 'Edit Branding',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard Builder</h1>
      <p className="text-gray-500 mb-8">Assemble and export branded dashboard slides by vertical and role.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {cards.map(({ href, icon: Icon, label, description, cta, color }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
          >
            <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium w-fit ${color}`}>
              <Icon className="w-4 h-4" />
              {label}
            </div>
            <p className="text-sm text-gray-600 flex-1">{description}</p>
            <span className="text-sm font-semibold text-blue-600 group-hover:underline">{cta} →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
