-- Execute este script inteiro no Supabase: Project > SQL Editor > New query

create extension if not exists "pgcrypto";

-- Pedidos (um por cliente/entrega)
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  data_pedido date not null default current_date,
  data_entrega date,
  status text not null default 'comprando' check (status in ('comprando', 'separado', 'entregue')),
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Itens de cada pedido
create table if not exists pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto text not null,
  quantidade numeric not null default 1,
  preco_venda numeric not null default 0,   -- preço cobrado do cliente
  desconto numeric not null default 0,      -- desconto em R$ no item
  preco_compra numeric,                     -- preço pago na compra (preenchido na aba "Compras")
  comprado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_pedido_itens_pedido on pedido_itens(pedido_id);
create index if not exists idx_pedido_itens_produto on pedido_itens (lower(produto));

-- Mantém updated_at em dia
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pedidos_updated_at on pedidos;
create trigger trg_pedidos_updated_at
  before update on pedidos
  for each row execute function set_updated_at();

-- RLS: como o site é estático e usa a chave "anon" (pública) direto do navegador,
-- habilitamos RLS e liberamos acesso total por enquanto (não há login de usuário).
-- Isso é adequado para uso pessoal/familiar, mas qualquer pessoa com o link do site
-- consegue ler e escrever os dados. Se quiser restringir por senha/login no futuro,
-- dá para trocar estas policies por regras que checam auth.uid().
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

drop policy if exists "acesso total pedidos" on pedidos;
create policy "acesso total pedidos" on pedidos for all using (true) with check (true);

drop policy if exists "acesso total pedido_itens" on pedido_itens;
create policy "acesso total pedido_itens" on pedido_itens for all using (true) with check (true);
