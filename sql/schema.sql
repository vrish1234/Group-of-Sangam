-- Run in Supabase SQL editor
create table if not exists public.students (
  id bigint generated always as identity primary key,
  full_name text not null,
  phone text not null,
  email text not null,
  date_of_birth date,
  address text,
  school_name text not null,
  board text not null,
  class_name text not null,
  payment_status text not null,
  payment_reference text,
  document_url text,
  roll_number text,
  exam_center text,
  result_status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.system_settings (
  id bigint generated always as identity primary key,
  key text unique not null,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.system_settings (key, value)
values ('result_published', 'false')
on conflict (key) do nothing;

-- Optional index for heavy queries
create index if not exists idx_students_created_at on public.students (created_at desc);
