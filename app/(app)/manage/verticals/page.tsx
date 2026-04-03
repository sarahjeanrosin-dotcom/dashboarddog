export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import VerticalsManager from '@/components/manage/VerticalsManager'

export default async function VerticalsPage() {
  const supabase = await createClient()
  const { data: verticals } = await supabase
    .from('verticals')
    .select('*, roles(*)')
    .order('name')

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Verticals & Roles</h1>
      <VerticalsManager initialVerticals={verticals ?? []} />
    </div>
  )
}
