import React, { useMemo, useState } from 'react'
import PageHead, { Figures } from './PageHead'
import { useCloudCollection } from '../services/useCloudCollection'
import { Plus, X, Check, Pin, PinOff, Pencil, Search, StickyNote, Users, MapPin, Video, Phone } from 'lucide-react'
import '../styles/ClienteAgenda.css'

const TIPOS = [
  { id: 'nota', label: 'Nota', icon: StickyNote },
  { id: 'reunion', label: 'Reunión', icon: Users }
]

const MODALIDADES = [
  { id: 'presencial', label: 'Presencial', icon: MapPin },
  { id: 'virtual', label: 'Virtual', icon: Video },
  { id: 'llamada', label: 'Llamada', icon: Phone }
]

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const VACIA = (tipo = 'nota') => ({
  tipo,
  titulo: '',
  fecha: hoyISO(),
  hora: tipo === 'reunion' ? '10:00' : '',
  modalidad: 'presencial',
  participantes: '',
  contenido: '',
  acuerdosTexto: ''
})

const fechaLarga = (iso) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('es-PY', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

const partesFecha = (iso) => {
  const d = new Date(`${iso}T00:00:00`)
  return {
    dia: String(d.getDate()).padStart(2, '0'),
    mes: d.toLocaleDateString('es-PY', { month: 'short' }).replace('.', ''),
    anio: d.getFullYear()
  }
}

/** Notas y minutas de reuniones sobre un cliente, con acuerdos que se pueden tildar. */
function NotasReuniones({ cliente }) {
  const [todas, setTodas, syncStatus] = useCloudCollection('nota', 'quadra_notas_reuniones')
  const clienteId = String(cliente.clienteId)

  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [form, setForm] = useState(null) // null | { ...VACIA, id? }
  const [errorTitulo, setErrorTitulo] = useState(false)

  const notas = useMemo(() => todas.filter((n) => String(n.clienteId) === clienteId), [todas, clienteId])
  const hoy = hoyISO()

  const proximas = notas
    .filter((n) => n.tipo === 'reunion' && n.fecha >= hoy)
    .sort((a, b) => `${a.fecha}${a.hora || ''}`.localeCompare(`${b.fecha}${b.hora || ''}`))

  const q = busqueda.trim().toLowerCase()
  const lista = notas
    .filter((n) => filtro === 'todas' || n.tipo === filtro)
    .filter((n) => !q || [n.titulo, n.contenido, n.participantes, ...(n.acuerdos || []).map((a) => a.texto)].join(' ').toLowerCase().includes(q))
    .filter((n) => !(n.tipo === 'reunion' && n.fecha >= hoy) || filtro !== 'todas' || q)
    .sort((a, b) => Number(!!b.fijada) - Number(!!a.fijada) || `${b.fecha}${b.hora || ''}`.localeCompare(`${a.fecha}${a.hora || ''}`))

  const acuerdosPendientes = notas.reduce((n, x) => n + (x.acuerdos || []).filter((a) => !a.hecho).length, 0)

  const abrir = (tipo) => { setForm(VACIA(tipo)); setErrorTitulo(false) }
  const editar = (n) => {
    setForm({
      ...VACIA(n.tipo),
      ...n,
      acuerdosTexto: (n.acuerdos || []).map((a) => a.texto).join('\n')
    })
    setErrorTitulo(false)
  }

  const guardar = (e) => {
    e?.preventDefault()
    if (!form.titulo.trim()) { setErrorTitulo(true); return }
    const previa = form.id ? notas.find((n) => n.id === form.id) : null
    const lineas = form.acuerdosTexto.split('\n').map((l) => l.replace(/^[-•*\s]+/, '').trim()).filter(Boolean)
    const acuerdos = lineas.map((texto, i) => {
      const antes = previa?.acuerdos?.find((a) => a.texto === texto)
      return antes || { id: `${Date.now()}-${i}`, texto, hecho: false }
    })
    const { acuerdosTexto, ...datos } = form
    const nota = {
      ...datos,
      id: form.id || `${Date.now()}`,
      clienteId,
      clienteNombre: cliente.razonSocial,
      titulo: form.titulo.trim(),
      contenido: form.contenido.trim(),
      participantes: form.participantes.trim(),
      hora: form.tipo === 'reunion' ? form.hora : '',
      modalidad: form.tipo === 'reunion' ? form.modalidad : null,
      acuerdos,
      fijada: !!previa?.fijada,
      creadaEn: previa?.creadaEn || new Date().toISOString(),
      editadaEn: previa ? new Date().toISOString() : null
    }
    setTodas(previa ? todas.map((n) => (n.id === nota.id ? nota : n)) : [...todas, nota])
    setForm(null)
  }

  const actualizar = (id, cambio) => setTodas(todas.map((n) => (n.id === id ? { ...n, ...cambio(n) } : n)))
  const alternarAcuerdo = (nota, acuerdoId) => actualizar(nota.id, (n) => ({
    acuerdos: n.acuerdos.map((a) => (a.id === acuerdoId ? { ...a, hecho: !a.hecho } : a))
  }))
  const eliminar = (n) => {
    if (window.confirm(`¿Eliminar «${n.titulo}»? No se puede deshacer.`)) setTodas(todas.filter((x) => x.id !== n.id))
  }

  const tarjeta = (n) => {
    const tipo = TIPOS.find((t) => t.id === n.tipo) || TIPOS[0]
    const mod = MODALIDADES.find((m) => m.id === n.modalidad)
    const f = partesFecha(n.fecha || hoy)
    const futura = n.tipo === 'reunion' && n.fecha >= hoy
    return (
      <article key={n.id} className={`ca-note is-${n.tipo} ${n.fijada ? 'is-pinned' : ''} ${futura ? 'is-upcoming' : ''}`}>
        <div className="ca-note__date" aria-hidden="true">
          <span className="ca-note__d">{f.dia}</span>
          <span className="ca-note__m">{f.mes}</span>
          <span className="ca-note__y">{f.anio}</span>
        </div>
        <div className="ca-note__body">
          <header className="ca-note__head">
            <span className={`ca-badge is-${n.tipo}`}><tipo.icon size={11} strokeWidth={2} aria-hidden="true" /> {tipo.label}</span>
            <h4>{n.titulo}</h4>
            <div className="ca-note__actions">
              <button type="button" className="ca-icon" onClick={() => actualizar(n.id, (x) => ({ fijada: !x.fijada }))} title={n.fijada ? 'Desfijar' : 'Fijar arriba'} aria-label={n.fijada ? 'Desfijar' : 'Fijar arriba'} aria-pressed={!!n.fijada}>
                {n.fijada ? <PinOff size={14} strokeWidth={1.8} /> : <Pin size={14} strokeWidth={1.8} />}
              </button>
              <button type="button" className="ca-icon" onClick={() => editar(n)} title="Editar" aria-label={`Editar «${n.titulo}»`}>
                <Pencil size={14} strokeWidth={1.8} />
              </button>
              <button type="button" className="ca-icon ca-icon--del" onClick={() => eliminar(n)} title="Eliminar" aria-label={`Eliminar «${n.titulo}»`}>
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>
          </header>
          <p className="ca-note__meta">
            <span>{fechaLarga(n.fecha)}{n.hora ? ` · ${n.hora} h` : ''}</span>
            {mod && <span><mod.icon size={12} strokeWidth={1.8} aria-hidden="true" /> {mod.label}</span>}
            {n.participantes && <span><Users size={12} strokeWidth={1.8} aria-hidden="true" /> {n.participantes}</span>}
          </p>
          {n.contenido && <p className="ca-note__text">{n.contenido}</p>}
          {n.acuerdos?.length > 0 && (
            <div className="ca-agreements">
              <p className="ca-agreements__label">
                {n.tipo === 'reunion' ? 'Acuerdos y pendientes' : 'Pendientes'} · {n.acuerdos.filter((a) => a.hecho).length}/{n.acuerdos.length}
              </p>
              <ul>
                {n.acuerdos.map((a) => (
                  <li key={a.id} className={a.hecho ? 'is-done' : ''}>
                    <label className="wk-check">
                      <input type="checkbox" checked={a.hecho} onChange={() => alternarAcuerdo(n, a.id)} aria-label={`Marcar «${a.texto}» como ${a.hecho ? 'pendiente' : 'hecho'}`} />
                      <span aria-hidden="true"><Check size={11} strokeWidth={2.6} /></span>
                    </label>
                    <span>{a.texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>
    )
  }

  return (
    <div className="ca-page">
      <PageHead
        title="Notas y reuniones"
        lede={`Todo lo conversado y acordado con ${cliente.razonSocial}, en un solo lugar.`}
        equation={[{ n: `${notas.length} ` }, { v: 'registros' }]}
        caption={acuerdosPendientes ? `${acuerdosPendientes} acuerdos pendientes` : 'sin acuerdos pendientes'}
        status={syncStatus}
      />

      <Figures items={[
        { label: 'Notas', value: notas.filter((n) => n.tipo === 'nota').length },
        { label: 'Reuniones', value: notas.filter((n) => n.tipo === 'reunion').length },
        { label: 'Próxima reunión', value: proximas[0] ? new Date(`${proximas[0].fecha}T00:00:00`).toLocaleDateString('es-PY', { day: '2-digit', month: 'short' }).replace('.', '') : '—' },
        { label: 'Acuerdos pendientes', value: acuerdosPendientes, tone: acuerdosPendientes ? 'err' : undefined }
      ]} />

      <div className="wk-toolbar ca-toolbar">
        <div className="todo-pestanas" role="tablist" aria-label="Filtrar por tipo">
          {[{ id: 'todas', label: 'Todas' }, { id: 'nota', label: 'Notas' }, { id: 'reunion', label: 'Reuniones' }].map((t) => (
            <button key={t.id} role="tab" aria-selected={filtro === t.id} className={`pestaña ${filtro === t.id ? 'activa' : ''}`} onClick={() => setFiltro(t.id)}>{t.label}</button>
          ))}
        </div>
        <label className="ca-search">
          <Search size={15} strokeWidth={1.8} aria-hidden="true" />
          <span className="wk-sr">Buscar</span>
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en notas y acuerdos" />
        </label>
        {!form && (
          <div className="ca-toolbar__add">
            <button className="btn btn-add-task" onClick={() => abrir('nota')}><Plus size={16} strokeWidth={1.8} /> Nota</button>
            <button className="btn btn-add-task" onClick={() => abrir('reunion')}><Plus size={16} strokeWidth={1.8} /> Reunión</button>
          </div>
        )}
      </div>

      {form && (
        <form className="wk-composer" onSubmit={guardar}>
          <div className="wk-composer__params">
            <fieldset className="wk-param">
              <legend>Tipo</legend>
              <div className="wk-seg">
                {TIPOS.map((t) => (
                  <label key={t.id} className={`wk-seg__opt ${form.tipo === t.id ? 'is-on' : ''}`}>
                    <input type="radio" name="nr-tipo" checked={form.tipo === t.id} onChange={() => setForm({ ...form, tipo: t.id, hora: t.id === 'reunion' && !form.hora ? '10:00' : form.hora })} />
                    <span className="wk-seg__t">{t.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="wk-param">
              <legend>Fecha</legend>
              <input className="wk-client-select" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} aria-label="Fecha" />
            </fieldset>
            {form.tipo === 'reunion' && (
              <>
                <fieldset className="wk-param">
                  <legend>Hora</legend>
                  <input className="wk-time" type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} aria-label="Hora" />
                </fieldset>
                <fieldset className="wk-param">
                  <legend>Modalidad</legend>
                  <div className="wk-seg">
                    {MODALIDADES.map((m) => (
                      <label key={m.id} className={`wk-seg__opt ${form.modalidad === m.id ? 'is-on' : ''}`}>
                        <input type="radio" name="nr-mod" checked={form.modalidad === m.id} onChange={() => setForm({ ...form, modalidad: m.id })} />
                        <span className="wk-seg__t">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </div>

          <div className="wk-composer__main">
            <label className="wk-sr" htmlFor="nr-titulo">Título</label>
            <input
              id="nr-titulo"
              className={`wk-composer__title ${errorTitulo ? 'is-invalid' : ''}`}
              type="text"
              value={form.titulo}
              onChange={(e) => { setForm({ ...form, titulo: e.target.value }); setErrorTitulo(false) }}
              placeholder={form.tipo === 'reunion' ? 'Tema de la reunión — p. ej. Cierre del ejercicio' : 'Título — p. ej. Cambio de régimen de IVA'}
              aria-invalid={errorTitulo}
              autoFocus
            />
            {errorTitulo && <p className="wk-composer__err">Escribí un título para guardar.</p>}
          </div>

          {form.tipo === 'reunion' && (
            <div className="wk-composer__main">
              <label className="ca-field-label" htmlFor="nr-part">Participantes</label>
              <input id="nr-part" className="wk-client-select ca-wide" type="text" value={form.participantes} onChange={(e) => setForm({ ...form, participantes: e.target.value })} placeholder="Quiénes participan — p. ej. Adrián Ibarra, gerente administrativo" />
            </div>
          )}

          <div className="wk-composer__main">
            <label className="ca-field-label" htmlFor="nr-cont">{form.tipo === 'reunion' ? 'Qué se habló' : 'Nota'}</label>
            <textarea id="nr-cont" className="ca-textarea" rows={4} value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} placeholder={form.tipo === 'reunion' ? 'Temas tratados, decisiones, información recibida…' : 'Escribí tu nota…'} />
          </div>

          <div className="wk-composer__main">
            <label className="ca-field-label" htmlFor="nr-acu">{form.tipo === 'reunion' ? 'Acuerdos y pendientes' : 'Pendientes'} <small>(uno por línea)</small></label>
            <textarea id="nr-acu" className="ca-textarea" rows={3} value={form.acuerdosTexto} onChange={(e) => setForm({ ...form, acuerdosTexto: e.target.value })} placeholder={'Enviar extractos bancarios de octubre\nFirmar balance'} />
          </div>

          <div className="wk-composer__actions">
            <button type="submit" className="btn btn-primary">{form.id ? 'Guardar cambios' : form.tipo === 'reunion' ? 'Guardar reunión' : 'Guardar nota'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {filtro === 'todas' && !q && proximas.length > 0 && (
        <section className="ca-section" aria-labelledby="ca-proximas">
          <h3 id="ca-proximas" className="ca-section__title">Próximas reuniones</h3>
          <div className="ca-notes">
            {proximas.map(tarjeta)}
          </div>
        </section>
      )}

      <section className="ca-section" aria-labelledby="ca-registro">
        {filtro === 'todas' && !q && proximas.length > 0 && lista.length > 0 && <h3 id="ca-registro" className="ca-section__title">Registro</h3>}
        {lista.length === 0 ? (
          notas.length === 0 && !form ? (
            <div className="ca-empty">
              <p className="ca-empty__title">Sin notas ni reuniones todavía</p>
              <p>Guardá lo que conversás con {cliente.razonSocial}: llamadas, reuniones, pedidos y acuerdos, para tenerlo a mano cuando vuelvas a trabajar con este cliente.</p>
              <div className="ca-empty__actions">
                <button type="button" className="q-btn q-btn--primary" onClick={() => abrir('reunion')}><Plus size={16} strokeWidth={1.8} /> Registrar una reunión</button>
                <button type="button" className="q-btn q-btn--line" onClick={() => abrir('nota')}><Plus size={16} strokeWidth={1.8} /> Escribir una nota</button>
              </div>
            </div>
          ) : (
            !form && !(filtro === 'todas' && !q && proximas.length > 0) && <p className="wk-empty ca-none">{q ? 'Nada coincide con la búsqueda.' : 'No hay registros en esta vista.'}</p>
          )
        ) : (
          <div className="ca-notes">
            {lista.map(tarjeta)}
          </div>
        )}
      </section>
    </div>
  )
}

export default NotasReuniones
