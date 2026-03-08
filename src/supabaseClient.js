import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ntccybfpjjtsntnplusz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Y2N5YmZwamp0c250bnBsdXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjYwMTMsImV4cCI6MjA4ODU0MjAxM30.v1x58Ds5ccym22HsFk-KqHORYuAXhlNb-f6nn3o5zhQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
