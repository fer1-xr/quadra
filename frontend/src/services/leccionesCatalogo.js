// Catálogo de lecciones del día (Ley 6380, NIIF y finanzas).
// Cada día del calendario se asigna una lección distinta. El orden se mezcla con una
// semilla fija, así todos los usuarios ven la misma lección el mismo día, y el ciclo
// no repite lecciones hasta agotar el catálogo.
//
// Para agregar lecciones: añade un objeto al array LECCIONES con la misma forma.

export const CATEGORIAS = {
  LEY_6380: 'Ley 6380',
  NIIF: 'NIIF',
  FINANZAS: 'Finanzas',
}

const IMAGENES = [
  'https://images.unsplash.com/photo-1554224311-beee415c15c7?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1579532537598-459e926db39f?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
  'https://images.unsplash.com/photo-1527482797697-8795b1a55a45?w=800&h=400&fit=crop',
]

// Cada sección: { titulo, texto (opcional), puntos (opcional) }
const LECCIONES = [
  // ───────── Ley 6380 ─────────
  {
    id: 'ley6380-objeto',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Qué busca la modernización de sociedades',
    resumen: 'La ley moderniza y simplifica el régimen de las sociedades comerciales. Conviene conocer sus principios generales antes de constituir o administrar una empresa.',
    secciones: [
      { titulo: 'Idea central', texto: 'La Ley 6380 actualiza las reglas que rigen la constitución, el funcionamiento y la disolución de las sociedades comerciales en Paraguay, con el objetivo de hacer los trámites más claros y previsibles.' },
      { titulo: 'Qué debe revisar un contador', puntos: ['Requisitos de constitución y de estatutos', 'Órganos sociales y sus competencias', 'Obligaciones de registro e información a socios'] },
    ],
  },
  {
    id: 'ley6380-tipos',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Tipos de sociedades comerciales',
    resumen: 'Cada tipo societario tiene reglas propias de responsabilidad, capital y administración. Elegir bien el tipo condiciona la gestión futura del negocio.',
    secciones: [
      { titulo: 'Comparación básica', texto: 'La elección del tipo de sociedad define quién responde por las deudas, cómo se toman las decisiones y qué formalidades se deben cumplir.' },
      { titulo: 'Aspectos que cambian según el tipo', puntos: ['Número y forma de los socios', 'Forma de representar el capital (cuotas o acciones)', 'Nivel de formalidad en asambleas y libros'] },
    ],
  },
  {
    id: 'ley6380-responsabilidad',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Responsabilidad limitada de los socios',
    resumen: 'En las sociedades de responsabilidad limitada, el patrimonio personal del socio queda protegido de las deudas sociales, salvo excepciones previstas en la ley.',
    secciones: [
      { titulo: 'Principio', texto: 'El socio responde hasta el monto de su aporte. La sociedad tiene personalidad jurídica propia y sus deudas son, en principio, de la sociedad y no de sus socios.' },
      { titulo: 'Cuándo se pierde el beneficio', puntos: ['Confusión entre el patrimonio personal y el social', 'Uso de la sociedad para fines fraudulentos', 'Incumplimiento de formalidades esenciales'] },
    ],
  },
  {
    id: 'ley6380-capital',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Capital social, aportes e integración',
    resumen: 'El capital social es la cifra comprometida por los socios. Distinguir entre capital suscripto e integrado evita errores en el balance y en los registros.',
    secciones: [
      { titulo: 'Conceptos clave', puntos: ['Capital suscripto: lo que cada socio se compromete a aportar', 'Capital integrado: lo que efectivamente se ha aportado', 'Aportes en dinero, en bienes o en trabajo, según lo permitido'] },
      { titulo: 'Impacto contable', texto: 'El capital suscripto no integrado se presenta como una cuenta de deducción dentro del patrimonio. Revisar que el libro de socios refleje los aportes reales.' },
    ],
  },
  {
    id: 'ley6380-asamblea',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: La asamblea de socios y sus decisiones',
    resumen: 'La asamblea es el órgano donde los socios deciden los asuntos de mayor importancia. Sus decisiones deben tomarse con el quórum y las mayorías que exige la ley y el estatuto.',
    secciones: [
      { titulo: 'Competencias típicas', puntos: ['Aprobar los estados contables del ejercicio', 'Designar y remover administradores', 'Decidir sobre distribución de utilidades y aumentos de capital'] },
      { titulo: 'Requisitos formales', texto: 'La convocatoria debe hacerse en la forma y plazo previstos. Las actas deben registrarse en el libro correspondiente y firmarse según lo dispuesto.' },
    ],
  },
  {
    id: 'ley6380-administracion',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Administración y responsabilidad de los administradores',
    resumen: 'Quienes administran la sociedad actúan con diligencia y lealtad. Si incumplen sus deberes, pueden responder frente a la sociedad y terceros.',
    secciones: [
      { titulo: 'Deberes del administrador', puntos: ['Diligencia en la gestión del negocio', 'Lealtad: no usar la sociedad en beneficio propio', 'Información completa y veraz a los socios'] },
      { titulo: 'Recomendación práctica', texto: 'Documente las decisiones importantes en actas y mantenga separados los fondos de la sociedad de los personales.' },
    ],
  },
  {
    id: 'ley6380-libros',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Libros societarios obligatorios',
    resumen: 'Los libros sociales dejan constancia de la vida de la sociedad. Mantenerlos al día es una obligación y una protección frente a controversias.',
    secciones: [
      { titulo: 'Libros habituales', puntos: ['Libro de actas de asambleas', 'Libro de actas de administración', 'Libro de registro de socios o accionistas'] },
      { titulo: 'Buena práctica', texto: 'Registre cada decisión en el momento en que se toma, con fecha y firmas. Un libro atrasado genera dudas sobre la validez de las decisiones.' },
    ],
  },
  {
    id: 'ley6380-transferencia',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Transferencia de cuotas y acciones',
    resumen: 'Vender una participación societaria implica cumplir formalidades y, muchas veces, respetar restricciones que el estatuto establece.',
    secciones: [
      { titulo: 'Puntos a verificar', puntos: ['Restricciones previstas en el estatuto', 'Forma escrita y registro de la transferencia', 'Actualización del libro de socios'] },
      { titulo: 'Efecto', texto: 'Hasta que la transferencia quede registrada y notificada a la sociedad, el nuevo titular puede no ser oponible frente a ella.' },
    ],
  },
  {
    id: 'ley6380-preferencia',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Derecho de preferencia en aumentos de capital',
    resumen: 'Cuando la sociedad aumenta su capital, los socios actuales suelen tener preferencia para suscribir las nuevas participaciones y mantener su porcentaje.',
    secciones: [
      { titulo: 'Qué protege', texto: 'Evita que la participación de un socio se diluya sin que tenga la oportunidad de mantener su proporción.' },
      { titulo: 'Plazos y forma', texto: 'La ley y el estatuto fijan el plazo para ejercer la preferencia. Si el socio no responde dentro del plazo, la oferta puede pasar a los demás socios o a terceros.' },
    ],
  },
  {
    id: 'ley6380-disolucion',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Disolución y liquidación de una sociedad',
    resumen: 'Una sociedad se disuelve por causas previstas en la ley o en el estatuto y luego pasa a liquidación, donde se pagan deudas antes de repartir el remanente.',
    secciones: [
      { titulo: 'Causas habituales', puntos: ['Vencimiento del plazo de duración', 'Decisión de los socios', 'Pérdida grave del capital, según la ley'] },
      { titulo: 'Orden de la liquidación', texto: 'Primero se cobran los créditos, luego se pagan las deudas y, solo al final, se reparte el saldo entre los socios según su participación.' },
    ],
  },
  {
    id: 'ley6380-registro',
    categoria: CATEGORIAS.LEY_6380,
    titulo: 'Ley 6380: Inscripción en el Registro Público',
    resumen: 'La inscripción da publicidad a los actos societarios y es el paso que hace oponible la sociedad y sus cambios frente a terceros.',
    secciones: [
      { titulo: 'Qué se inscribe', puntos: ['Constitución y estatutos', 'Modificaciones de capital y de administración', 'Disolución y cambios de domicilio'] },
      { titulo: 'Importante', texto: 'Antes de presentar cualquier documento, verifique en la fuente oficial los requisitos vigentes, ya que los trámites pueden actualizarse.' },
    ],
  },

  // ───────── NIIF / NIC ─────────
  {
    id: 'niif-marco',
    categoria: CATEGORIAS.NIIF,
    titulo: 'Marco conceptual: activos, pasivos e ingresos',
    resumen: 'El marco conceptual define los elementos de los estados financieros. Entender estas definiciones permite decidir qué se reconoce y cuándo.',
    secciones: [
      { titulo: 'Definiciones', puntos: ['Activo: recurso controlado por la entidad, resultado de sucesos pasados, del que se esperan beneficios económicos futuros', 'Pasivo: obligación presente surgida de sucesos pasados, cuya liquidación implicará una salida de recursos', 'Ingreso: aumento de beneficios económicos en forma de entradas o incrementos de activos'] },
      { titulo: 'Idea clave', texto: 'Reconocer un elemento exige cumplir la definición y que exista una medición fiable. No basta con que el dinero "esté" en la empresa: debe haber control y beneficios futuros.' },
    ],
  },
  {
    id: 'nic1-presentacion',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 1: Presentación de estados financieros',
    resumen: 'La NIC 1 establece qué estados debe incluir un juego completo de estados financieros y cómo presentarlos de forma comparable.',
    secciones: [
      { titulo: 'Componentes del juego completo', puntos: ['Estado de situación financiera', 'Estado de resultados y otro resultado integral', 'Estado de cambios en el patrimonio', 'Estado de flujos de efectivo y notas'] },
      { titulo: 'Principios de presentación', texto: 'Se presenta información comparativa del período anterior, se mantiene la coherencia de la presentación y se indica claramente la base de preparación.' },
    ],
  },
  {
    id: 'nic2-inventarios',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 2: Inventarios al menor entre costo y valor neto realizable',
    resumen: 'Los inventarios se miden al menor valor entre su costo y su valor neto realizable. Esto evita inflar activos con mercadería que ya perdió valor.',
    secciones: [
      { titulo: 'Qué integra el costo', puntos: ['Precio de compra, aranceles y costos de transporte', 'Costos de transformación directos e indirectos', 'Otros costos necesarios para llevar el bien a su estado actual'] },
      { titulo: 'Fórmulas de costo', texto: 'Se permiten FIFO y promedio ponderado. El método UEPS (LIFO) no está permitido por la NIC 2.' },
    ],
  },
  {
    id: 'nic7-flujos',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 7: Estado de flujos de efectivo',
    resumen: 'El estado de flujos muestra de dónde vino y en qué se usó el efectivo. Una empresa puede tener utilidades y, aun así, quedarse sin caja.',
    secciones: [
      { titulo: 'Tres actividades', puntos: ['Operación: cobros y pagos del giro del negocio', 'Inversión: compra y venta de activos a largo plazo', 'Financiación: préstamos, aportes y pago de dividendos'] },
      { titulo: 'Métodos', texto: 'El flujo de operación puede presentarse por método directo o indirecto. Ambos deben conciliar con la misma variación de efectivo.' },
    ],
  },
  {
    id: 'nic8-politicas',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 8: Políticas contables, cambios y errores',
    resumen: 'La NIC 8 distingue entre cambio de política, cambio de estimación y corrección de error. Cada uno se trata de forma distinta.',
    secciones: [
      { titulo: 'Diferencias', puntos: ['Cambio de política: se aplica retrospectivamente', 'Cambio de estimación: se aplica de forma prospectiva', 'Error de período anterior: se corrige reexpresando las cifras comparativas'] },
      { titulo: 'Ejemplo', texto: 'Cambiar la vida útil estimada de un equipo es un cambio de estimación. Descubrir que una compra se registró dos veces es un error.' },
    ],
  },
  {
    id: 'nic12-impuestos',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 12: Impuesto a las ganancias diferido',
    resumen: 'El impuesto diferido surge cuando la base contable y la base fiscal de un activo o pasivo son distintas. Refleja impuestos que se pagarán o recuperarán en el futuro.',
    secciones: [
      { titulo: 'Concepto', texto: 'Una diferencia temporaria se revierte en el tiempo. Si genera impuestos futuros a pagar, se reconoce un pasivo por impuesto diferido; si genera ahorros, un activo.' },
      { titulo: 'Ejemplo frecuente', texto: 'La depreciación contable de un equipo puede ser distinta de la deducción fiscal, lo que origina un impuesto diferido.' },
    ],
  },
  {
    id: 'nic16-ppe',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 16: Propiedades, planta y equipo',
    resumen: 'Un elemento de propiedad, planta y equipo se reconoce como activo si genera beneficios futuros y su costo se mide con fiabilidad. Luego se deprecia de forma sistemática.',
    secciones: [
      { titulo: 'Reconocimiento', puntos: ['Se capitaliza el costo de adquisición y puesta en marcha', 'Los gastos de mantenimiento rutinario se llevan a resultados', 'Las mejoras que extienden la vida útil sí se capitalizan'] },
      { titulo: 'Depreciación', texto: 'Cada componente significativo se deprecia según su vida útil. El método (lineal, de unidades producidas, etc.) debe reflejar el patrón de consumo del beneficio.' },
    ],
  },
  {
    id: 'nic36-deterioro',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 36: Deterioro del valor de los activos',
    resumen: 'Si el valor en libros de un activo supera su importe recuperable, se debe reconocer una pérdida por deterioro.',
    secciones: [
      { titulo: 'Cuándo evaluar', texto: 'Se revisa el deterioro cuando hay indicios, como caídas fuertes del valor de mercado, cambios tecnológicos o resultados negativos sostenidos.' },
      { titulo: 'Importe recuperable', texto: 'Es el mayor entre el valor razonable menos costos de venta y el valor en uso (flujos futuros descontados).' },
    ],
  },
  {
    id: 'nic37-provisiones',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 37: Provisiones y pasivos contingentes',
    resumen: 'Una provisión se reconoce cuando existe una obligación presente, es probable una salida de recursos y el monto puede estimarse de forma fiable.',
    secciones: [
      { titulo: 'Tres condiciones', puntos: ['Obligación presente por un suceso pasado', 'Salida probable de recursos', 'Estimación fiable del monto'] },
      { titulo: 'Contingencias', texto: 'Si la salida es posible pero no probable, no se provisiona: se revela en las notas como pasivo contingente.' },
    ],
  },
  {
    id: 'nic24-partes',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIC 24: Información sobre partes relacionadas',
    resumen: 'Las operaciones con partes relacionadas deben revelarse para que los usuarios vean si se realizaron en condiciones de mercado o no.',
    secciones: [
      { titulo: 'Quiénes son partes relacionadas', puntos: ['Accionistas con control o influencia significativa', 'Directivos clave y su familia cercana', 'Entidades controladas o asociadas'] },
      { titulo: 'Qué revelar', texto: 'Naturaleza de la relación, montos de las operaciones, saldos pendientes y condiciones de pago o garantías.' },
    ],
  },
  {
    id: 'niif9-deterioro',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIIF 9: Pérdidas crediticias esperadas',
    resumen: 'La NIIF 9 exige estimar pérdidas esperadas por deudores desde el inicio, no solo cuando el cliente ya incumplió.',
    secciones: [
      { titulo: 'Enfoque', texto: 'Las cuentas por cobrar se evalúan con información histórica, condiciones actuales y previsiones futuras para estimar la pérdida crediticia esperada.' },
      { titulo: 'Práctica habitual', puntos: ['Agrupar cartera por antigüedad de saldos', 'Aplicar tasas de pérdida históricas ajustadas', 'Actualizar la estimación en cada cierre'] },
    ],
  },
  {
    id: 'niif13-valor-razonable',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIIF 13: Medición del valor razonable',
    resumen: 'El valor razonable es el precio que se recibiría por vender un activo, o se pagaría por transferir un pasivo, en una transacción ordenada entre participantes del mercado.',
    secciones: [
      { titulo: 'Jerarquía de datos', puntos: ['Nivel 1: precios cotizados en mercados activos', 'Nivel 2: datos observables distintos de precios cotizados', 'Nivel 3: supuestos no observables'] },
      { titulo: 'Clave', texto: 'Cuanto más bajo el nivel, más fiable la medición. Las revelaciones deben indicar qué nivel se usó.' },
    ],
  },
  {
    id: 'niif16-arrendamientos',
    categoria: CATEGORIAS.NIIF,
    titulo: 'NIIF 16: Arrendamientos y derecho de uso',
    resumen: 'El arrendatario reconoce en el balance un derecho de uso y un pasivo por arrendamiento, aunque el contrato sea de alquiler.',
    secciones: [
      { titulo: 'Qué se reconoce', puntos: ['Activo por derecho de uso', 'Pasivo por arrendamiento, medido al valor presente de los pagos', 'Gasto por depreciación e intereses en lugar de un alquiler lineal'] },
      { titulo: 'Excepciones', texto: 'Los arrendamientos de corto plazo (hasta 12 meses) y de activos de bajo valor pueden llevarse directamente a resultados.' },
    ],
  },

  // ───────── Finanzas ─────────
  {
    id: 'fin-flujo-caja',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Flujo de caja: por qué puede faltar efectivo aunque haya utilidad',
    resumen: 'La utilidad es un cálculo contable; el flujo de caja mide el dinero que realmente entra y sale. Un negocio rentable puede quebrar por falta de caja.',
    secciones: [
      { titulo: 'Causas comunes del desfase', puntos: ['Ventas a crédito con cobros lentos', 'Inventarios que inmovilizan dinero', 'Pagos de deudas y compra de activos'] },
      { titulo: 'Qué hacer', texto: 'Proyecte el flujo semanal o mensual, compare con lo real y actúe antes de que aparezca el faltante.' },
    ],
  },
  {
    id: 'fin-punto-equilibrio',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Punto de equilibrio: cuánto vender para no perder',
    resumen: 'El punto de equilibrio es el nivel de ventas en el que los ingresos cubren exactamente los costos. Por encima de ese nivel hay utilidad.',
    secciones: [
      { titulo: 'Fórmula en unidades', texto: 'Punto de equilibrio = Costos fijos ÷ (Precio de venta unitario − Costo variable unitario).' },
      { titulo: 'Ejemplo', texto: 'Costos fijos de 6.000.000 Gs, precio de 20.000 Gs y costo variable de 12.000 Gs: 6.000.000 ÷ 8.000 = 750 unidades para no perder.' },
    ],
  },
  {
    id: 'fin-van',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'VAN: valor presente neto de una inversión',
    resumen: 'El VAN descuenta los flujos futuros de un proyecto a valor de hoy. Si es positivo, el proyecto crea valor con la tasa exigida.',
    secciones: [
      { titulo: 'Fórmula', texto: 'VAN = −Inversión inicial + Σ Flujo(t) ÷ (1 + r)^t, donde r es la tasa de descuento.' },
      { titulo: 'Regla de decisión', puntos: ['VAN > 0: conviene invertir', 'VAN = 0: la inversión rinde exactamente la tasa exigida', 'VAN < 0: no conviene'] },
    ],
  },
  {
    id: 'fin-tir',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'TIR: la tasa que iguala el VAN a cero',
    resumen: 'La TIR es la tasa de descuento que hace que el VAN de un proyecto sea cero. Se compara con el costo de capital para decidir.',
    secciones: [
      { titulo: 'Lectura', texto: 'Si la TIR supera la tasa mínima exigida por los socios o el costo de financiamiento, el proyecto suele ser atractivo.' },
      { titulo: 'Cuidado', texto: 'Con flujos que cambian de signo varias veces, la TIR puede tener más de un resultado. Use el VAN como criterio principal.' },
    ],
  },
  {
    id: 'fin-liquidez',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Razón corriente y prueba ácida',
    resumen: 'Estos indicadores miden si la empresa puede pagar sus deudas de corto plazo con los activos que tiene a mano.',
    secciones: [
      { titulo: 'Fórmulas', puntos: ['Razón corriente = Activo corriente ÷ Pasivo corriente', 'Prueba ácida = (Activo corriente − Inventarios) ÷ Pasivo corriente'] },
      { titulo: 'Interpretación', texto: 'Una razón corriente menor a 1 indica que las deudas de corto plazo superan los activos corrientes. La prueba ácida es más exigente porque excluye inventarios.' },
    ],
  },
  {
    id: 'fin-margenes',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Márgenes de utilidad: bruto, operativo y neto',
    resumen: 'Cada margen muestra cuánto queda de cada venta después de distintos grupos de costos. Juntos explican dónde se gana o se pierde dinero.',
    secciones: [
      { titulo: 'Niveles', puntos: ['Margen bruto: (Ventas − Costo de ventas) ÷ Ventas', 'Margen operativo: utilidad antes de financieros e impuestos ÷ Ventas', 'Margen neto: utilidad neta ÷ Ventas'] },
      { titulo: 'Uso', texto: 'Compare los márgenes con períodos anteriores y con empresas del mismo sector para detectar problemas de precios o de costos.' },
    ],
  },
  {
    id: 'fin-capital-trabajo',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Capital de trabajo y ciclo de conversión de efectivo',
    resumen: 'El capital de trabajo es el dinero necesario para operar día a día. El ciclo de conversión indica cuántos días tarda ese dinero en volver a la caja.',
    secciones: [
      { titulo: 'Fórmula del ciclo', texto: 'Ciclo = Días de inventario + Días de cuentas por cobrar − Días de cuentas por pagar.' },
      { titulo: 'Cómo mejorarlo', puntos: ['Rotar el inventario más rápido', 'Cobrar antes', 'Negociar plazos de pago con proveedores'] },
    ],
  },
  {
    id: 'fin-interes',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Interés simple vs. interés compuesto',
    resumen: 'En el interés simple, los intereses se calculan siempre sobre el capital inicial. En el compuesto, los intereses generan nuevos intereses.',
    secciones: [
      { titulo: 'Fórmulas', puntos: ['Simple: M = C × (1 + i × n)', 'Compuesto: M = C × (1 + i)^n'] },
      { titulo: 'Por qué importa', texto: 'Con el mismo porcentaje, el compuesto crece mucho más en plazos largos. Esto aplica tanto a inversiones como a deudas que no se pagan a tiempo.' },
    ],
  },
  {
    id: 'fin-amortizacion',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Sistema de amortización francés',
    resumen: 'En el sistema francés la cuota es fija, pero al principio se paga más interés y al final más capital.',
    secciones: [
      { titulo: 'Cómo funciona', texto: 'Cada mes el interés se calcula sobre el saldo pendiente. La diferencia entre la cuota y el interés es la parte que reduce la deuda.' },
      { titulo: 'Para revisar', puntos: ['Tasa efectiva anual y tasa mensual equivalente', 'Costo total del préstamo', 'Efecto de pagos anticipados sobre el interés'] },
    ],
  },
  {
    id: 'fin-apalancamiento',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Apalancamiento financiero y endeudamiento',
    resumen: 'Usar deuda puede aumentar la rentabilidad para los socios, pero también aumenta el riesgo si los ingresos caen.',
    secciones: [
      { titulo: 'Indicador básico', texto: 'Endeudamiento = Pasivo total ÷ Patrimonio. Cuanto mayor es el indicador, mayor es la dependencia de acreedores.' },
      { titulo: 'Riesgo', texto: 'Si el costo de la deuda supera la rentabilidad de los activos, el apalancamiento destruye valor para los socios.' },
    ],
  },
  {
    id: 'fin-roe',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'ROE y ROA: rentabilidad sobre patrimonio y activos',
    resumen: 'El ROA mide qué tan bien usa la empresa sus activos. El ROE mide el retorno que obtienen los socios sobre su inversión.',
    secciones: [
      { titulo: 'Fórmulas', puntos: ['ROA = Utilidad neta ÷ Activos totales', 'ROE = Utilidad neta ÷ Patrimonio'] },
      { titulo: 'Lectura conjunta', texto: 'Si el ROE es mucho mayor que el ROA, la diferencia suele explicarse por el uso de deuda.' },
    ],
  },
  {
    id: 'fin-presupuesto',
    categoria: CATEGORIAS.FINANZAS,
    titulo: 'Presupuesto maestro: planear antes de gastar',
    resumen: 'El presupuesto convierte los objetivos en cifras concretas de ventas, costos y caja. Permite comparar lo planificado con lo real y corregir a tiempo.',
    secciones: [
      { titulo: 'Partes del presupuesto', puntos: ['Presupuesto de ventas', 'Presupuesto de compras y producción', 'Presupuesto de gastos y de caja', 'Estados financieros proyectados'] },
      { titulo: 'Control', texto: 'Revise las variaciones cada mes. Una variación explicada es información útil; una variación sin explicación es un riesgo.' },
    ],
  },
]

