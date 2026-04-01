import { createClient } from '@/lib/supabase/server'
import BuilderClient from '@/components/builder/BuilderClient'

export default async function BuilderPage() {
  const supabase = await createClient()

  const [{ data: verticals }, { data: branding }] = await Promise.all([
    supabase.from('verticals').select('*, roles(*)').order('name'),
    supabase.from('branding').select('*').single(),
  ])

  return (
    <BuilderClient
      verticals={verticals ?? []}
      branding={branding}
    />
  )
}
