// Supabase Edge Function: histórico de pedidos de UMA empresa, para o portal
// do cliente.
//
// Duas coisas aqui são deliberadas e não devem ser afrouxadas:
//
//  1. O cliente_id vem do token assinado, NUNCA do que o navegador mandou.
//     Se viesse do corpo da requisição, bastaria a pessoa trocar o número
//     para ler o histórico de outra empresa.
//  2. O select lista campo por campo, de propósito. Um "*" traria
//     preco_compra, metodo_pagamento e cartao — ou seja, quanto a RAV pagou
//     pelos produtos e como pagou. Isso é margem e não pode chegar ao cliente.
//
// Deploy: supabase functions deploy portal-pedidos
// Secret: supabase secrets set PORTAL_TOKEN_SECRET=<mesmo valor do portal-auth>

import { createClient } from 'npm:@supabase/supabase-js@^2.58.0'
import { lerToken } from '../_shared/token.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LIMITE = 40

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

// O cliente não precisa saber a etapa interna da operação. "Comprando"
// entregaria que a RAV ainda vai comprar o produto de um fornecedor, o que é
// informação da casa, não do cliente.
const STATUS_PARA_CLIENTE: Record<string, string> = {
  comprando: 'Em preparação',
  separado: 'Pronto para entrega',
  entregue: 'Entregue',
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    const { token } = await req.json()
    const sessao = await lerToken(token)

    if (!sessao) {
      return resposta({ error: 'Sessão inválida ou expirada. Entre de novo.' }, 401)
    }

    const { data, error } = await admin
      .from('pedidos')
      .select(
        'id,data_pedido,data_entrega,status,obs,created_at,pedido_itens(id,produto,quantidade,unidade:unidades(nome))'
      )
      .eq('cliente_id', sessao.cid)
      .order('created_at', { ascending: false })
      .limit(LIMITE)

    if (error) {
      console.error(error)
      return resposta({ error: 'Não consegui carregar seus pedidos.' }, 500)
    }

    const pedidos = (data || []).map((p) => ({
      id: p.id,
      data_pedido: p.data_pedido,
      data_entrega: p.data_entrega,
      situacao: STATUS_PARA_CLIENTE[p.status as string] || 'Em preparação',
      entregue: p.status === 'entregue',
      obs: p.obs,
      itens: (p.pedido_itens || []).map((it: Record<string, unknown>) => ({
        id: it.id,
        produto: it.produto,
        quantidade: it.quantidade,
        unidade: (it.unidade as { nome?: string } | null)?.nome ?? '',
      })),
    }))

    return resposta({ pedidos })
  } catch (err) {
    console.error(err)
    return resposta({ error: 'Erro ao carregar os pedidos.' }, 500)
  }
})