// Mezcla determinista (mismo orden para todos) usando una semilla fija.
function mezclar(lista, semilla) {
  let s = semilla >>> 0
  const aleatorio = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

const ORDEN = mezclar(LECCIONES, 6380).map((l, i) => ({
  ...l,
  imagen: IMAGENES[i % IMAGENES.length],
}))

const EPOCA_UTC = Date.UTC(2026, 0, 1)
const MS_DIA = 86400000

// Índice estable por día calendario local: cada día cambia de lección.
export function indiceDelDia(fecha = new Date()) {
  const utc = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const dias = Math.round((utc - EPOCA_UTC) / MS_DIA)
  const n = ORDEN.length
  return ((dias % n) + n) % n
}

export function obtenerLeccionDelDia(fecha = new Date()) {
  return ORDEN[indiceDelDia(fecha)]
}

export function obtenerLeccionPorId(id) {
  return ORDEN.find(l => l.id === id) || null
}

export function totalLecciones() {
  return ORDEN.length
}

// Convierte la lección estructurada en HTML para el visor.
export function leccionAHtml(leccion) {
  const partes = leccion.secciones.map(sec => {
    const titulo = `<h3>${sec.titulo}</h3>`
    const texto = sec.texto ? `<p>${sec.texto}</p>` : ''
    const puntos = sec.puntos
      ? `<ul>${sec.puntos.map(p => `<li>${p}</li>`).join('')}</ul>`
      : ''
    return titulo + texto + puntos
  })
  return `<h2>${leccion.titulo}</h2>${partes.join('')}`
}
