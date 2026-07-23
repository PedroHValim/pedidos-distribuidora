# Pedidos — Distribuidora

Site para registrar pedidos de clientes, controlar as compras dos itens (com
comparação de preço em relação ao histórico) e acompanhar o status até a
entrega, com um painel de resultados.

- **Novo pedido**: registra cliente, itens, quantidade e preço de venda.
- **Compras**: para cada pedido em andamento, marca item por item como
  comprado e informa o preço pago. O app mostra se esse preço está **abaixo**,
  **na média** ou **acima** do histórico de compras daquele produto. Quando
  todos os itens estão marcados, o botão verde "Pedido completo" libera o
  pedido para entrega.
- **Pedidos**: acompanha os pedidos já separados até a entrega.
- **Painel**: receita, lucro estimado, ticket médio, produtos mais vendidos e
  status dos pedidos.

Os dados ficam em um banco Postgres no [Supabase](https://supabase.com) (tem
plano gratuito) — o site em si é só HTML/JS estático, publicado no GitHub
Pages, e se conecta direto ao banco pela internet. Assim, os pedidos feitos no
celular aparecem também no computador (e vice-versa).

> **Sobre segurança:** como o site não tem login, ele usa a chave "anon"
> (pública) do Supabase para ler e escrever os dados. Isso é adequado para uso
> pessoal/familiar com o link não divulgado, mas qualquer pessoa que tiver o
> link do site consegue ver e editar os pedidos. Se no futuro isso for um
> problema, dá para adicionar uma tela de login (Supabase Auth) — é só avisar.

---

## 1. Criar o banco de dados no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e um novo
   projeto (guarde a senha do banco, mas não vai precisar dela aqui).
2. No painel do projeto, abra **SQL Editor** → **New query**.
3. Cole todo o conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql)
   deste projeto e clique em **Run**. Isso cria as tabelas `pedidos` e
   `pedido_itens`.
4. Vá em **Project Settings → API**. Você vai precisar de dois valores:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (uma chave longa)

## 2. Rodar o projeto no seu computador (opcional, para testar antes)

Requer [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
npm install
cp .env.example .env
# edite o .env e cole a URL e a anon key do passo anterior
npm run dev
```

Abra o endereço que aparecer no terminal (geralmente `http://localhost:5173`).

## 3. Publicar no GitHub Pages

1. Crie um repositório novo no GitHub e envie estes arquivos para ele:

   ```bash
   git init
   git add .
   git commit -m "primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```

2. No repositório do GitHub, vá em **Settings → Secrets and variables →
   Actions → New repository secret** e crie dois segredos:
   - `VITE_SUPABASE_URL` — a Project URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` — a anon public key do Supabase

3. Ainda em **Settings**, vá em **Pages** e em "Build and deployment → Source"
   escolha **GitHub Actions**.

4. Pronto. A cada `git push` na branch `main`, o workflow em
   [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) builda o
   site e publica automaticamente. O link fica disponível em
   **Settings → Pages** depois do primeiro deploy (geralmente
   `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`).

## Estrutura do projeto

```
├── supabase/schema.sql        # rode isso no SQL Editor do Supabase
├── src/
│   ├── App.jsx                 # abas e chamadas ao banco
│   ├── supabaseClient.js       # conexão com o Supabase
│   ├── utils.js                # cálculos de totais, formatação
│   └── components/
│       ├── NovoPedido.jsx      # aba "Novo pedido"
│       ├── Compras.jsx         # aba "Compras" (com o indicador de preço)
│       ├── Pedidos.jsx         # aba "Pedidos" (status até entrega)
│       ├── Painel.jsx          # aba "Painel" (gráficos)
│       └── ui.jsx              # badge, indicador de preço, cards
└── .github/workflows/deploy.yml
```

## Limitações conhecidas / próximos passos possíveis

- Edição de um pedido já criado ainda não existe pela interface (dá para
  ajustar itens direto na aba Compras, mas não renomear cliente/datas depois
  de salvo). Posso adicionar se for útil.
- A comparação de preço usa a **média de todas as compras anteriores** do
  mesmo produto (nome exatamente igual, ignorando maiúsculas/minúsculas e
  espaços). Se o mesmo produto for digitado com nomes diferentes, o histórico
  não vai casar — vale manter um padrão de nomes.
- Sem login: qualquer pessoa com o link acessa e edita os dados.
- Se quiser importar o histórico da planilha Excel atual para dentro do
  Supabase, isso dá para ser feito à parte (um script que lê o Excel e insere
  os pedidos antigos).
