// Supabase Edge Function: recebe o texto de uma mensagem (ex: colado do
// WhatsApp) e usa a API da Claude pra extrair os dados do pedido — cliente,
// itens (produto/quantidade/unidade) e data de entrega — tentando casar com
// o que já está cadastrado no banco. Isso existe pra manter a chave da
// Anthropic fora do navegador: o app nunca chama a API da Claude direto,
// só chama esta função (que guarda a chave como "secret" do Supabase).
//
// Deploy: supabase functions deploy gerar-pedido
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from 'npm:@anthropic-ai/sdk@^0.124.0'
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@^0.124.0/helpers/zod'
import { z } from 'npm:zod@^4.0.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

// Item do pedido: produto_id/unidade_id só vêm preenchidos quando a IA tem
// certeza real de que é o mesmo cadastro já existente — na dúvida, fica
// null e a pessoa escolhe/confirma na tela, igual digitação manual.
const ItemSchema = z.object({
  produto: z.string().describe('Nome do produto exatamente como identificado na mensagem'),
  produto_id: z
    .string()
    .nullable()
    .describe('id de um produto já cadastrado, só se tiver certeza de que é o mesmo. null se for produto novo ou não tiver certeza.'),
  quantidade: z
    .number()
    .nullable()
    .describe('Quantidade exata mencionada. NUNCA invente ou arredonde — se não estiver clara, use null.'),
  unidade_id: z
    .string()
    .nullable()
    .describe('id de uma unidade cadastrada que combine com o pedido (kilo, caixas, unidades...). null se não der pra saber.'),
})

const PedidoExtraidoSchema = z.object({
  cliente_id: z
    .string()
    .nullable()
    .describe('id de um cliente já cadastrado, só se a mensagem deixar claro quem é. null se não tiver certeza.'),
  data_entrega: z.string().nullable().describe('Data de entrega pedida, em YYYY-MM-DD. null se não for mencionada.'),
  observacao: z.string().nullable().describe('Qualquer observação extra do pedido. null se não houver.'),
  itens: z.array(ItemSchema),
})

function idPorNome(lista: any[], nome: string) {
  return lista.find((item) => item.nome?.toUpperCase() === nome)?.id ?? null
}

function montarPrompt(clientes: any[], produtos: any[], unidades: any[]) {
  const idUnidadeGenerica = idPorNome(unidades, 'UNIDADES')

  return `Você extrai dados de pedidos de uma distribuidora a partir de mensagens de clientes, geralmente copiadas do WhatsApp.

Clientes já cadastrados:
${JSON.stringify(clientes.map((c) => ({ id: c.id, nome: c.nome })))}

Produtos já cadastrados:
${JSON.stringify(produtos.map((p) => ({ id: p.id, nome: p.nome })))}

Unidades de medida disponíveis:
${JSON.stringify(unidades.map((u) => ({ id: u.id, nome: u.nome })))}

Regras importantes, siga à risca:
- Nunca invente um item que não foi mencionado na mensagem.
- Nunca invente ou arredonde uma quantidade — se não estiver clara, deixe null nesse item.
- Só preencha cliente_id ou produto_id quando tiver confiança real de que é o mesmo cadastro já existente (mesmo com grafia um pouco diferente). Na dúvida, deixe null — é preferível a pessoa confirmar manualmente do que a IA errar.
- Hoje é ${new Date().toISOString().slice(0, 10)}. Se a mensagem citar "amanhã", "sexta que vem" etc., calcule a data real em YYYY-MM-DD.
- Se a mensagem não parecer um pedido de verdade, devolva itens: [].

Sobre a unidade de cada item (unidade_id), diferente de cliente/produto, ela NUNCA deve ficar null — sempre preencha com a unidade mais provável:
- Preste atenção em abreviações e variações comuns em português, mesmo que não sejam exatamente o nome cadastrado: "caixa"/"caixas"/"cx" → CAIXAS; "kg"/"kilo"/"kilos"/"quilo"/"quilos" → KILO; "pacote"/"pacotes"/"pct" → PACOTES; "saco"/"sacos"/"sc" → SACOS; "fardo"/"fardos"/"fd" → FARDOS.
- Se a mensagem não especificar nenhuma unidade pra um item (só um número solto, tipo "2 arroz" ou "10 coca-cola"), use a unidade genérica${
    idUnidadeGenerica ? ` (id "${idUnidadeGenerica}", nome UNIDADES)` : ' "UNIDADES"'
  } — nunca deixe unidade_id como null.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { texto, clientes, produtos, unidades } = await req.json()

    if (!texto || typeof texto !== 'string' || !texto.trim()) {
      return new Response(JSON.stringify({ error: 'Texto vazio.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const response = await anthropic.messages.parse({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: montarPrompt(clientes || [], produtos || [], unidades || []),
      messages: [{ role: 'user', content: texto }],
      output_config: { format: zodOutputFormat(PedidoExtraidoSchema) },
    })

    if (!response.parsed_output) {
      return new Response(JSON.stringify({ error: 'Não consegui interpretar essa mensagem.' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ resultado: response.parsed_output }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro ao processar a mensagem.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
