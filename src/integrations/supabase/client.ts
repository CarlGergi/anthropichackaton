import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { logger } from '@/lib/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Warn if environment variables are missing, but don't crash the app
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  logger.error('⚠️ Missing Supabase environment variables!');
  logger.error('VITE_SUPABASE_URL:', SUPABASE_URL || 'NOT SET');
  logger.error('VITE_SUPABASE_PUBLISHABLE_KEY:', SUPABASE_PUBLISHABLE_KEY ? 'SET' : 'NOT SET');
  logger.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.');
}

// Use fallback values to prevent app crash, but Supabase functions will fail gracefully
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-key',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
