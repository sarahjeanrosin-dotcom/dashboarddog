export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import VerticalsManager from '@/components/manage/VerticalsManager'

export default async function VerticalsPage() {
  const supabase = await createClient()
  const [{ data: verticals }, { data: widgets }] = await Promise.all([
    supabase.from('verticals').select('*, roles(*)').order('name'),
    supabase.from('widgets').select('id, name, screenshot_url, masked_url').order('name'),
  ])

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Verticals & Roles</h1>
      <VerticalsManager initialVerticals={verticals ?? []} allWidgets={widgets ?? []} />
    </div>
  )
}
