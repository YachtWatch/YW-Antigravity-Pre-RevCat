import { createClient } from '@supabase/supabase-js';

// These will be populated from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase Environment Variables. Database features will not work.');
} else if (supabaseUrl.includes('undefined') || supabaseUrl.includes('placeholder')) {
    console.warn('Supabase URL appears invalid (contains "undefined" or "placeholder"). Check your .env file.');
} else {
    console.log("Supabase Client initialized with URL:", supabaseUrl.substring(0, 15) + "...");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
