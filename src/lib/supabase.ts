import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// These are public client settings, not secret credentials.
// Keep the Supabase service-role/secret key out of this app and repository.
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://wqnmrqxqivsvxeesbend.supabase.co";

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_jUmEi2mdoQEYtDOccCRjXg_huNQR56_";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  : null;
