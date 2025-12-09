// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// ใส่ ! เพื่อบอก TypeScript ว่าตัวแปรนี้มีค่าแน่นอน (ไม่ null)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)