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

    // Fila 5: Encabezado único
    const subHeaderRow = worksheet.getRow(5);
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
    let dataRowNumber = 6;
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

/* ── facturas leídas de imágenes (Importar Documentos) ─────── */

const BORDE = { style: 'thin', color: { argb: 'FFD0D7E2' } };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };
const GS = '#,##0';
const fechaPy = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/** letra de columna de Excel: 1 → A, 27 → AA */
const letra = (n) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

/**
 * Agrega una hoja con título, subtítulo, encabezado y filas.
 * columnas: [{ t: título, w: ancho, monto: true }]; filas: arrays; total: fila final opcional.
 */
const hoja = (wb, nombre, { titulo, subtitulo, columnas, filas, total }) => {
  const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 4 }] });
  ws.columns = columnas.map((c) => ({ width: c.w || 14 }));
  const ultima = letra(columnas.length);
  ws.mergeCells(`A1:${ultima}1`);
  ws.getCell('A1').value = titulo;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.mergeCells(`A2:${ultima}2`);
  ws.getCell('A2').value = subtitulo;
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF4A5568' } };

  const cab = ws.getRow(4);
  columnas.forEach((c, i) => {
    const cell = cab.getCell(i + 1);
    cell.value = c.t;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF4' } };
    cell.alignment = { horizontal: c.monto ? 'right' : 'left', vertical: 'middle', wrapText: true };
    cell.border = BORDES;
  });
  cab.height = 30;

  const pintar = (row, valores, negrita) => valores.forEach((v, i) => {
    const cell = row.getCell(i + 1);
    cell.value = v === '' || v == null ? null : v;
    cell.border = BORDES;
    cell.alignment = { vertical: 'top', wrapText: !columnas[i].monto, horizontal: columnas[i].monto ? 'right' : 'left' };
    if (columnas[i].monto) cell.numFmt = GS;
    if (negrita) {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F9' } };
    }
  });
  filas.forEach((f, n) => pintar(ws.getRow(5 + n), f, false));
  if (total) pintar(ws.getRow(5 + filas.length), total, true);
  return ws;
};

/**
 * Excel de facturas leídas: Libro Compras (una fila por factura), Ítems,
 * Datos completos (todo lo que trae la factura) y No leídos (archivos con error).
 * facturas: [{ filename, factura }] con la factura de normalizarFactura().
 */
