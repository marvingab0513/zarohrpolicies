create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'hr', 'employee')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null,
  file_path text not null,
  uploaded_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists policy_documents_policy_id_idx on policy_documents(policy_id);
