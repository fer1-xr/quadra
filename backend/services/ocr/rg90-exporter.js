import ExcelJS from 'exceljs';
import { formatDate, formatMoney } from './utils/formatters.js';

/**
 * Exporta datos extraídos al formato RG90 para Excel
 */
export class RG90Exporter {
  /**
   * Crea un archivo Excel con los datos extraídos en formato RG90
   */
  static async exportToExcel(invoices) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RG90');

    // Definir columnas en orden exacto de DNIT
    const columns = [
      { header: 'RUC del Informante', key: 'ruc_informante', width: 18 },
      { header: 'Nombre Informante', key: 'nombre_informante', width: 30 },
      { header: 'RUC Informado', key: 'ruc_informado', width: 18 },
      { header: 'Tipo Identificación', key: 'tipo_identificacion', width: 15 },
      { header: 'Nombre Informado', key: 'nombre_informado', width: 30 },
      { header: 'Tipo Registro', key: 'tipo_registro', width: 12 },
      { header: 'Tipo Comprobante', key: 'tipo_comprobante', width: 15 },
      { header: 'Fecha Emisión', key: 'fecha_emision', width: 15 },
      { header: 'Período', key: 'periodo', width: 10 },
      { header: 'Timbrado', key: 'timbrado', width: 12 },
      { header: 'Número', key: 'numero', width: 20 },
      { header: 'CDC', key: 'cdc', width: 45 },
      { header: 'Monto 10%', key: 'monto_gravado_10', width: 15 },
      { header: 'IVA 10%', key: 'iva_10', width: 15 },
      { header: 'Monto 5%', key: 'monto_gravado_5', width: 15 },
      { header: 'IVA 5%', key: 'iva_5', width: 15 },
      { header: 'No Gravado', key: 'monto_no_gravado', width: 15 },
      { header: 'Total', key: 'total_comprobante', width: 15 },
      { header: 'Imputa IVA', key: 'imputa_iva', width: 12 },
      { header: 'Imputa IRE', key: 'imputa_ire', width: 12 },
      { header: 'Imputa IRP', key: 'imputa_irp', width: 12 },
      { header: 'No Imputar', key: 'no_imputar', width: 12 },
      { header: 'Origen', key: 'origen', width: 12 },
    ];

    worksheet.columns = columns;

    // Estilo del header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1f2937' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

