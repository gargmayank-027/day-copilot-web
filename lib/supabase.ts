import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zeauvlcubkunarvzvntf.supabase.co/'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplYXV2bGN1Ymt1bmFydnp2bnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTcyMDMsImV4cCI6MjA5MjU5MzIwM30.PWQz1W1GstSJkj1YW6OWxlqteCovs424JvPGYfHQ9H4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)