-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  color text not null default '#3B82F6',
  created_at timestamptz not null default now()
);

-- Family Groups
create table public.family_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  invite_code text not null unique default upper(substring(md5(random()::text), 1, 8)),
  created_at timestamptz not null default now()
);

-- Family Members
create table public.family_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.family_groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Events
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.family_groups(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean not null default false,
  color text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references public.family_groups(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  completed boolean not null default false,
  completed_at timestamptz,
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  recurrence_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('event', 'task')),
  entity_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reactions
create table public.reactions (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null check (entity_type in ('event', 'task')),
  entity_id uuid not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null default '👍',
  created_at timestamptz not null default now(),
  unique(entity_type, entity_id, user_id, emoji)
);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger events_updated_at before update on public.events
  for each row execute function public.handle_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.handle_updated_at();
create trigger comments_updated_at before update on public.comments
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

-- Profiles: users can see all profiles in their groups
create policy "Profiles are viewable by group members" on public.profiles
  for select using (
    auth.uid() = id or
    exists (
      select 1 from public.family_members fm1
      join public.family_members fm2 on fm1.group_id = fm2.group_id
      where fm1.user_id = auth.uid() and fm2.user_id = profiles.id
    )
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Family groups: members can read, admins can update/delete
create policy "Group members can view groups" on public.family_groups
  for select using (
    exists (select 1 from public.family_members where group_id = id and user_id = auth.uid())
  );

create policy "Authenticated users can create groups" on public.family_groups
  for insert with check (auth.uid() = created_by);

create policy "Group admins can update" on public.family_groups
  for update using (
    exists (select 1 from public.family_members where group_id = id and user_id = auth.uid() and role = 'admin')
  );

-- Family members
create policy "Group members can view members" on public.family_members
  for select using (
    exists (select 1 from public.family_members fm where fm.group_id = group_id and fm.user_id = auth.uid())
  );

create policy "Users can join groups" on public.family_members
  for insert with check (auth.uid() = user_id);

create policy "Admins can remove members" on public.family_members
  for delete using (
    user_id = auth.uid() or
    exists (select 1 from public.family_members fm where fm.group_id = group_id and fm.user_id = auth.uid() and fm.role = 'admin')
  );

-- Events
create policy "Group members can view events" on public.events
  for select using (
    exists (select 1 from public.family_members where group_id = events.group_id and user_id = auth.uid())
  );

create policy "Group members can create events" on public.events
  for insert with check (
    auth.uid() = created_by and
    exists (select 1 from public.family_members where group_id = events.group_id and user_id = auth.uid())
  );

create policy "Creator can update events" on public.events
  for update using (auth.uid() = created_by);

create policy "Creator can delete events" on public.events
  for delete using (auth.uid() = created_by);

-- Tasks
create policy "Group members can view tasks" on public.tasks
  for select using (
    exists (select 1 from public.family_members where group_id = tasks.group_id and user_id = auth.uid())
  );

create policy "Group members can create tasks" on public.tasks
  for insert with check (
    auth.uid() = created_by and
    exists (select 1 from public.family_members where group_id = tasks.group_id and user_id = auth.uid())
  );

create policy "Group members can update tasks" on public.tasks
  for update using (
    exists (select 1 from public.family_members where group_id = tasks.group_id and user_id = auth.uid())
  );

create policy "Creator can delete tasks" on public.tasks
  for delete using (auth.uid() = created_by);

-- Comments
create policy "Group members can view comments" on public.comments
  for select using (
    exists (
      select 1 from public.events e
      join public.family_members fm on e.group_id = fm.group_id
      where e.id = comments.entity_id and fm.user_id = auth.uid() and comments.entity_type = 'event'
    ) or
    exists (
      select 1 from public.tasks t
      join public.family_members fm on t.group_id = fm.group_id
      where t.id = comments.entity_id and fm.user_id = auth.uid() and comments.entity_type = 'task'
    )
  );

create policy "Authenticated users can comment" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "Comment authors can update" on public.comments
  for update using (auth.uid() = user_id);

create policy "Comment authors can delete" on public.comments
  for delete using (auth.uid() = user_id);

-- Reactions
create policy "Group members can view reactions" on public.reactions
  for select using (
    exists (
      select 1 from public.events e
      join public.family_members fm on e.group_id = fm.group_id
      where e.id = reactions.entity_id and fm.user_id = auth.uid() and reactions.entity_type = 'event'
    ) or
    exists (
      select 1 from public.tasks t
      join public.family_members fm on t.group_id = fm.group_id
      where t.id = reactions.entity_id and fm.user_id = auth.uid() and reactions.entity_type = 'task'
    )
  );

create policy "Authenticated users can react" on public.reactions
  for insert with check (auth.uid() = user_id);

create policy "Users can remove own reactions" on public.reactions
  for delete using (auth.uid() = user_id);

-- Enable realtime for key tables
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.reactions;
