// Thin wrapper around the Supabase client. Every function here degrades
// gracefully: if cloud isn't configured (js/cloud-config.js left blank),
// nothing in this file ever touches the network, and the app runs exactly
// as it did before cloud sync existed.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./cloud-config.js";

const TABLE = "reacher_cloud_data";
let clientPromise = null;

export function isCloudConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Loaded from a CDN only on first real use, and only when configured — so an
// unconfigured or fully-offline app never attempts this fetch.
async function getClient() {
  if (!isCloudConfigured()) return null;
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2").then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      })
    ).catch(err => {
      clientPromise = null; // allow retry once network/CDN issue clears
      throw err;
    });
  }
  return clientPromise;
}

export async function signUp(email, password) {
  const client = await getClient();
  if (!client) throw new Error("Cloud sync is not configured.");
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const client = await getClient();
  if (!client) throw new Error("Cloud sync is not configured.");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = await getClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function getSession() {
  const client = await getClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

/** callback(session|null) fires on sign-in, sign-out, and token refresh. */
export async function onAuthStateChange(callback) {
  const client = await getClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/** Upserts the caller's single data row. Throws on network/RLS failure — caller decides how to surface it. */
export async function pushToCloud(userId, data, schemaVersion) {
  const client = await getClient();
  if (!client) throw new Error("Cloud sync is not configured.");
  const { error } = await client
    .from(TABLE)
    .upsert({ user_id: userId, data, schema_version: schemaVersion }, { onConflict: "user_id" });
  if (error) throw error;
}

/** Returns { data, schemaVersion, updatedAt } or null if the user has no cloud row yet. */
export async function pullFromCloud(userId) {
  const client = await getClient();
  if (!client) throw new Error("Cloud sync is not configured.");
  const { data, error } = await client
    .from(TABLE)
    .select("data, schema_version, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { data: data.data, schemaVersion: data.schema_version, updatedAt: data.updated_at };
}
