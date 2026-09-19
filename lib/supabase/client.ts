import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Return a safe placeholder client during initial development if keys are not yet configured
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-anon-key"
    );
  }

  return createBrowserClient(url, anonKey);
}
