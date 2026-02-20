-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Extends Auth)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique,
  full_name text,
  role text check (role in ('admin', 'student')),
  assigned_exams jsonb default '[]'::jsonb, -- Store array of exam IDs
  created_at timestamp with time zone default now()
);

-- 2. Exams Table
create table exams (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  duration integer, -- minutes
  marks_per_question integer default 4,
  negative_marks integer default 1,
  questions jsonb default '[]'::jsonb, -- Storing questions structure as JSON
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

-- 3. Exam Results Table
create table exam_results (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id),
  student_id uuid references profiles(id),
  score integer,
  total_marks integer,
  correct_answers integer,
  wrong_answers integer,
  attempted integer,
  answers jsonb, -- detailed user responses
  submitted_at timestamp with time zone default now()
);

-- Row Level Security (RLS) Policies
alter table profiles enable row level security;
alter table exams enable row level security;
alter table exam_results enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can update any profile" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Exams Policies
create policy "Admins can do everything with exams" on exams for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Students can view exams" on exams for select using (true);

-- Exam Results Policies
create policy "Students can insert their own results" on exam_results for insert with check (auth.uid() = student_id);
create policy "Students can view their own results" on exam_results for select using (auth.uid() = student_id);
create policy "Admins can view all results" on exam_results for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Database Triggers for Auto-Profile Creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Storage Bucket for Question Images
insert into storage.buckets (id, name, public) 
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "Public Access to question-images" 
on storage.objects for select 
using ( bucket_id = 'question-images' );

create policy "Admins can upload question-images" 
on storage.objects for insert 
with check ( 
  bucket_id = 'question-images' and 
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') 
);
