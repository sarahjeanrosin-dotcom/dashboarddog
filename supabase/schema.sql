-- ============================================================
-- Dashboard Builder — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- BRANDING
-- ============================================================
create table if not exists branding (
  id          uuid primary key default uuid_generate_v4(),
  logo_url    text,
  primary_color  text not null default '#1a56db',
  accent_color   text not null default '#e3a008',
  font_family    text not null default 'Inter',
  updated_at  timestamptz not null default now()
);

-- Seed a single branding row (app-wide)
insert into branding (id, primary_color, accent_color, font_family)
values ('00000000-0000-0000-0000-000000000001', '#1a56db', '#e3a008', 'Inter')
on conflict (id) do nothing;

-- ============================================================
-- VERTICALS
-- ============================================================
create table if not exists verticals (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROLES
-- ============================================================
create table if not exists roles (
  id            uuid primary key default uuid_generate_v4(),
  vertical_id   uuid not null references verticals(id) on delete cascade,
  title         text not null,
  blurb         text not null default '',
  avatar_emoji  text not null default '👤',
  created_at    timestamptz not null default now(),
  unique(vertical_id, title)
);

-- ============================================================
-- WIDGETS
-- ============================================================
create table if not exists widgets (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text not null default '',
  screenshot_url  text,              -- raw uploaded screenshot
  masked_url      text,              -- anonymized version (post-Konva mask)
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ROLE_WIDGETS  (many-to-many with ordering)
-- ============================================================
create table if not exists role_widgets (
  id          uuid primary key default uuid_generate_v4(),
  role_id     uuid not null references roles(id) on delete cascade,
  widget_id   uuid not null references widgets(id) on delete cascade,
  position    integer not null default 0,   -- display order within the role view
  x           float not null default 0,     -- saved canvas X position (% of frame)
  y           float not null default 0,     -- saved canvas Y position (% of frame)
  w           float not null default 0.45,  -- saved canvas width  (% of frame)
  h           float not null default 0.45,  -- saved canvas height (% of frame)
  unique(role_id, widget_id)
);

-- ============================================================
-- DASHBOARD LAYOUTS  (one saved state per vertical+role)
-- ============================================================
create table if not exists dashboard_layouts (
  id           uuid primary key default uuid_generate_v4(),
  vertical_id  uuid not null references verticals(id) on delete cascade,
  role_id      uuid not null references roles(id) on delete cascade,
  layout_json  jsonb not null default '[]',  -- array of { widget_id, x, y, w, h }
  updated_at   timestamptz not null default now(),
  unique(vertical_id, role_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- All tables: any authenticated user can read/write.
-- Auth is handled by Supabase Auth; anon is blocked.
-- ============================================================
alter table branding           enable row level security;
alter table verticals          enable row level security;
alter table roles              enable row level security;
alter table widgets            enable row level security;
alter table role_widgets       enable row level security;
alter table dashboard_layouts  enable row level security;

-- Branding
create policy "auth users can read branding"
  on branding for select using (auth.role() = 'authenticated');
create policy "auth users can update branding"
  on branding for update using (auth.role() = 'authenticated');

-- Verticals
create policy "auth users can read verticals"
  on verticals for select using (auth.role() = 'authenticated');
create policy "auth users can insert verticals"
  on verticals for insert with check (auth.role() = 'authenticated');
create policy "auth users can update verticals"
  on verticals for update using (auth.role() = 'authenticated');
create policy "auth users can delete verticals"
  on verticals for delete using (auth.role() = 'authenticated');

-- Roles
create policy "auth users can read roles"
  on roles for select using (auth.role() = 'authenticated');
create policy "auth users can insert roles"
  on roles for insert with check (auth.role() = 'authenticated');
create policy "auth users can update roles"
  on roles for update using (auth.role() = 'authenticated');
create policy "auth users can delete roles"
  on roles for delete using (auth.role() = 'authenticated');

-- Widgets
create policy "auth users can read widgets"
  on widgets for select using (auth.role() = 'authenticated');
create policy "auth users can insert widgets"
  on widgets for insert with check (auth.role() = 'authenticated');
create policy "auth users can update widgets"
  on widgets for update using (auth.role() = 'authenticated');
create policy "auth users can delete widgets"
  on widgets for delete using (auth.role() = 'authenticated');

-- Role Widgets
create policy "auth users can read role_widgets"
  on role_widgets for select using (auth.role() = 'authenticated');
create policy "auth users can insert role_widgets"
  on role_widgets for insert with check (auth.role() = 'authenticated');
create policy "auth users can update role_widgets"
  on role_widgets for update using (auth.role() = 'authenticated');
create policy "auth users can delete role_widgets"
  on role_widgets for delete using (auth.role() = 'authenticated');

-- Dashboard Layouts
create policy "auth users can read dashboard_layouts"
  on dashboard_layouts for select using (auth.role() = 'authenticated');
create policy "auth users can insert dashboard_layouts"
  on dashboard_layouts for insert with check (auth.role() = 'authenticated');
create policy "auth users can update dashboard_layouts"
  on dashboard_layouts for update using (auth.role() = 'authenticated');
create policy "auth users can delete dashboard_layouts"
  on dashboard_layouts for delete using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKETS
-- Create these in the Supabase dashboard or via CLI:
--   supabase storage create screenshots --public=false
--   supabase storage create logos --public=true
-- Or run the following:
-- ============================================================
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can read/write screenshots bucket
create policy "auth users can upload screenshots"
  on storage.objects for insert
  with check (bucket_id = 'screenshots' and auth.role() = 'authenticated');

create policy "auth users can read screenshots"
  on storage.objects for select
  using (bucket_id = 'screenshots' and auth.role() = 'authenticated');

create policy "auth users can delete screenshots"
  on storage.objects for delete
  using (bucket_id = 'screenshots' and auth.role() = 'authenticated');

-- Logos bucket is public read, auth write
create policy "public can read logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "auth users can upload logos"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

create policy "auth users can delete logos"
  on storage.objects for delete
  using (bucket_id = 'logos' and auth.role() = 'authenticated');
