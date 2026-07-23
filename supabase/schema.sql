-- Execute este script inteiro no Supabase: Project > SQL Editor > New query
-- Este script recria as tabelas de pedidos do zero (não preserva dados antigos).

create extension if not exists "pgcrypto";

drop table if exists pedido_pagamentos cascade;
drop table if exists pedido_itens cascade;
drop table if exists pedidos cascade;

-- Listas fixas (dropdowns) --------------------------------------------------

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists metodos_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into clientes (nome) values
  ('BTG'),
  ('W PREMIUM GUARULHOS'),
  ('W PREMIUM CONGONHAS'),
  ('GLOBAL LOUNGE'),
  ('SAPORE'),
  ('CAFÉ TRÊS CORAÇÕES'),
  ('BRADESCO GUARULHOS'),
  ('BRADESCO CONGONHAS')
on conflict (nome) do nothing;

insert into unidades (nome) values
  ('UNIDADES'),
  ('KILO'),
  ('PACOTES'),
  ('CAIXAS'),
  ('SACOS')
on conflict (nome) do nothing;

insert into metodos_pagamento (nome) values
  ('Crédito'),
  ('Débito'),
  ('Pix'),
  ('Dinheiro')
on conflict (nome) do nothing;

-- Pedidos (um por cliente/entrega) -------------------------------------------

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  data_pedido date not null default current_date,
  data_entrega date,
  status text not null default 'comprando' check (status in ('comprando', 'separado', 'entregue')),
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Itens de cada pedido
create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto text not null,
  quantidade numeric not null default 1,
  unidade_id uuid not null references unidades(id),
  preco_compra numeric,                     -- preço pago por unidade (preenchido na aba "Compras")
  comprado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Formas de pagamento usadas na entrega de um pedido (pode ter mais de uma)
create table pedido_pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  metodo_pagamento_id uuid not null references metodos_pagamento(id),
  valor numeric not null check (valor > 0),
  created_at timestamptz not null default now(),
  unique (pedido_id, metodo_pagamento_id)
);

create index if not exists idx_pedido_itens_pedido on pedido_itens(pedido_id);
create index if not exists idx_pedido_itens_produto on pedido_itens (lower(produto));
create index if not exists idx_pedido_pagamentos_pedido on pedido_pagamentos(pedido_id);
create index if not exists idx_pedidos_cliente on pedidos(cliente_id);

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
alter table clientes enable row level security;
alter table unidades enable row level security;
alter table metodos_pagamento enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
alter table pedido_pagamentos enable row level security;

drop policy if exists "acesso total clientes" on clientes;
create policy "acesso total clientes" on clientes for all using (true) with check (true);

drop policy if exists "acesso total unidades" on unidades;
create policy "acesso total unidades" on unidades for all using (true) with check (true);

drop policy if exists "acesso total metodos_pagamento" on metodos_pagamento;
create policy "acesso total metodos_pagamento" on metodos_pagamento for all using (true) with check (true);

drop policy if exists "acesso total pedidos" on pedidos;
create policy "acesso total pedidos" on pedidos for all using (true) with check (true);

drop policy if exists "acesso total pedido_itens" on pedido_itens;
create policy "acesso total pedido_itens" on pedido_itens for all using (true) with check (true);

drop policy if exists "acesso total pedido_pagamentos" on pedido_pagamentos;
create policy "acesso total pedido_pagamentos" on pedido_pagamentos for all using (true) with check (true);
