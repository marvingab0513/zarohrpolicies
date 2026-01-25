create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'hr', 'employee')),
  is_active boolean not null default true,
  company_id uuid references companies(id),
  created_at timestamptz not null default now()
);

create table if not exists policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null,
  file_path text not null,
  uploaded_by uuid not null references user_profiles(id),
  company_id uuid references companies(id),
  created_at timestamptz not null default now()
);

create index if not exists policy_documents_policy_id_idx on policy_documents(policy_id);

create extension if not exists vector;

create table if not exists policy_chunks (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null,
  company_id uuid references companies(id),
  document_id uuid references policy_documents(id),
  chunk_text text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index if not exists policy_chunks_embedding_idx on policy_chunks using ivfflat (embedding vector_cosine_ops);
create index if not exists policy_chunks_policy_id_idx on policy_chunks(policy_id);

create or replace function match_policy_chunks(
  query_embedding vector(768),
  match_count int,
  filter_company uuid
)
returns table (
  id uuid,
  policy_id uuid,
  chunk_text text,
  similarity float
)
language sql stable as $$
  select
    policy_chunks.id,
    policy_chunks.policy_id,
    policy_chunks.chunk_text,
    1 - (policy_chunks.embedding <=> query_embedding) as similarity
  from policy_chunks
  where policy_chunks.company_id = filter_company
  order by policy_chunks.embedding <=> query_embedding
  limit match_count;
$$;
