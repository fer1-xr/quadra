import React from 'react'
import { ContableProvider } from './ContableContext'
import RegistroFiscal from './Comprobantes'
import AsientosManuales from './AsientosManuales'
import NotasCredito from './NotasCredito'
import Retenciones from './Retenciones'
import Recibos from './Recibos'
import { LibroDiario, LibroMayor } from './Libros'
import { Personas, PlanCuentas, Timbrados } from './Catastros'
import { ActivosFijos, RevaluoDepreciacion } from './ActivosFijos'
import { CentroLibros, LibroInventario, EstadosContables, LibroDisponibilidades, CuentasCorrientes, LiquidacionIVA } from './Informes'
import ImportarExportar from './ImportarExportar'
import '../../styles/Contabilidad.css'

/** vistas del sistema contable: id → { título, grupo } */
export const VISTAS_CONTABLES = {
  'ct-libro-compras': { titulo: 'Libro Compras', grupo: 'Movimientos' },
  'ct-libro-ventas': { titulo: 'Libro Ventas', grupo: 'Movimientos' },
  'ct-asientos': { titulo: 'Asientos Manuales', grupo: 'Movimientos' },
  'ct-nc-compra': { titulo: 'Notas de crédito por compra', grupo: 'Movimientos' },
  'ct-nc-venta': { titulo: 'Notas de crédito por venta', grupo: 'Movimientos' },
  'ct-recibo-cobro': { titulo: 'Recibos de cobro', grupo: 'Movimientos' },
  'ct-recibo-pago': { titulo: 'Recibos de pago', grupo: 'Movimientos' },
  'ct-ret-emitida': { titulo: 'Retenciones IVA emitidas', grupo: 'Movimientos' },
  'ct-ret-recibida': { titulo: 'Retenciones IVA recibidas', grupo: 'Movimientos' },
  'ct-activos': { titulo: 'Bienes del activo fijo', grupo: 'Catastros' },
  'ct-revaluo': { titulo: 'Revalúo y depreciación', grupo: 'Catastros' },
  'ct-personas': { titulo: 'Personas', grupo: 'Catastros' },
  'ct-plan': { titulo: 'Plan de cuentas', grupo: 'Catastros' },
  'ct-timbrados': { titulo: 'Timbrados', grupo: 'Catastros' },
  'ct-libros': { titulo: 'Libros contables', grupo: 'Informes' },
  'ct-diario': { titulo: 'Libro Diario', grupo: 'Informes · Obligatorios' },
  'ct-mayor': { titulo: 'Libro Mayor', grupo: 'Informes · Obligatorios' },
  'ct-inventario': { titulo: 'Libro Inventario y Balances', grupo: 'Informes · Obligatorios' },
  'ct-caja': { titulo: 'Libro Caja', grupo: 'Informes · Auxiliares' },
  'ct-bancos': { titulo: 'Libro Bancos', grupo: 'Informes · Auxiliares' },
  'ct-ctacte-clientes': { titulo: 'Cuentas corrientes de clientes', grupo: 'Informes · Auxiliares' },
  'ct-ctacte-proveedores': { titulo: 'Cuentas corrientes de proveedores', grupo: 'Informes · Auxiliares' },
  'ct-balance': { titulo: 'Balance General', grupo: 'Informes · Estados contables' },
  'ct-resultados': { titulo: 'Estado de Resultados', grupo: 'Informes · Estados contables' },
  'ct-iva': { titulo: 'Liquidación de IVA', grupo: 'Informes' },
  'ct-importar': { titulo: 'Importar', grupo: 'Importar-Exportar' },
  'ct-exportar': { titulo: 'Exportar', grupo: 'Importar-Exportar' }
}

function Vista({ vista }) {
  switch (vista) {
    case 'ct-libro-compras':
      return <RegistroFiscal key={vista} libro titulo="Libro Compras" lede="Facturas, notas de débito y notas de crédito de tus proveedores, con el crédito fiscal liquidado. Cada carga genera su asiento en el Diario." tipos={['compra', 'nd-compra', 'nc-compra']} />
    case 'ct-libro-ventas':
      return <RegistroFiscal key={vista} libro titulo="Libro Ventas" lede="Facturas, notas de débito y notas de crédito emitidas a tus clientes, con el débito fiscal liquidado. Cada carga genera su asiento en el Diario." tipos={['venta', 'nd-venta', 'nc-venta']} />
    case 'ct-nc-compra':
      return <NotasCredito key={vista} tipo="nc-compra" />
    case 'ct-nc-venta':
      return <NotasCredito key={vista} tipo="nc-venta" />
    case 'ct-recibo-cobro':
    case 'ct-recibo-pago':
      return <Recibos key={vista} tipo={vista.slice(3)} />
    case 'ct-ret-emitida':
    case 'ct-ret-recibida':
      return <Retenciones key={vista} tipo={vista.slice(3)} />
    case 'ct-asientos': return <AsientosManuales />
    case 'ct-diario': return <LibroDiario />
    case 'ct-mayor': return <LibroMayor />
    case 'ct-activos': return <ActivosFijos />
    case 'ct-revaluo': return <RevaluoDepreciacion />
    case 'ct-personas': return <Personas />
    case 'ct-plan': return <PlanCuentas />
    case 'ct-timbrados': return <Timbrados />
    case 'ct-libros': return <CentroLibros />
    case 'ct-inventario': return <LibroInventario />
    case 'ct-balance': return <EstadosContables key={vista} tipo="balance" />
    case 'ct-resultados': return <EstadosContables key={vista} tipo="resultados" />
    case 'ct-caja': return <LibroDisponibilidades key={vista} tipo="caja" />
    case 'ct-bancos': return <LibroDisponibilidades key={vista} tipo="bancos" />
    case 'ct-ctacte-clientes': return <CuentasCorrientes key={vista} lado="venta" />
    case 'ct-ctacte-proveedores': return <CuentasCorrientes key={vista} lado="compra" />
    case 'ct-iva': return <LiquidacionIVA />
    case 'ct-importar':
    case 'ct-exportar':
      return <ImportarExportar key={vista} modo={vista.slice(3)} />
    default: return null
  }
}

export default function Contabilidad({ vista, contribuyente, onNavigate }) {
  return (
    <ContableProvider contribuyente={contribuyente} onNavigate={onNavigate}>
      <Vista vista={vista} />
    </ContableProvider>
  )
}
