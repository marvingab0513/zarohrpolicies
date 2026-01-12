import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vyqzlupcmfjnhlkxchdk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cXpsdXBjbWZqbmhsa3hjaGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODc5NDQsImV4cCI6MjA4MjY2Mzk0NH0.SjlDdH6zD4Z5L9n8-5-TR7uEMnkVKjBQQ4jkOalga3M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
