import React from 'react'
import { ContableProvider } from './ContableContext'
import RegistroFiscal from './Comprobantes'
import { RegistroMovimientos } from './Movimientos'
import AsientosManuales from './AsientosManuales'
import { LibroDiario, LibroMayor } from './Libros'
import { Personas, PlanCuentas, Timbrados } from './Catastros'
import { ActivosFijos, RevaluoDepreciacion } from './ActivosFijos'
import '../../styles/Contabilidad.css'

/** vistas del sistema contable: id → { título, grupo } */
export const VISTAS_CONTABLES = {
  'ct-libro-compras': { titulo: 'Libro Compras', grupo: 'Movimientos · Libros' },
  'ct-libro-ventas': { titulo: 'Libro Ventas', grupo: 'Movimientos · Libros' },
  'ct-diario': { titulo: 'Libro Diario', grupo: 'Movimientos · Libros' },
  'ct-mayor': { titulo: 'Libro Mayor', grupo: 'Movimientos · Libros' },
  'ct-asientos': { titulo: 'Asientos Manuales', grupo: 'Movimientos' },
  'ct-nc-compra': { titulo: 'Notas de crédito por compra', grupo: 'Movimientos' },
  'ct-nc-venta': { titulo: 'Notas de crédito por venta', grupo: 'Movimientos' },
  'ct-nd-compra': { titulo: 'Notas de débito por compra', grupo: 'Movimientos' },
  'ct-nd-venta': { titulo: 'Notas de débito por venta', grupo: 'Movimientos' },
  'ct-recibo-cobro': { titulo: 'Recibos de cobro', grupo: 'Movimientos' },
  'ct-recibo-pago': { titulo: 'Recibos de pago', grupo: 'Movimientos' },
  'ct-ret-emitida': { titulo: 'Retenciones IVA emitidas', grupo: 'Movimientos' },
  'ct-ret-recibida': { titulo: 'Retenciones IVA recibidas', grupo: 'Movimientos' },
  'ct-activos': { titulo: 'Bienes del activo fijo', grupo: 'Catastros' },
  'ct-revaluo': { titulo: 'Revalúo y depreciación', grupo: 'Catastros' },
  'ct-personas': { titulo: 'Personas', grupo: 'Catastros' },
  'ct-plan': { titulo: 'Plan de cuentas', grupo: 'Catastros' },
  'ct-timbrados': { titulo: 'Timbrados', grupo: 'Catastros' }
}

function Vista({ vista }) {
  switch (vista) {
    case 'ct-libro-compras':
      return <RegistroFiscal key={vista} libro titulo="Libro Compras" lede="Facturas, notas de débito y notas de crédito de tus proveedores, con el crédito fiscal liquidado. Cada carga genera su asiento en el Diario." tipos={['compra', 'nd-compra', 'nc-compra']} />
    case 'ct-libro-ventas':
      return <RegistroFiscal key={vista} libro titulo="Libro Ventas" lede="Facturas, notas de débito y notas de crédito emitidas a tus clientes, con el débito fiscal liquidado. Cada carga genera su asiento en el Diario." tipos={['venta', 'nd-venta', 'nc-venta']} />
    case 'ct-nc-compra':
      return <RegistroFiscal key={vista} titulo="Notas de crédito por compra" lede="Las que te emiten tus proveedores por devoluciones o descuentos. Restan del crédito fiscal y del saldo con el proveedor." tipos={['nc-compra']} />
    case 'ct-nc-venta':
      return <RegistroFiscal key={vista} titulo="Notas de crédito por venta" lede="Las que emitís a tus clientes por devoluciones o descuentos. Restan del débito fiscal y del saldo a cobrar." tipos={['nc-venta']} />
    case 'ct-nd-compra':
      return <RegistroFiscal key={vista} titulo="Notas de débito por compra" lede="Las que te emiten tus proveedores por intereses, recargos o diferencias de precio. Suman al crédito fiscal." tipos={['nd-compra']} />
    case 'ct-nd-venta':
      return <RegistroFiscal key={vista} titulo="Notas de débito por venta" lede="Las que emitís a tus clientes por intereses, recargos o diferencias de precio. Suman al débito fiscal." tipos={['nd-venta']} />
    case 'ct-recibo-cobro':
    case 'ct-recibo-pago':
    case 'ct-ret-emitida':
    case 'ct-ret-recibida':
      return <RegistroMovimientos key={vista} tipo={vista.slice(3)} />
    case 'ct-asientos': return <AsientosManuales />
    case 'ct-diario': return <LibroDiario />
    case 'ct-mayor': return <LibroMayor />
    case 'ct-activos': return <ActivosFijos />
    case 'ct-revaluo': return <RevaluoDepreciacion />
    case 'ct-personas': return <Personas />
    case 'ct-plan': return <PlanCuentas />
    case 'ct-timbrados': return <Timbrados />
    default: return null
  }
}

export default function Contabilidad({ vista, contribuyente }) {
  return (
    <ContableProvider contribuyente={contribuyente}>
      <Vista vista={vista} />
    </ContableProvider>
  )
}
