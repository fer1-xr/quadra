import React, { useEffect, useRef, useState } from 'react'
import { Camera, Check, KeyRound, Pencil, ArrowUp, ArrowDown, X, CalendarDays } from 'lucide-react'
import { authService } from '../services/authService'
import '../styles/MiCuenta.css'

// Mismos planes y precios que la landing (quadra-landing/src/components/Pricing.jsx)
export const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 100000,
    desc: 'Para contadores independientes',
    features: ['Hasta 8 conciliaciones/mes', '1 usuario', '1 uso por calculadora/mes', 'Historial de 3 meses']
  },
  {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 250000,
    desc: 'Para estudios contables',
    features: ['Hasta 18 conciliaciones/mes', '2 usuarios', '3 usos por calculadora/mes', 'Historial de 8 meses', 'Finiquitos y activos fijos']
  },
  {
    id: 'senior',
    nombre: 'Contador Senior',
    precio: 600000,
    desc: 'Para empresas y contadores senior',
    features: ['Conciliaciones ilimitadas', 'Usuarios ilimitados', 'Calculadoras ilimitadas', 'Historial ilimitado']
  }
]

const MAX_FOTO_MB = 5
const LADO_FOTO = 256

const gs = (n) => `₲ ${n.toLocaleString('es-PY')}`

