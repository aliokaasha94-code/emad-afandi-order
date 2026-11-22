const SUPABASE_URL = "https://cuppprqsttafhzulnyyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cHBwcnFzdHRhZmh6dWxueXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDA5MjQsImV4cCI6MjA5NTA3NjkyNH0.pcoLbQwqmwYUyu1qmy0PFZHJZddKk1zQQD3KoTsBHIY";

async function pingSupabase() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=order_number&limit=1`, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  return { ok: res.ok, status: res.status };
}

export default {
  async scheduled(_event, _env, _ctx) {
    const result = await pingSupabase();
    console.log("Supabase keepalive ping:", JSON.stringify(result));
  },
  async fetch() {
    const result = await pingSupabase();
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  },
};
