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

-- Produtos: diferente das outras listas fixas, esta cresce sozinha — toda
-- vez que alguém digita um produto que ainda não existe aqui, o app cadastra
-- automaticamente, pra virar sugestão de autocompletar da próxima vez.
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_produtos_nome_lower on produtos (lower(nome));

insert into clientes (nome) values
  ('BTG'),
  ('W PREMIUM GUARULHOS'),
  ('W PREMIUM CONGONHAS'),
  ('GLOBAL LOUNGE'),
  ('SAPORE'),
  ('CAFÉ TRÊS CORAÇÕES'),
  ('BRADESCO GUARULHOS'),
  ('BRADESCO CONGONHAS'),
  ('DESPESAS DIVERSAS')
on conflict (nome) do nothing;

insert into unidades (nome) values
  ('UNIDADES'),
  ('KILO'),
  ('PACOTES'),
  ('CAIXAS'),
  ('SACOS'),
  ('FARDOS')
on conflict (nome) do nothing;

insert into metodos_pagamento (nome) values
  ('Crédito'),
  ('Débito'),
  ('Pix'),
  ('Dinheiro'),
  ('Boleto')
on conflict (nome) do nothing;

-- Cartões da empresa — só é usado quando a forma de pagamento do item é "Crédito"
create table if not exists cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into cartoes (nome) values
  ('AMEX'),
  ('XP'),
  ('BANCO DO BRASIL'),
  ('PASSAI')
on conflict (nome) do nothing;

-- Registro de cada leitura automática da IA (mensagem colada + resultado
-- devolvido) junto com se a pessoa marcou que acertou ou errou. Existe pra
-- analisar a precisão da IA num período de teste — não tem relação com os
-- pedidos de verdade.
create table if not exists pedido_ia_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  resultado jsonb not null,
  aprovado boolean not null,
  created_at timestamptz not null default now()
);

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

-- Itens de cada pedido. metodo_pagamento_id é como A EMPRESA pagou o
-- fornecedor por aquele item (controle interno de compra), preenchido
-- junto com o preço de compra na aba "Compras". cartao_id e parcelas só
-- fazem sentido quando o metodo_pagamento é "Crédito".
create table pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto text not null,
  quantidade numeric not null default 1,
  unidade_id uuid not null references unidades(id),
  preco_compra numeric,
  metodo_pagamento_id uuid references metodos_pagamento(id),
  cartao_id uuid references cartoes(id),
  parcelas integer,
  comprado boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_pedido_itens_pedido on pedido_itens(pedido_id);
create index if not exists idx_pedido_itens_produto on pedido_itens (lower(produto));
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
alter table cartoes enable row level security;
alter table produtos enable row level security;
alter table pedido_ia_avaliacoes enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

drop policy if exists "acesso total clientes" on clientes;
create policy "acesso total clientes" on clientes for all using (true) with check (true);

drop policy if exists "acesso total unidades" on unidades;
create policy "acesso total unidades" on unidades for all using (true) with check (true);

drop policy if exists "acesso total metodos_pagamento" on metodos_pagamento;
create policy "acesso total metodos_pagamento" on metodos_pagamento for all using (true) with check (true);

drop policy if exists "acesso total cartoes" on cartoes;
create policy "acesso total cartoes" on cartoes for all using (true) with check (true);

drop policy if exists "acesso total produtos" on produtos;
create policy "acesso total produtos" on produtos for all using (true) with check (true);

drop policy if exists "acesso total pedido_ia_avaliacoes" on pedido_ia_avaliacoes;
create policy "acesso total pedido_ia_avaliacoes" on pedido_ia_avaliacoes for all using (true) with check (true);

drop policy if exists "acesso total pedidos" on pedidos;
create policy "acesso total pedidos" on pedidos for all using (true) with check (true);

drop policy if exists "acesso total pedido_itens" on pedido_itens;
create policy "acesso total pedido_itens" on pedido_itens for all using (true) with check (true);
