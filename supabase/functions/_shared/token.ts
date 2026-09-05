// Token de sessão do portal do cliente, compartilhado entre as funções
// portal-auth (que emite) e portal-pedidos (que confere).
//
// Por que assinar: antes a sessão era só um JSON guardado no navegador com o
// cliente_id dentro. Pra preencher o nome da empresa isso bastava, mas na
// hora de LER o histórico não serve: bastaria a pessoa editar o localStorage,
// trocar o cliente_id e ver os pedidos de outra empresa. Com assinatura, o
// conteúdo só é aceito se tiver sido gerado aqui — mexer em qualquer letra
// invalida a assinatura, e a chave nunca sai do servidor.

const codificador = new TextEncoder()

// 30 dias: quem faz pedido usa sempre o mesmo aparelho, e pedir senha toda
// semana só faria a pessoa desistir de usar o portal.
export const VALIDADE_SEGUNDOS = 60 * 60 * 24 * 30

export interface ConteudoToken {
  cid: string // cliente_id (o cadastro do app interno)
  eid: string // id da conta do portal
  nome: string
  exp: number // expiração, em segundos desde 1970
}

function paraBase64Url(bytes: Uint8Array) {
  let texto = ''
  for (const b of bytes) texto += String.fromCharCode(b)
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64Url(texto: string) {
  const base = texto.replace(/-/g, '+').replace(/_/g, '/')
  const cru = atob(base.padEnd(Math.ceil(base.length / 4) * 4, '='))
  const bytes = new Uint8Array(new ArrayBuffer(cru.length))
  for (let i = 0; i < cru.length; i++) bytes[i] = cru.charCodeAt(i)
  return bytes
}

function segredo() {
  const valor = Deno.env.get('PORTAL_TOKEN_SECRET')
  // Sem segredo a assinatura não vale nada, então é melhor falhar alto do que
  // emitir token que qualquer um consegue forjar.
  if (!valor || valor.length < 16) {
    throw new Error('PORTAL_TOKEN_SECRET ausente ou curto demais no ambiente da função.')
  }
  return valor
}

async function chaveHmac() {
  return await crypto.subtle.importKey(
    'raw',
    codificador.encode(segredo()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

async function assinar(corpo: string) {
  const bits = await crypto.subtle.sign('HMAC', await chaveHmac(), codificador.encode(corpo))
  return paraBase64Url(new Uint8Array(bits))
}

// Comparação em tempo constante: sair no primeiro caractere diferente
// permitiria descobrir a assinatura correta aos poucos, medindo o tempo.
function iguaisEmTempoConstante(a: string, b: string) {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}

export async function gerarToken(dados: Omit<ConteudoToken, 'exp'>) {
  const conteudo: ConteudoToken = {
    ...dados,
    exp: Math.floor(Date.now() / 1000) + VALIDADE_SEGUNDOS,
  }
  const corpo = paraBase64Url(codificador.encode(JSON.stringify(conteudo)))
  return `${corpo}.${await assinar(corpo)}`
}

// Devolve o conteúdo do token, ou null se ele foi adulterado, veio quebrado
// ou já venceu. Quem chama deve tratar null como "não autenticado".
export async function lerToken(token: unknown): Promise<ConteudoToken | null> {
  if (typeof token !== 'string' || !token.includes('.')) return null

  const [corpo, assinatura] = token.split('.')
  if (!corpo || !assinatura) return null

  let esperada: string
  try {
    esperada = await assinar(corpo)
  } catch {
    return null
  }
  if (!iguaisEmTempoConstante(assinatura, esperada)) return null

  try {
    const conteudo = JSON.parse(new TextDecoder().decode(deBase64Url(corpo))) as ConteudoToken
    if (!conteudo?.cid || typeof conteudo.exp !== 'number') return null
    if (conteudo.exp < Math.floor(Date.now() / 1000)) return null
    return conteudo
  } catch {
    return null
  }
}
