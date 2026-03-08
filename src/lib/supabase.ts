import { createClient } from '@supabase/supabase-js';

// Read from env vars (injected at build time by Vite), with hardcoded fallbacks
// so deployment works even if the host doesn't inject them correctly.
const FALLBACK_URL = 'https://oyukwinukknfgebibsqc.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dWt3aW51a2tuZmdlYmlic3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyODE1MjIsImV4cCI6MjA4Mzg1NzUyMn0.tTrFitA4F51e1H4ZNwqlvDcI-cBD6Q3IGmesqPiSy_M';

const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

console.log("Supabase Client initialized with URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
