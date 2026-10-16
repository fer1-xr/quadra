import ExcelJS from 'exceljs';

/**
 * Exporta datos al formato "LIBRO COMPRAS" de Paraguay
 * Estructura exacta del Excel proporcionado
 */
export class LibroComprasExporter {
  /**
   * Crea Excel en formato LIBRO COMPRAS
   */
  static async exportToExcel(invoices, contribuyente = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('LIBRO COMPRAS');

    // Estilo de encabezado
    const headerStyle = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: 'center', vertical: 'center' },
    };

    const infoStyle = {
      font: { size: 11 },
      alignment: { horizontal: 'left', vertical: 'center' },
    };

    // Fila 1: Título
    worksheet.mergeCells('A1:O1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'LIBRO COMPRAS';
    Object.assign(titleCell, headerStyle);
    worksheet.getRow(1).height = 25;

    // Fila 2: Contribuyente
    worksheet.mergeCells('A2:O2');
    const contCell = worksheet.getCell('A2');
    contCell.value = `CONTRIBUYENTE: ${contribuyente.ruc || '80078755-2'} - ${contribuyente.nombre || 'FLARO SA'}`;
    Object.assign(contCell, infoStyle);

    // Fila 3: Período
    worksheet.mergeCells('A3:O3');
    const periodoCell = worksheet.getCell('A3');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    periodoCell.value = `PERIODO: ${formatDate(firstDay)} al ${formatDate(lastDay)} - ACTIVIDAD: IRE-GENERAL/IRACIS`;
    Object.assign(periodoCell, infoStyle);

    // Fila 4: Vacía

    // Fila 5: Headers principales
    const headerRow = worksheet.getRow(5);
    const headers1 = [
      'FECHA',
      'TIPO TIMBRADO',
      'DOCUMENTO',
      'SERIE',
      'CDC DOCUMENTO',
      'TIMB.',
      'VENC.',
      'PROVEEDOR',
      null,
      null,
      'VALORES DE COMPRAS',
      null,
      null,
      null,
      null,
    ];

    headers1.forEach((h, idx) => {
      if (h) {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FF000000' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      }
    });

    // Fila 6: Sub-headers
    const subHeaderRow = worksheet.getRow(6);
    const subHeaders = [
      'FECHA',
      'TIPO TIMBRADO',
      'DOCUMENTO',
      'SERIE',
      'CDC DOCUMENTO',
      'TIMB.',
      'VENC.',
      'RAZÓN SOCIAL',
      'RUC',
      'DV',
      'GRAV. 10%',
      'GRAV. 5%',
      'IVA 10%',
      'IVA 5%',
      'EXENTAS',
    ];

    subHeaders.forEach((h, idx) => {
      const cell = subHeaderRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Ajustar anchos
    const widths = [12, 15, 15, 10, 12, 12, 12, 25, 12, 5, 12, 12, 12, 12, 12];
    worksheet.columns.forEach((col, idx) => {
      col.width = widths[idx] || 12;
    });

    // Agregar datos de facturas
    let dataRowNumber = 7;
    let totalGrav10 = 0;
    let totalGrav5 = 0;
    let totalIva10 = 0;
    let totalIva5 = 0;
    let totalExentas = 0;

    invoices.forEach((invoice) => {
      // Extraer RUC y DV del proveedor
      const rucMatch = (invoice.informado?.ruc || '').match(/(\d+)-(\d)/);
      const ruc = rucMatch ? rucMatch[1] : (invoice.informado?.ruc || '');
      const dv = rucMatch ? rucMatch[2] : '';

      const grav10 = parseFloat(invoice.financiero?.montoGravado10 || 0);
      const grav5 = parseFloat(invoice.financiero?.montoGravado5 || 0);
      const iva10 = parseFloat(invoice.financiero?.iva10 || 0);
      const iva5 = parseFloat(invoice.financiero?.iva5 || 0);
      const exentas = parseFloat(invoice.financiero?.montoNoGravado || 0);

      totalGrav10 += grav10;
      totalGrav5 += grav5;
      totalIva10 += iva10;
      totalIva5 += iva5;
      totalExentas += exentas;

      const row = worksheet.getRow(dataRowNumber);
      const rowData = [
        invoice.comprobante?.fechaEmision || '',
        'PREIMPRESO',
        invoice.comprobante?.numero || '',
        '',
        invoice.comprobante?.cdc || '',
        invoice.comprobante?.timbrado || '',
        '', // VENC
        invoice.informado?.nombre || '',
        ruc,
        dv,
        grav10,
        grav5,
        iva10,
        iva5,
        exentas,
      ];

      rowData.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };

        // Formato para montos
        if ([11, 12, 13, 14, 15].includes(idx + 1)) {
          cell.numFmt = '#,##0.000';
          cell.alignment = { horizontal: 'right', vertical: 'center' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'center' };
        }
      });

      dataRowNumber++;
    });

    // Fila de TOTALES
    const totalsRow = worksheet.getRow(dataRowNumber + 1);
    const totalsData = [
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalGrav10,
      totalGrav5,
      totalIva10,
      totalIva5,
      totalExentas,
    ];

    totalsData.forEach((val, idx) => {
      const cell = totalsRow.getCell(idx + 1);
      cell.value = val;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };

      if ([11, 12, 13, 14, 15].includes(idx + 1)) {
        cell.numFmt = '#,##0.000';
        cell.alignment = { horizontal: 'right', vertical: 'center' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'center' };
      }
    });

    return workbook;
  }
}

export default LibroComprasExporter;
