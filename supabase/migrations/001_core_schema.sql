-- FastChat initial schema. Review and apply in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'FastChat user' check (char_length(display_name) between 1 and 60),
  avatar_url text,
  preferred_language text not null default 'fr' check (preferred_language in ('fr','en','sw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check (kind in ('direct','group')),
  title text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id, conversation_id);

create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_content text check (text_content is null or char_length(text_content) <= 700),
  media_url text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (text_content is not null or media_url is not null)
);

create index if not exists statuses_recent_idx on public.statuses (created_at desc);

-- Create a profile automatically for each newly registered account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'FastChat user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SECURITY DEFINER helpers avoid recursive RLS checks on conversation_members.
-- Their fixed search_path and schema-qualified table names are intentional.
create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_conversation_creator(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = target_conversation_id
      and c.created_by = (select auth.uid())
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;
revoke all on function public.is_conversation_creator(uuid) from public;
grant execute on function public.is_conversation_creator(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.statuses enable row level security;

-- Profiles are readable to signed-in users; only the owner can edit their profile.
drop policy if exists "profiles readable by authenticated users" on public.profiles;
create policy "profiles readable by authenticated users"
  on public.profiles for select to authenticated using (true);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

-- Only members can view conversations and membership lists.
drop policy if exists "members can view own conversations" on public.conversations;
create policy "members can view own conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
drop policy if exists "signed in users create conversations" on public.conversations;
create policy "signed in users create conversations"
  on public.conversations for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "members can view membership" on public.conversation_members;
create policy "members can view membership"
  on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
drop policy if exists "conversation creators add members" on public.conversation_members;
create policy "conversation creators add members"
  on public.conversation_members for insert to authenticated
  with check (public.is_conversation_creator(conversation_id) or user_id = (select auth.uid()));

drop policy if exists "members read messages" on public.messages;
create policy "members read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
drop policy if exists "members send messages as self" on public.messages;
create policy "members send messages as self"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
  );
drop policy if exists "senders update own messages" on public.messages;
create policy "senders update own messages"
  on public.messages for update to authenticated
  using (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
  )
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
  );

-- Active statuses are visible to signed-in users in this initial version.
drop policy if exists "signed in users read active statuses" on public.statuses;
create policy "signed in users read active statuses"
  on public.statuses for select to authenticated
  using (expires_at > now());
drop policy if exists "users create own statuses" on public.statuses;
create policy "users create own statuses"
  on public.statuses for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "users delete own statuses" on public.statuses;
create policy "users delete own statuses"
  on public.statuses for delete to authenticated
  using (user_id = (select auth.uid()));
