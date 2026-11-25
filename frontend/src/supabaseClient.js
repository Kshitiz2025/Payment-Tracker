import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function requestRegistrationCode(email) {
  // Confirm email must be enabled. The user chooses their actual password after verification.
  const password = `Aa1!${crypto.randomUUID()}`;
  const { data, error } = await supabase.auth.signUp({ email, password });

  // Supabase can return either a duplicate error or an obfuscated user with no identities.
  if (error?.code === 'user_already_exists' || error?.code === 'email_exists') {
    return 'account_exists';
  }
  if (error) throw error;

  if (data.session) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Email confirmation is required for registration.');
  }
  if (data.user?.identities?.length === 0) return 'account_exists';
  if (!data.user?.id) throw new Error('Registration could not be started.');

  return 'code_sent';
}
