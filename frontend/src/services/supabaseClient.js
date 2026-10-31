import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://knlzuwimaocubmpfquin.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubHp1d2ltYW9jdWJtcGZxdWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTc2MTIsImV4cCI6MjEwNTM5MzYxMn0.XjtaktQkIPqZoOMOCKHzHDf-u4nN0ZpAkv_zzaqkKqA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
