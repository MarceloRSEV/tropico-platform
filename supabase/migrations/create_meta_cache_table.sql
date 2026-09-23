-- Create meta_dashboard_cache table for storing latest Meta API data
-- This enables graceful fallback when Meta API is slow or unavailable

create table if not exists meta_dashboard_cache (
  id text primary key default 'latest',
  data jsonb not null,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

-- Enable RLS (Row Level Security)
alter table meta_dashboard_cache enable row level security;

-- Allow public read access (dashboard is public)
create policy "Allow public read" on meta_dashboard_cache
  for select using (true);

-- Allow service role to write (via API)
create policy "Allow service role write" on meta_dashboard_cache
  for insert, update using (auth.role() = 'service_role');

-- Create index on updated_at for faster queries
create index if not exists meta_dashboard_cache_updated_at
  on meta_dashboard_cache (updated_at desc);
