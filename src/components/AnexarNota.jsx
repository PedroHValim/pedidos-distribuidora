import { useEffect, useRef, useState } from 'react'
import { FileText, Paperclip, X } from 'lucide-react'

const LIMITE_MB = 10
const TIPOS_OK = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

function tamanho(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// Anexar a nota fiscal, no estilo "anexar documento" do WhatsApp:
// escolhe o arquivo (ou tira uma foto no celular), vê a prévia e confirma.
export default function AnexarNota({ pedido, onEnviar, onFechar }) {
  const inputRef = useRef(null)
  const [arquivo, setArquivo] = useState(null)
  const [previa, setPrevia] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !enviando) onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar, enviando])

  useEffect(() => {
    if (!arquivo || !arquivo.type.startsWith('image/')) {
      setPrevia(null)
      return undefined
    }
    const url = URL.createObjectURL(arquivo)
    setPrevia(url)
    return () => URL.revokeObjectURL(url)
  }, [arquivo])

  function escolher(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.type && !TIPOS_OK.includes(f.type)) {
      setErro('Envie um PDF ou uma foto (JPG, PNG).')
      return
    }
    if (f.size > LIMITE_MB * 1024 * 1024) {
      setErro(`O arquivo tem mais de ${LIMITE_MB} MB.`)
      return
    }
    setErro('')
    setArquivo(f)
  }

  async function enviar() {
    setEnviando(true)
    setErro('')
    const msg = await onEnviar(arquivo)
    setEnviando(false)
    if (msg) setErro(msg) // onEnviar devolve o texto do erro; sem erro, o pai fecha a janela
  }

  return (
    <div className="confirm-overlay" onClick={enviando ? undefined : onFechar} role="presentation">
      <div className="confirm-sheet nf-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Anexar nota fiscal">
        <div className="nf-topo">
          <h3 className="confirm-titulo">Anexar nota fiscal</h3>
          <button type="button" className="nf-fechar" onClick={onFechar} disabled={enviando} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <p className="confirm-descricao">{pedido.cliente?.nome}</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          onChange={escolher}
          style={{ display: 'none' }}
        />

        {!arquivo ? (
          <button type="button" className="nf-escolher" onClick={() => inputRef.current?.click()}>
            <Paperclip size={20} />
            <span>Escolher PDF ou foto</span>
          </button>
        ) : (
          <div className="nf-previa">
            {previa ? (
              <img src={previa} alt="Prévia da nota fiscal" className="nf-previa-img" />
            ) : (
              <div className="nf-previa-doc">
                <FileText size={34} />
              </div>
            )}
            <div className="nf-previa-nome">{arquivo.name}</div>
            <div className="nf-previa-info">{tamanho(arquivo.size)}</div>
          </div>
        )}

        {erro && <div className="nf-erro">{erro}</div>}

        <div className="confirm-acoes">
          {arquivo ? (
            <>
              <button type="button" className="confirm-btn confirm-cancelar" onClick={() => inputRef.current?.click()} disabled={enviando}>
                Trocar arquivo
              </button>
              <button type="button" className="confirm-btn nf-enviar" onClick={enviar} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar'}
              </button>
            </>
          ) : (
            <button type="button" className="confirm-btn confirm-cancelar" onClick={onFechar}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
