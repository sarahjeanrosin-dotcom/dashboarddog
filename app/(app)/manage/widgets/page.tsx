export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import WidgetsManager from '@/components/manage/WidgetsManager'

export default async function WidgetsPage() {
  const supabase = await createClient()
  const { data: widgets } = await supabase
    .from('widgets')
    .select('*')
    .order('name')

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Widgets</h1>
      <WidgetsManager initialWidgets={widgets ?? []} />
    </div>
  )
}
