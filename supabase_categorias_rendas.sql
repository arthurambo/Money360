-- Money360 — tabelas para categorias e fontes de renda
-- Execute este script no SQL Editor do seu projeto Supabase.

-- ── Categorias (tipo: receita / despesa / assinatura) ──────────────
create table if not exists public.categorias (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  emoji      text not null default '📦',
  nome       text not null,
  tipo       text not null check (tipo in ('receita','despesa','assinatura')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.categorias enable row level security;

create policy "categorias_select_own" on public.categorias
  for select using (auth.uid() = user_id);
create policy "categorias_insert_own" on public.categorias
  for insert with check (auth.uid() = user_id);
create policy "categorias_update_own" on public.categorias
  for update using (auth.uid() = user_id);
create policy "categorias_delete_own" on public.categorias
  for delete using (auth.uid() = user_id);

-- ── Fontes de renda ─────────────────────────────────────────────────
create table if not exists public.rendas (
  id              uuid primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  nome            text not null,
  valor           numeric not null,
  dia_recebimento int,
  categoria       text not null default 'outros_receita',
  notas           text,
  created_at      timestamptz not null default now()
);

alter table public.rendas enable row level security;

create policy "rendas_select_own" on public.rendas
  for select using (auth.uid() = user_id);
create policy "rendas_insert_own" on public.rendas
  for insert with check (auth.uid() = user_id);
create policy "rendas_update_own" on public.rendas
  for update using (auth.uid() = user_id);
create policy "rendas_delete_own" on public.rendas
  for delete using (auth.uid() = user_id);