export const exportarFacturas = async (facturas, { contribuyente = {}, fallidas = [] } = {}) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Quadra';
  const fechas = facturas.map((f) => f.factura.fechaEmision).filter(Boolean).sort();
  const periodo = fechas.length ? `Período: ${fechaPy(fechas[0])} al ${fechaPy(fechas[fechas.length - 1])}` : 'Período: sin fechas leídas';
  const quien = contribuyente.ruc || contribuyente.nombre
    ? `Contribuyente: ${[contribuyente.nombre, contribuyente.ruc && `RUC ${contribuyente.ruc}`].filter(Boolean).join(' · ')} · `
    : '';
  const subtitulo = `${quien}${periodo} · ${facturas.length} factura(s) · importes en guaraníes, IVA incluido`;

  const orden = [...facturas].sort((a, b) => (a.factura.fechaEmision || '').localeCompare(b.factura.fechaEmision || ''));
  const suma = (k) => orden.reduce((s, x) => s + (x.factura.totales[k] || 0), 0);

  hoja(wb, 'Libro Compras', {
    titulo: 'LIBRO COMPRAS · FACTURAS LEÍDAS',
    subtitulo,
    columnas: [
      { t: 'FECHA', w: 11 }, { t: 'TIPO', w: 10 }, { t: 'TIMBRADO', w: 11 }, { t: 'VENC. TIMBRADO', w: 12 },
      { t: 'NÚMERO', w: 17 }, { t: 'CONDICIÓN', w: 10 }, { t: 'RUC', w: 11 }, { t: 'DV', w: 4 },
      { t: 'RAZÓN SOCIAL DEL PROVEEDOR', w: 32 },
      { t: 'GRAV. 10%', w: 14, monto: true }, { t: 'IVA 10%', w: 12, monto: true },
      { t: 'GRAV. 5%', w: 14, monto: true }, { t: 'IVA 5%', w: 12, monto: true },
      { t: 'EXENTAS', w: 14, monto: true }, { t: 'TOTAL', w: 14, monto: true },
      { t: 'ARCHIVO', w: 22 }, { t: 'OBSERVACIONES', w: 44 },
    ],
    filas: orden.map(({ filename, factura: f }) => [
      fechaPy(f.fechaEmision), f.tipoComprobante, f.timbrado, fechaPy(f.vigenciaHasta), f.numero, f.condicion,
      f.emisor.ruc, f.emisor.dv, f.emisor.nombre,
      f.totales.gravado10, f.totales.iva10, f.totales.gravado5, f.totales.iva5, f.totales.exentas, f.totales.total,
      filename, f.observaciones.join(' · '),
    ]),
    total: ['TOTALES', '', '', '', '', '', '', '', '', suma('gravado10'), suma('iva10'), suma('gravado5'), suma('iva5'), suma('exentas'), suma('total'), '', ''],
  });

  hoja(wb, 'Ítems', {
    titulo: 'DETALLE DE ÍTEMS',
    subtitulo,
    columnas: [
      { t: 'FECHA', w: 11 }, { t: 'NÚMERO', w: 17 }, { t: 'PROVEEDOR', w: 30 }, { t: 'CANT.', w: 7, monto: true },
      { t: 'DESCRIPCIÓN', w: 40 }, { t: 'PRECIO UNIT.', w: 14, monto: true },
      { t: 'EXENTAS', w: 14, monto: true }, { t: '5%', w: 14, monto: true }, { t: '10%', w: 14, monto: true }, { t: 'ARCHIVO', w: 22 },
    ],
    filas: orden.flatMap(({ filename, factura: f }) => (f.items.length ? f.items : [{ descripcion: '(sin detalle legible)' }]).map((it) => [
      fechaPy(f.fechaEmision), f.numero, f.emisor.nombre, it.cantidad, it.descripcion, it.precioUnitario,
      it.exentas || null, it.gravado5 || null, it.gravado10 || null, filename,
    ])),
  });

  hoja(wb, 'Datos completos', {
    titulo: 'DATOS COMPLETOS DE CADA FACTURA',
    subtitulo,
    columnas: [
      { t: 'ARCHIVO', w: 22 }, { t: 'TIPO', w: 10 }, { t: 'NÚMERO', w: 17 }, { t: 'FECHA', w: 11 }, { t: 'CONDICIÓN', w: 10 },
      { t: 'VENCIMIENTO', w: 11 }, { t: 'MONEDA', w: 8 },
      { t: 'TIMBRADO', w: 11 }, { t: 'VIGENCIA DESDE', w: 12 }, { t: 'VIGENCIA HASTA', w: 12 },
      { t: 'EMISOR', w: 30 }, { t: 'RUC EMISOR', w: 13 }, { t: 'ACTIVIDAD DEL EMISOR', w: 36 }, { t: 'DIRECCIÓN DEL EMISOR', w: 30 },
      { t: 'TELÉFONO', w: 16 }, { t: 'EMAIL', w: 24 },
      { t: 'CLIENTE', w: 28 }, { t: 'RUC / C.I. CLIENTE', w: 14 }, { t: 'DIRECCIÓN DEL CLIENTE', w: 24 }, { t: 'NOTA DE REMISIÓN', w: 12 },
      { t: 'EXENTAS', w: 14, monto: true }, { t: 'GRAV. 5%', w: 14, monto: true }, { t: 'GRAV. 10%', w: 14, monto: true },
      { t: 'IVA 5%', w: 12, monto: true }, { t: 'IVA 10%', w: 12, monto: true }, { t: 'TOTAL IVA', w: 12, monto: true },
      { t: 'TOTAL', w: 14, monto: true }, { t: 'TOTAL EN LETRAS', w: 40 }, { t: 'OBSERVACIONES', w: 44 },
    ],
    filas: orden.map(({ filename, factura: f }) => [
      filename, f.tipoComprobante, f.numero, fechaPy(f.fechaEmision), f.condicion, fechaPy(f.vencimiento), f.moneda,
      f.timbrado, fechaPy(f.vigenciaDesde), fechaPy(f.vigenciaHasta),
      f.emisor.nombre, f.emisor.rucCompleto, f.emisor.actividad, f.emisor.direccion, f.emisor.telefono, f.emisor.email,
      f.cliente.nombre, f.cliente.rucCompleto, f.cliente.direccion, f.notaRemision,
      f.totales.exentas, f.totales.gravado5, f.totales.gravado10, f.totales.iva5, f.totales.iva10, f.totales.totalIva,
      f.totales.total, f.totales.totalEnLetras, f.observaciones.join(' · '),
    ]),
  });

  if (fallidas.length) {
    hoja(wb, 'No leídos', {
      titulo: 'ARCHIVOS QUE NO SE PUDIERON LEER',
      subtitulo: 'Volvé a subirlos con una foto más nítida y derecha, o cargalos a mano.',
      columnas: [{ t: 'ARCHIVO', w: 30 }, { t: 'MOTIVO', w: 70 }],
      filas: fallidas.map((r) => [r.filename, r.error]),
    });
  }
  return wb;
};

export default LibroComprasExporter;
