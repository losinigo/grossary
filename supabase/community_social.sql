-- ============================================================
-- Community / Social Features Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add follower counts to profiles (if not already exist)
-- ============================================================
alter table profiles add column if not exists followers_count int default 0;
alter table profiles add column if not exists following_count int default 0;

-- 2. Follows table
-- ============================================================
create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists idx_follows_follower on follows (follower_id);
create index if not exists idx_follows_following on follows (following_id);

-- 3. RLS for follows table
-- ============================================================
alter table follows enable row level security;

drop policy if exists "follows_select" on follows;
drop policy if exists "follows_insert" on follows;
drop policy if exists "follows_delete" on follows;

create policy "follows_select" on follows for select using (true);
create policy "follows_insert" on follows for insert 
  with check (auth.uid() = follower_id);
create policy "follows_delete" on follows for delete 
  using (auth.uid() = follower_id);

-- 4. Functions for follow management
-- ============================================================

-- Increment follower counts on follow
create or replace function handle_follow_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles 
  set followers_count = followers_count + 1 
  where id = new.following_id;
  
  update public.profiles 
  set following_count = following_count + 1 
  where id = new.follower_id;
  
  return new;
end;
$$;

drop trigger if exists on_follow_insert on follows;
create trigger on_follow_insert
  after insert on follows
  for each row execute function handle_follow_insert();

-- Decrement follower counts on unfollow
create or replace function handle_follow_delete()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles 
  set followers_count = followers_count - 1 
  where id = old.following_id;
  
  update public.profiles 
  set following_count = following_count - 1 
  where id = old.follower_id;
  
  return old;
end;
$$;

drop trigger if exists on_follow_delete on follows;
create trigger on_follow_delete
  after delete on follows
  for each row execute function handle_follow_delete();

-- 5. Drop existing functions to allow parameter renames
-- ============================================================
drop function if exists search_members(text, int);
drop function if exists get_user_feed(uuid, int);
drop function if exists get_user_profile_stats(uuid);
drop function if exists get_user_contributions(uuid, int);
drop function if exists is_user_following(uuid, uuid);

-- 6. Search members function
-- ============================================================
-- ============================================================
create or replace function search_members(search_term text, limit_count int default 20)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  reputation_score int,
  followers_count int,
  following_count int,
  created_at timestamptz
)
language sql stable
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.reputation_score,
    p.followers_count,
    p.following_count,
    p.created_at
  from profiles p
  where display_name ilike '%' || search_term || '%'
  order by 
    case 
      when display_name ilike search_term then 0
      when display_name ilike search_term || '%' then 1
      else 2
    end,
    reputation_score desc
  limit limit_count;
$$;

-- 7. Get user feed (recent contributions from followed users)
-- ============================================================
create or replace function get_user_feed(p_user_id uuid, limit_count int default 20)
returns table (
  id uuid,
  user_id uuid,
  product_id uuid,
  store_id uuid,
  price numeric,
  created_at timestamptz,
  display_name text,
  avatar_url text,
  product_name text,
  brand text,
  store_name text
)
language sql stable
as $$
  select
    p.id,
    p.user_id,
    p.product_id,
    p.store_id,
    p.price,
    p.created_at,
    pr.display_name,
    pr.avatar_url,
    prod.name as product_name,
    prod.brand,
    s.name as store_name
  from prices p
  join profiles pr on pr.id = p.user_id
  join products prod on prod.id = p.product_id
  join stores s on s.id = p.store_id
  join follows f on f.following_id = p.user_id
  where f.follower_id = p_user_id
  order by p.created_at desc
  limit limit_count;
$$;

-- 8. Get user profile with activity stats
-- ============================================================
create or replace function get_user_profile_stats(p_user_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  reputation_score int,
  followers_count int,
  following_count int,
  contributions_count bigint,
  created_at timestamptz
)
language sql stable
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    p.reputation_score,
    p.followers_count,
    p.following_count,
    count(pr.id) as contributions_count,
    p.created_at
  from profiles p
  left join prices pr on pr.user_id = p.id
  where p.id = p_user_id
  group by p.id;
$$;

-- 9. Get recent contributions for a user
-- ============================================================
create or replace function get_user_contributions(p_user_id uuid, limit_count int default 20)
returns table (
  id uuid,
  product_id uuid,
  store_id uuid,
  price numeric,
  created_at timestamptz,
  product_name text,
  brand text,
  store_name text,
  confirmation_count bigint
)
language sql stable
as $$
  select
    p.id,
    p.product_id,
    p.store_id,
    p.price,
    p.created_at,
    prod.name as product_name,
    prod.brand,
    s.name as store_name,
    coalesce(
      (select count(*) filter (where c.confirmed = true)
       from confirmations c where c.price_id = p.id),
      0
    ) as confirmation_count
  from prices p
  join products prod on prod.id = p.product_id
  join stores s on s.id = p.store_id
  where p.user_id = p_user_id
  order by p.created_at desc
  limit limit_count;
$$;

-- 10. Check if user follows another user
-- ============================================================
create or replace function is_user_following(p_follower_id uuid, p_following_id uuid)
returns boolean
language sql stable
as $$
  select exists(
    select 1 from follows 
    where follows.follower_id = p_follower_id 
    and follows.following_id = p_following_id
  );
$$;
