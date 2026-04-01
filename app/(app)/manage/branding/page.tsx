import { createClient } from '@/lib/supabase/server'
import BrandingEditor from '@/components/manage/BrandingEditor'

export default async function BrandingPage() {
  const supabase = await createClient()
  const { data: branding } = await supabase.from('branding').select('*').single()

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Branding</h1>
      <BrandingEditor branding={branding} />
    </div>
  )
}
