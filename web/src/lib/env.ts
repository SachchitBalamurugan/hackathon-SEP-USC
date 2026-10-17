import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See web/.env.example.`);
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  // The Vercel Supabase integration provides SUPABASE_SERVICE_ROLE_KEY.
  supabaseServiceKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY || required("SUPABASE_SERVICE_KEY"),
  /** Optional: without it, material search falls back to full-text only. */
  openaiKey: () => process.env.OPENAI_API_KEY || null,
  cronSecret: () => process.env.CRON_SECRET || null,
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};
