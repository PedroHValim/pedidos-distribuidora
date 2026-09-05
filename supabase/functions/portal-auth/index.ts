// Supabase Edge Function: cadastro e login das empresas que usam o portal
// do cliente. Existe como função (e não direto no navegador) por dois
// motivos que importam:
//
//  1. A tabela portal_empresas não tem NENHUMA policy de RLS, então a chave
//     anônima do site não lê nem escreve nada nela. Só esta função acessa,
//     usando a service_role — que ignora RLS. Assim a lista de empresas
//     cadastradas e os hashes de senha nunca ficam expostos no navegador.
//  2. A senha é comparada aqui dentro. Se a checagem fosse no front, bastaria
//     abrir o console pra pular ela.
//
// A senha nunca é guardada em texto: derivamos um hash PBKDF2-SHA256 com sal
// aleatório por empresa. Usamos Web Crypto (nativo do Deno) pra não depender
// de biblioteca externa.
//
// Deploy: supabase functions deploy portal-auth
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente)

import { createClient } from 'npm:@supabase/supabase-js@^2.58.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ITERACOES = 210000
const MIN_SENHA = 6

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

// Mesma normalização do app: ignora acento, maiúscula e espaço extra. É o que
// permite entrar digitando "cafe tres coracoes" tendo cadastrado
// "Café Três Corações".
function normaliza(texto: string) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function paraHex(bytes: Uint8Array) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function deHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function derivar(senha: string, sal: Uint8Array<ArrayBuffer>) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: ITERACOES, hash: 'SHA-256' },
    chave,
    256
  )
  return new Uint8Array(bits)
}

async function gerarHash(senha: string) {
  const sal = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const derivado = await derivar(senha, sal)
  return `pbkdf2$${ITERACOES}$${paraHex(sal)}$${paraHex(derivado)}`
}

// Comparação em tempo constante: sair no primeiro byte diferente permitiria
// medir o tempo de resposta pra adivinhar a senha aos poucos.
function iguaisEmTempoConstante(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a[i] ^ b[i]
  return diferenca === 0
}

async function conferirSenha(senha: string, guardado: string) {
  const partes = guardado.split('$')
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false
  const iteracoes = Number(partes[1])
  if (!Number.isFinite(iteracoes) || iteracoes < 1000) return false
  const sal = deHex(partes[2])
  const esperado = deHex(partes[3])
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: iteracoes, hash: 'SHA-256' },
    chave,
    esperado.length * 8
  )
  return iguaisEmTempoConstante(new Uint8Array(bits), esperado)
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Liga a empresa do portal a um cliente já cadastrado no app interno, pra que
// os pedidos dela caiam no mesmo agrupamento usado pelos filtros e pelo
// painel. Roda aqui no servidor: o navegador nunca vê a lista de clientes.
async function acharOuCriarCliente(nomeEmpresa: string) {
  const alvo = normaliza(nomeEmpresa)

  const { data: clientes } = await admin.from('clientes').select('id,nome')
  const existente = (clientes || []).find((c) => normaliza(c.nome) === alvo)
  if (existente) return existente.id

  const { data: novo, error } = await admin.from('clientes').insert({ nome: nomeEmpresa }).select('id').single()
  if (!error && novo?.id) return novo.id

  const { data: achado } = await admin.from('clientes').select('id').ilike('nome', nomeEmpresa).maybeSingle()
  if (achado?.id) return achado.id

  throw new Error('Não consegui registrar a empresa.')
}

async function cadastrar(nomeEmpresa: string, senha: string) {
  const nome = (nomeEmpresa || '').trim()
  if (nome.length < 2) return resposta({ error: 'Informe o nome da empresa.' }, 400)
  if ((senha || '').length < MIN_SENHA)
    return resposta({ error: `A senha precisa ter pelo menos ${MIN_SENHA} caracteres.` }, 400)

  const normalizado = normaliza(nome)

  const { data: jaExiste } = await admin
    .from('portal_empresas')
    .select('id')
    .eq('nome_normalizado', normalizado)
    .maybeSingle()

  if (jaExiste) {
    return resposta({ error: 'Já existe um acesso para essa empresa. Use "Entrar" ou fale com a gente.' }, 409)
  }

  const clienteId = await acharOuCriarCliente(nome)
  const senhaHash = await gerarHash(senha)

  const { data, error } = await admin
    .from('portal_empresas')
    .insert({ cliente_id: clienteId, nome_empresa: nome, nome_normalizado: normalizado, senha_hash: senhaHash })
    .select('id,cliente_id,nome_empresa')
    .single()

  if (error || !data) return resposta({ error: 'Não consegui criar o acesso. Tente de novo.' }, 500)

  return resposta({ sessao: { empresa_id: data.id, cliente_id: data.cliente_id, nome_empresa: data.nome_empresa } })
}

async function entrar(nomeEmpresa: string, senha: string) {
  const normalizado = normaliza(nomeEmpresa || '')

  const { data: conta } = await admin
    .from('portal_empresas')
    .select('id,cliente_id,nome_empresa,senha_hash,ativo')
    .eq('nome_normalizado', normalizado)
    .maybeSingle()

  // Mensagem igual pra empresa inexistente e senha errada: dizer qual dos dois
  // falhou entregaria de graça quais empresas têm cadastro.
  const generico = { error: 'Empresa ou senha incorreta.' }

  if (!conta) {
    // gasta um tempo parecido com o de uma conta real, pra não dar pra
    // descobrir quem é cliente só medindo a rapidez da resposta
    await gerarHash(senha || 'x')
    return resposta(generico, 401)
  }

  const ok = await conferirSenha(senha || '', conta.senha_hash)
  if (!ok) return resposta(generico, 401)
  if (conta.ativo === false) return resposta({ error: 'Este acesso está desativado. Fale com a gente.' }, 403)

  await admin.from('portal_empresas').update({ ultimo_acesso: new Date().toISOString() }).eq('id', conta.id)

  return resposta({ sessao: { empresa_id: conta.id, cliente_id: conta.cliente_id, nome_empresa: conta.nome_empresa } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    const { acao, empresa, senha } = await req.json()

    if (acao === 'cadastrar') return await cadastrar(empresa, senha)
    if (acao === 'entrar') return await entrar(empresa, senha)

    return resposta({ error: 'Ação inválida.' }, 400)
  } catch (err) {
    console.error(err)
    return resposta({ error: 'Erro ao processar a solicitação.' }, 500)
  }
})
