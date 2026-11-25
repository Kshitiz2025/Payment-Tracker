import { supabase } from './supabaseClient';

export async function requestAI(path, payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in again to continue.');
  const response = await fetch('/api/' + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (response.status === 429) throw new Error('Analysis quota reached. Please try again later.');
  if (!response.ok) throw new Error('Unable to complete this request. Check your session and try again.');
  return response.json();
}
