// Planes de Quadra: qué ve y cuántos clientes puede cargar cada nivel de usuario.
// Para cambiar un permiso o un límite, se cambia sólo acá.

export const PLANES = [
  {
    id: 'auxiliar',
    nombre: 'Auxiliar Contable',
    precio: 80000,
    desc: 'Lo básico para el día a día con tus clientes',
    contable: false,
    maxClientes: 15,
    features: [
      'Lección y tareas del día, metas y objetivos',
      'Gestión de clientes',
      'Conciliación RG90 y bancaria',
      'Importar documentos',
      'Activo fijo, flujo de caja y cotización',
      'Historial, notas y reuniones por cliente',
      'Hasta 15 clientes'
    ]
  },
  {
    id: 'independiente',
    nombre: 'Contador Independiente',
    precio: 160000,
    desc: 'Para contadores que llevan la contabilidad de sus clientes',
    contable: true,
    maxClientes: 15,
    features: [
      'Todo lo del plan Auxiliar',
      'Sistema contable: libros, carga de documentos e informes',
      'Importar-Exportar y formularios',
      'Hasta 15 clientes'
    ]
  },
  {
    id: 'profesional',
    nombre: 'Contador Profesional',
    precio: 300000,
    desc: 'Para carteras más grandes',
    contable: true,
    maxClientes: 35,
    features: [
      'Todo lo del plan Independiente',
      'Sistema contable completo',
      'Hasta 35 clientes'
    ]
  },
  {
    id: 'estudio',
    nombre: 'Estudio Contable',
    precio: null,
    desc: 'Para estudios con equipo y muchos clientes',
    contable: true,
    maxClientes: null,
    contacto: 'mailto:contacto@quadra.com.py?subject=Plan%20Estudio%20Contable',
    features: [
      'Todo lo del plan Profesional',
      'Clientes según el acuerdo con tu estudio',
      'Condiciones a medida'
    ]
  }
]

// ids de planes anteriores → plan actual
const PLANES_ANTERIORES = { basico: 'auxiliar', senior: 'estudio' }
export const PLAN_POR_DEFECTO = 'auxiliar'

export const planDe = (user) => {
  const id = PLANES_ANTERIORES[user?.plan] || user?.plan
  return PLANES.find((p) => p.id === id) || PLANES.find((p) => p.id === PLAN_POR_DEFECTO)
}

/** true si el plan del usuario incluye el sistema contable (libros, comprobantes, informes, formularios, importar) */
export const tieneContable = (user) => planDe(user).contable

/** cuántos clientes más puede cargar; Infinity si no hay tope */
export const clientesDisponibles = (user, cantidad) => {
  const max = planDe(user).maxClientes
  return max == null ? Infinity : Math.max(0, max - cantidad)
}

export const precioPlan = (plan) => (plan.precio == null ? 'A consultar' : `₲ ${plan.precio.toLocaleString('es-PY')}`)