// "1 año, 2 meses y 5 días" desde la fecha de alta
function antiguedad(desde) {
  const inicio = new Date(desde)
  const hoy = new Date()
  let años = hoy.getFullYear() - inicio.getFullYear()
  let meses = hoy.getMonth() - inicio.getMonth()
  let dias = hoy.getDate() - inicio.getDate()
  if (dias < 0) {
    meses -= 1
    dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate()
  }
  if (meses < 0) { años -= 1; meses += 12 }

  const partes = []
  if (años) partes.push(`${años} ${años === 1 ? 'año' : 'años'}`)
  if (meses) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`)
  if (dias || !partes.length) partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`)
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}` : partes[0]
}

// Recorta al centro y reduce a un cuadrado JPEG
function prepararFoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const lado = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = LADO_FOTO
      canvas.height = LADO_FOTO
      canvas.getContext('2d').drawImage(
        img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO
      )
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.88)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('El archivo no es una imagen válida')) }
    img.src = url
  })
}

function MiCuenta({ user, onUserUpdate, onChangePassword }) {
  const [perfil, setPerfil] = useState(user)
  const [aviso, setAviso] = useState(null) // { tipo: 'ok' | 'err', texto }
  const [subiendo, setSubiendo] = useState(false)
  const [editandoNombre, setEditandoNombre] = useState(false)
  const [nombre, setNombre] = useState(user?.name || '')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [planDestino, setPlanDestino] = useState(null)
  const [cambiandoPlan, setCambiandoPlan] = useState(false)
  const inputFoto = useRef(null)

  // Trae fecha de alta, foto y plan actualizados desde Supabase
  useEffect(() => {
    let vivo = true
    authService.getProfile()
      .then((p) => {
        if (!vivo) return
        setPerfil(p)
        localStorage.setItem('quaedra_user', JSON.stringify(p))
        onUserUpdate?.(p)
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  const aplicar = (p, texto) => {
    setPerfil(p)
    onUserUpdate?.(p)
    setAviso({ tipo: 'ok', texto })
  }

  const elegirFoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setAviso({ tipo: 'err', texto: 'Elegí un archivo de imagen (JPG, PNG o WebP).' }); return }
    if (file.size > MAX_FOTO_MB * 1024 * 1024) { setAviso({ tipo: 'err', texto: `La imagen supera los ${MAX_FOTO_MB} MB.` }); return }

    setSubiendo(true)
    setAviso(null)
    try {
      const blob = await prepararFoto(file)
      const url = await authService.uploadAvatar(perfil.id, blob)
      aplicar(await authService.updateProfile({ avatar_url: url }), 'Foto de perfil actualizada.')
    } catch (err) {
      setAviso({ tipo: 'err', texto: `No se pudo subir la foto: ${err.message}` })
    } finally {
      setSubiendo(false)
    }
  }

  const quitarFoto = async () => {
    try {
      aplicar(await authService.updateProfile({ avatar_url: null }), 'Foto de perfil eliminada.')
    } catch (err) {
      setAviso({ tipo: 'err', texto: err.message })
    }
  }

  const guardarNombre = async (e) => {
    e.preventDefault()
    const limpio = nombre.trim().replace(/\s+/g, ' ')
    if (limpio.length < 2 || limpio.length > 40) {
      setAviso({ tipo: 'err', texto: 'El nombre debe tener entre 2 y 40 caracteres.' })
      return
    }
    if (limpio === perfil.name) { setEditandoNombre(false); return }
    setGuardandoNombre(true)
    try {
      aplicar(await authService.updateProfile({ name: limpio }), 'Nombre de usuario actualizado.')
      setEditandoNombre(false)
    } catch (err) {
      setAviso({ tipo: 'err', texto: err.message })
    } finally {
      setGuardandoNombre(false)
    }
  }

  const confirmarPlan = async () => {
    setCambiandoPlan(true)
    try {
      const p = await authService.updateProfile({ plan: planDestino.id, plan_changed_at: new Date().toISOString() })
      aplicar(p, `Tu plan ahora es ${planDestino.nombre}.`)
      setPlanDestino(null)
    } catch (err) {
      setAviso({ tipo: 'err', texto: err.message })
    } finally {
      setCambiandoPlan(false)
    }
  }

  const nombreVisible = perfil?.name || perfil?.email || ''
  const inicial = nombreVisible.trim().charAt(0).toUpperCase() || 'Q'
  const idxActual = Math.max(0, PLANES.findIndex((p) => p.id === (perfil?.plan || 'basico')))
  const planActual = PLANES[idxActual]
  const fechaAlta = perfil?.created_at
    ? new Date(perfil.created_at).toLocaleDateString('es-PY', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const esSubida = planDestino && PLANES.indexOf(planDestino) > idxActual

  return (
    <div className="q-cuenta">
      <section className="q-panel q-cuenta__perfil">
        <div className="q-cuenta__foto">
          <span className="q-cuenta__avatar">
            {perfil?.avatar_url ? <img src={perfil.avatar_url} alt="Foto de perfil" /> : inicial}
          </span>
          <button
            type="button"
            className="q-cuenta__foto-btn"
            onClick={() => inputFoto.current?.click()}
            disabled={subiendo}
            aria-label="Cambiar foto de perfil"
            title="Cambiar foto de perfil"
          >
            <Camera size={15} strokeWidth={1.8} />
          </button>
          <input ref={inputFoto} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={elegirFoto} />
        </div>

        <div className="q-cuenta__ident">
          {editandoNombre ? (
            <form className="q-cuenta__nombre-form" onSubmit={guardarNombre}>
              <label className="q-label" htmlFor="cuenta-nombre">Nombre de usuario</label>
              <div className="q-cuenta__nombre-row">
                <input
                  id="cuenta-nombre"
                  className="q-input"
                  value={nombre}
                  maxLength={40}
                  autoFocus
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setEditandoNombre(false); setNombre(perfil.name || '') } }}
                />
                <button type="submit" className="q-btn q-btn--primary" disabled={guardandoNombre}>
                  <Check size={16} strokeWidth={2} /> {guardandoNombre ? 'Guardando…' : 'Guardar'}
                </button>
                <button type="button" className="q-btn q-cuenta__btn-sec" onClick={() => { setEditandoNombre(false); setNombre(perfil.name || '') }}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <h2 className="q-cuenta__nombre">
              {perfil?.name || 'Sin nombre'}
              <button type="button" className="q-cuenta__edit" onClick={() => { setNombre(perfil?.name || ''); setEditandoNombre(true) }} aria-label="Cambiar nombre de usuario" title="Cambiar nombre de usuario">
                <Pencil size={14} strokeWidth={1.8} />
              </button>
            </h2>
          )}
          <p className="q-cuenta__email">{perfil?.email}</p>
          <div className="q-cuenta__foto-acciones">
            <button type="button" className="q-cuenta__link" onClick={() => inputFoto.current?.click()} disabled={subiendo}>
              {subiendo ? 'Subiendo foto…' : perfil?.avatar_url ? 'Cambiar foto' : 'Subir foto de perfil'}
            </button>
            {perfil?.avatar_url && !subiendo && (
              <button type="button" className="q-cuenta__link q-cuenta__link--muted" onClick={quitarFoto}>Quitar foto</button>
            )}
          </div>
        </div>

        {aviso && (
          <p className={`q-cuenta__aviso q-cuenta__aviso--${aviso.tipo}`} role={aviso.tipo === 'err' ? 'alert' : 'status'}>
            {aviso.texto}
            <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><X size={14} /></button>
          </p>
        )}

        <dl className="q-dl q-cuenta__datos">
          <div>
            <dt>Antigüedad en Quadra</dt>
            <dd>
              {fechaAlta ? (
                <>
                  <strong>{antiguedad(perfil.created_at)}</strong>
                  <span className="q-cuenta__desde"><CalendarDays size={13} strokeWidth={1.8} /> Miembro desde el {fechaAlta}</span>
                </>
              ) : 'Cargando…'}
            </dd>
          </div>
          <div>
            <dt>Plan actual</dt>
            <dd>
              <strong>{planActual.nombre}</strong>
              <span className="q-cuenta__desde">{gs(planActual.precio)} por mes</span>
            </dd>
          </div>
        </dl>

        <button type="button" className="q-btn q-btn--primary" onClick={onChangePassword}>
          <KeyRound size={16} strokeWidth={1.8} /> Cambiar contraseña
        </button>
      </section>

      <section className="q-panel q-cuenta__planes">
        <h2 className="q-card__title">Tu plan</h2>
        <p className="q-cuenta__sub">Podés subir o bajar de plan cuando quieras. El cambio se aplica desde el próximo ciclo de facturación.</p>
        <div className="q-cuenta__plan-grid">
          {PLANES.map((plan, i) => {
            const actual = i === idxActual
            const sube = i > idxActual
            return (
              <article key={plan.id} className={`q-plan ${actual ? 'is-current' : ''}`}>
                {actual && <span className="q-plan__badge">Plan actual</span>}
                <h3 className="q-plan__nombre">{plan.nombre}</h3>
                <p className="q-plan__desc">{plan.desc}</p>
                <p className="q-plan__precio"><span className="q-mono">{gs(plan.precio)}</span> /mes</p>
                <ul className="q-plan__features">
                  {plan.features.map((f) => <li key={f}><Check size={13} strokeWidth={2.2} /> {f}</li>)}
                </ul>
                {actual ? (
                  <button type="button" className="q-btn q-cuenta__btn-sec" disabled>Tu plan</button>
                ) : (
                  <button type="button" className={`q-btn ${sube ? 'q-btn--primary' : 'q-cuenta__btn-sec'}`} onClick={() => setPlanDestino(plan)}>
                    {sube ? <ArrowUp size={15} strokeWidth={2} /> : <ArrowDown size={15} strokeWidth={2} />}
                    {sube ? 'Subir a' : 'Bajar a'} {plan.nombre}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {planDestino && (
        <div className="q-cuenta__modal-veil" onClick={() => !cambiandoPlan && setPlanDestino(null)}>
          <div className="q-cuenta__modal" role="dialog" aria-modal="true" aria-labelledby="cambio-plan-titulo" onClick={(e) => e.stopPropagation()}>
            <h3 id="cambio-plan-titulo">{esSubida ? 'Subir' : 'Bajar'} a {planDestino.nombre}</h3>
            <p>
              Pasás de <strong>{planActual.nombre}</strong> ({gs(planActual.precio)}/mes) a{' '}
              <strong>{planDestino.nombre}</strong> ({gs(planDestino.precio)}/mes).
            </p>
            {!esSubida && (
              <p className="q-cuenta__modal-warn">
                Al bajar de plan se aplican los límites de {planDestino.nombre}: {planDestino.features.join(', ').toLowerCase()}.
              </p>
            )}
            <div className="q-cuenta__modal-acciones">
              <button type="button" className="q-btn q-cuenta__btn-sec" onClick={() => setPlanDestino(null)} disabled={cambiandoPlan}>Cancelar</button>
              <button type="button" className="q-btn q-btn--primary" onClick={confirmarPlan} disabled={cambiandoPlan}>
                {cambiandoPlan ? 'Cambiando…' : `Confirmar cambio`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MiCuenta
