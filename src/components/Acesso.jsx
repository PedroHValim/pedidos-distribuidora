import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, User, ArrowLeft } from 'lucide-react'
import '../acesso.css'

// Tela de entrada do app interno: o usuário escolhe como quer entrar.
//  - Normal: usa o app todo, menos editar um pedido que já foi lançado.
//  - Admin: tudo isso e também edita pedidos lançados (controle).
//
// A senha do admin fica aqui no código de propósito (pedido do dono). Pra não
// aparecer em texto puro no repositório, guardamos só o hash SHA-256 dela.
// ATENÇÃO: isso é um controle de uso (evita edição sem querer), não uma
// proteção de segurança — quem tem acesso ao código ainda pode contornar. Para
// proteger de verdade, o próximo passo é usar o login do Supabase + regras (RLS).
const HASH_SENHA_ADMIN = '5edd6b7ba99be850ab24ef3acbb3b0de8f0dcb9a04e70b819b87ab641c88faee'

async function sha256Hex(texto) {
  const bytes = new TextEncoder().encode(texto)
  const resumo = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function Acesso({ onEntrar }) {
  const [pedindoSenha, setPedindoSenha] = useState(false)
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [verificando, setVerificando] = useState(false)

  async function entrarComoAdmin(e) {
    e.preventDefault()
    setErro('')
    setVerificando(true)
    try {
      if (!crypto?.subtle) {
        setErro('Este navegador não consegue verificar a senha (precisa abrir pelo endereço https).')
        return
      }
      if ((await sha256Hex(senha)) === HASH_SENHA_ADMIN) {
        onEntrar('admin')
      } else {
        setErro('Senha incorreta.')
        setSenha('')
      }
    } finally {
      setVerificando(false)
    }
  }

  function voltar() {
    setPedindoSenha(false)
    setSenha('')
    setErro('')
    setMostrar(false)
  }

  return (
    <div className="acesso-wrap">
      <div className="acesso-card">
        <div className="eyebrow">controle de pedidos</div>
        <h1 className="title">Distribuidora</h1>

        {!pedindoSenha ? (
          <>
            <p className="acesso-sub">Como você quer entrar?</p>
            <div className="acesso-opcoes">
              <button type="button" className="acesso-opcao" onClick={() => onEntrar('normal')}>
                <User size={22} />
                <span className="acesso-opcao-titulo">Normal</span>
              </button>
              <button type="button" className="acesso-opcao acesso-opcao-admin" onClick={() => setPedindoSenha(true)}>
                <ShieldCheck size={22} />
                <span className="acesso-opcao-titulo">Admin</span>
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={entrarComoAdmin} className="acesso-form">
            <p className="acesso-sub">Senha do administrador</p>
            <div className="acesso-senha">
              <input
                className="input acesso-input"
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                autoFocus
                autoComplete="current-password"
                aria-label="Senha do administrador"
              />
              <button
                type="button"
                className="acesso-olho"
                onClick={() => setMostrar((v) => !v)}
                aria-label={mostrar ? 'Esconder senha' : 'Mostrar senha'}
              >
                {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {erro && <div className="acesso-erro">{erro}</div>}
            <div className="acesso-botoes">
              <button type="button" className="acesso-voltar" onClick={voltar}>
                <ArrowLeft size={14} /> Voltar
              </button>
              <button type="submit" className="acesso-entrar" disabled={!senha || verificando}>
                {verificando ? 'Verificando…' : 'Entrar como Admin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