    // Agregar datos
    let rowNumber = 2;
    invoices.forEach((invoice, idx) => {
      const row = worksheet.addRow({
        ruc_informante: invoice.informante?.ruc || '',
        nombre_informante: invoice.informante?.nombre || '',
        ruc_informado: invoice.informado?.ruc || '',
        tipo_identificacion: invoice.informado?.tipoIdentificacion || 'RUC',
        nombre_informado: invoice.informado?.nombre || '',
        tipo_registro: invoice.comprobante?.tipoRegistro || '',
        tipo_comprobante: invoice.comprobante?.tipoComprobante || '',
        fecha_emision: formatDate(invoice.comprobante?.fechaEmision),
        periodo: invoice.comprobante?.periodoEmision || '',
        timbrado: invoice.comprobante?.timbrado || '',
        numero: invoice.comprobante?.numero || '',
        cdc: invoice.comprobante?.cdc || '',
        monto_gravado_10: parseFloat(invoice.financiero?.montoGravado10 || 0),
        iva_10: parseFloat(invoice.financiero?.iva10 || 0),
        monto_gravado_5: parseFloat(invoice.financiero?.montoGravado5 || 0),
        iva_5: parseFloat(invoice.financiero?.iva5 || 0),
        monto_no_gravado: parseFloat(invoice.financiero?.montoNoGravado || 0),
        total_comprobante: parseFloat(invoice.financiero?.totalComprobante || 0),
        imputa_iva: invoice.tributario?.imputaIva ? 'S' : 'N',
        imputa_ire: invoice.tributario?.imputaIre ? 'S' : 'N',
        imputa_irp: invoice.tributario?.imputaIrp ? 'S' : 'N',
        no_imputar: invoice.tributario?.noImputar ? 'S' : 'N',
        origen: invoice.metadatos?.origenInformacion || 'OCR',
      });

      // Estilo alternado
      if (idx % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      }

      // Alineación y formato de números
      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'left', vertical: 'center' };

        // Formatear montos como moneda
        if (
          [
            'monto_gravado_10',
            'iva_10',
            'monto_gravado_5',
            'iva_5',
            'monto_no_gravado',
            'total_comprobante',
          ].includes(cell.address.replace(/\d+/, ''))
        ) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'center' };
        }

        // Formatear fechas
        if (cell.address.replace(/\d+/, '') === 'H') {
          cell.numFmt = 'yyyy-mm-dd';
          cell.alignment = { horizontal: 'center', vertical: 'center' };
        }
      });

      rowNumber++;
    });

    // Agregar resumen al final
    const summaryRow = rowNumber + 2;
    const totalMontoRow = worksheet.addRow({});
    totalMontoRow.getCell(1).value = 'TOTAL';
    totalMontoRow.getCell(1).font = { bold: true };

    // Fórmulas de suma
    const columns_to_sum = ['M', 'N', 'O', 'P', 'Q', 'R']; // Índices de montos
    columns_to_sum.forEach((col) => {
      const cell = totalMontoRow.getCell(col);
      cell.value = {
        formula: `SUM(${col}2:${col}${rowNumber - 1})`,
      };
      cell.font = { bold: true };
      cell.numFmt = '#,##0.00';
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFDBA74' },
      };
    });

    return workbook;
  }

  /**
   * Exporta a formato JSON para Marangatu
   */
  static exportToJSON(invoices) {
    return {
      version: '1.0',
      type: 'RG90',
      exportDate: new Date().toISOString(),
      totalInvoices: invoices.length,
      data: invoices.map((invoice) => ({
        informante: {
          ruc: invoice.informante?.ruc,
          nombre: invoice.informante?.nombre,
        },
        informado: {
          ruc: invoice.informado?.ruc,
          tipo_identificacion: invoice.informado?.tipoIdentificacion,
          nombre: invoice.informado?.nombre,
        },
        comprobante: {
          tipo_registro: invoice.comprobante?.tipoRegistro,
          tipo_comprobante: invoice.comprobante?.tipoComprobante,
          fecha_emision: invoice.comprobante?.fechaEmision,
          periodo_emision: invoice.comprobante?.periodoEmision,
          timbrado: invoice.comprobante?.timbrado,
          numero: invoice.comprobante?.numero,
          cdc: invoice.comprobante?.cdc,
          condicion_operacion: invoice.comprobante?.condicionOperacion,
          moneda_extranjera: invoice.comprobante?.monedaExtranjera,
        },
        financiero: {
          monto_gravado_10: parseFloat(invoice.financiero?.montoGravado10 || 0),
          iva_10: parseFloat(invoice.financiero?.iva10 || 0),
          monto_gravado_5: parseFloat(invoice.financiero?.montoGravado5 || 0),
          iva_5: parseFloat(invoice.financiero?.iva5 || 0),
          monto_no_gravado: parseFloat(invoice.financiero?.montoNoGravado || 0),
          total_comprobante: parseFloat(invoice.financiero?.totalComprobante || 0),
        },
        tributario: {
          imputa_iva: invoice.tributario?.imputaIva,
          imputa_ire: invoice.tributario?.imputaIre,
          imputa_irp: invoice.tributario?.imputaIrp,
          no_imputar: invoice.tributario?.noImputar,
        },
      })),
    };
  }

  /**
   * Exporta a CSV
   */
  static exportToCSV(invoices) {
    const headers = [
      'RUC Informante',
      'Nombre Informante',
      'RUC Informado',
      'Tipo ID',
      'Nombre Informado',
      'Tipo Registro',
      'Tipo Comprobante',
      'Fecha',
      'Período',
      'Timbrado',
      'Número',
      'CDC',
      'Monto 10%',
      'IVA 10%',
      'Monto 5%',
      'IVA 5%',
      'No Gravado',
      'Total',
      'IVA',
      'IRE',
      'IRP',
      'No Imputar',
      'Origen',
    ];

    const rows = invoices.map((inv) => [
      inv.informante?.ruc || '',
      `"${inv.informante?.nombre || ''}"`,
      inv.informado?.ruc || '',
      inv.informado?.tipoIdentificacion || 'RUC',
      `"${inv.informado?.nombre || ''}"`,
      inv.comprobante?.tipoRegistro || '',
      inv.comprobante?.tipoComprobante || '',
      inv.comprobante?.fechaEmision || '',
      inv.comprobante?.periodoEmision || '',
      inv.comprobante?.timbrado || '',
      inv.comprobante?.numero || '',
      inv.comprobante?.cdc || '',
      inv.financiero?.montoGravado10 || 0,
      inv.financiero?.iva10 || 0,
      inv.financiero?.montoGravado5 || 0,
      inv.financiero?.iva5 || 0,
      inv.financiero?.montoNoGravado || 0,
      inv.financiero?.totalComprobante || 0,
      inv.tributario?.imputaIva ? 'S' : 'N',
      inv.tributario?.imputaIre ? 'S' : 'N',
      inv.tributario?.imputaIrp ? 'S' : 'N',
      inv.tributario?.noImputar ? 'S' : 'N',
      inv.metadatos?.origenInformacion || 'OCR',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csv;
  }
}

export default RG90Exporter;
