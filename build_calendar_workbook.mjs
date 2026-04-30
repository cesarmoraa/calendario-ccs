import fs from "node:fs/promises";
import path from "node:path";
import { Workbook, SpreadsheetFile } from "@oai/artifact-tool";

const WORKDIR = process.cwd();
const HTML_FILE = path.join(WORKDIR, "Calendario_Primer_Semestre_2026_miniapp_WIDE.html");
const OUTPUT_DIR = path.join(WORKDIR, "outputs", "calendario_ccs_2026");
const XLSX_FILE = path.join(OUTPUT_DIR, "Calendario_Primer_Semestre_2026_editable.xlsx");
const PREVIEW_DIR = path.join(OUTPUT_DIR, "previews");

const DATA_FIELDS = [
  "Fecha",
  "Semana",
  "Tipo Salida",
  "Inicio",
  "Ruta",
  "Perfil",
  "Dist (km)",
  "Ganancia Alt",
  "Tiempo Total Aprox",
  "Temp prom 2025 (°C)",
  "Mes",
  "StravaURL",
  "MapsURL",
  "WazeURL",
];

const VISTA_COLUMNS = [
  { key: "Fecha", label: "Fecha" },
  { key: "Semana", label: "Semana" },
  { key: "Tipo Salida", label: "Tipo" },
  { key: "Inicio", label: "Inicio" },
  { key: "Ruta", label: "Ruta" },
  { key: "Perfil", label: "Perfil" },
  { key: "Dist (km)", label: "Dist (km)" },
  { key: "Ganancia Alt", label: "D+ (m)" },
  { key: "Tiempo Total Aprox", label: "Tiempo Aprox" },
  { key: "StravaURL", label: "Strava" },
  { key: "MapsURL", label: "Maps" },
  { key: "WazeURL", label: "Waze" },
];

function getBetween(content, startLabel, endLabel) {
  const start = content.indexOf(startLabel);
  if (start === -1) throw new Error(`No se encontro "${startLabel}"`);
  const from = start + startLabel.length;
  const end = content.indexOf(endLabel, from);
  if (end === -1) throw new Error(`No se encontro "${endLabel}"`);
  return content.slice(from, end).trim();
}

function parseJsonAssignment(content, label, terminator = ";") {
  const raw = getBetween(content, label, terminator);
  return JSON.parse(raw);
}

function normalizeCell(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function parseNumeric(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text || text.toUpperCase() === "TBD") return null;
  const normalized = text.replace(",", ".");
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

function monthNameFromNum(num, meses) {
  const match = meses.find((item) => item.num === String(num));
  return match?.name ?? "";
}

function profileMixFormula(startRow, endRow, profile) {
  return `COUNTIF(Datos!F${startRow}:F${endRow},"${profile}")`;
}

function setColumnWidths(sheet, widths) {
  widths.forEach((width, index) => {
    sheet.getRangeByIndexes(0, index, sheet.rowCount || 200, 1).format.columnWidthPx = width;
  });
}

function styleHeader(range) {
  range.format.fill.color = "#001b3a";
  range.format.font.color = "#f9fbff";
  range.format.font.bold = true;
  range.format.horizontalAlignment = "center";
  range.format.verticalAlignment = "center";
}

function styleTitle(range, fillColor, fontSize) {
  range.format.fill.color = fillColor;
  range.format.font.color = "#f9fbff";
  range.format.font.bold = true;
  range.format.font.size = fontSize;
}

async function saveRenderArtifact(renderResult, filePath) {
  if (renderResult?.save) {
    await renderResult.save(filePath);
    return;
  }
  if (renderResult?.data) {
    await fs.writeFile(filePath, renderResult.data);
    return;
  }
  if (renderResult instanceof Uint8Array) {
    await fs.writeFile(filePath, renderResult);
    return;
  }
  if (renderResult instanceof ArrayBuffer) {
    await fs.writeFile(filePath, new Uint8Array(renderResult));
    return;
  }
  if (typeof renderResult?.arrayBuffer === "function") {
    const buffer = await renderResult.arrayBuffer();
    await fs.writeFile(filePath, new Uint8Array(buffer));
    return;
  }
  throw new Error("No fue posible guardar el render de la hoja.");
}

async function main() {
  const html = await fs.readFile(HTML_FILE, "utf8");
  const data = parseJsonAssignment(html, "const DATA = ");
  const meses = parseJsonAssignment(html, "const MESES = ");
  const inicios = parseJsonAssignment(html, "const INICIOS = ");
  const perfiles = parseJsonAssignment(html, "const PERFILES = ");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });

  const workbook = Workbook.create();

  const instrucciones = workbook.worksheets.add("Instrucciones");
  const datos = workbook.worksheets.add("Datos");
  const vista = workbook.worksheets.add("Vista");

  instrucciones.getRange("A1:F1").merge();
  instrucciones.getRange("A1").values = [["Calendario CCS 2026 · fuente editable"]];
  styleTitle(instrucciones.getRange("A1:F1"), "#001b3a", 18);

  instrucciones.getRange("A3:B8").values = [
    ["Paso", "Detalle"],
    ["1", "Edita la hoja Datos. Esa es la fuente para futuras versiones del HTML."],
    ["2", "Puedes cambiar rutas, fechas, perfiles, kilometraje y links de Strava, Maps o Waze."],
    ["3", "La hoja Vista replica el calendario en formato visual y no necesita edicion manual."],
    ["4", "Si luego quieres un HTML actualizado, se puede regenerar desde este archivo sin rehacer el calendario."],
    ["5", `Salidas cargadas: ${data.length}`],
  ];
  styleHeader(instrucciones.getRange("A3:B3"));
  instrucciones.getRange("A10:B13").values = [
    ["Meses disponibles", meses.map((item) => item.name).join(", ")],
    ["Inicios", inicios.join(", ")],
    ["Perfiles", perfiles.join(", ")],
    ["Archivo fuente", path.basename(HTML_FILE)],
  ];
  instrucciones.getRange("A3:B13").format.wrapText = true;
  instrucciones.getRange("A3:B13").format.verticalAlignment = "top";
  instrucciones.getRange("A3:B13").format.borders.bottom.color = "#c3d4e6";
  instrucciones.getRange("A3:B13").format.borders.bottom.style = "thin";
  setColumnWidths(instrucciones, [90, 780, 120, 120, 120, 120]);

  const dataHeader = DATA_FIELDS.map((field) => field);
  const dataRows = data.map((row) => DATA_FIELDS.map((field) => normalizeCell(row[field])));
  datos.getRangeByIndexes(0, 0, 1, dataHeader.length).values = [dataHeader];
  datos.getRangeByIndexes(1, 0, dataRows.length, dataHeader.length).values = dataRows;
  styleHeader(datos.getRangeByIndexes(0, 0, 1, dataHeader.length));
  datos.freezePanes.freezeRows = 1;
  datos.getRangeByIndexes(0, 0, dataRows.length + 1, dataHeader.length).format.verticalAlignment = "middle";
  datos.getRangeByIndexes(0, 0, dataRows.length + 1, dataHeader.length).format.wrapText = true;
  datos.getRangeByIndexes(1, 0, dataRows.length, 1).numberFormat = "dd/mm/yy";
  setColumnWidths(datos, [95, 70, 110, 140, 420, 135, 95, 95, 110, 110, 65, 300, 300, 300]);

  data.forEach((row, index) => {
    const sheetRow = index + 2;
    const dist = parseNumeric(row["Dist (km)"]);
    const alt = parseNumeric(row["Ganancia Alt"]);
    const temp = parseNumeric(row["Temp prom 2025 (°C)"]);

    if (dist !== null) datos.getRange(`G${sheetRow}`).values = [[dist]];
    if (alt !== null) datos.getRange(`H${sheetRow}`).values = [[alt]];
    if (temp !== null) datos.getRange(`J${sheetRow}`).values = [[temp]];
  });

  datos.getRange(`G2:G${data.length + 1}`).numberFormat = "0.00";
  datos.getRange(`H2:H${data.length + 1}`).numberFormat = "0";
  datos.getRange(`J2:J${data.length + 1}`).numberFormat = "0.0";

  vista.getRange("A1:L1").merge();
  vista.getRange("A1").values = [["Calendario CCS 2026 · 1er semestre"]];
  styleTitle(vista.getRange("A1:L1"), "#00a0df", 18);

  vista.getRange("A2:L2").merge();
  vista.getRange("A2").values = [["Vista lista para revisar. Edita la hoja Datos para actualizar el contenido."]];
  vista.getRange("A2:L2").format.fill.color = "#e4edf5";
  vista.getRange("A2:L2").format.font.color = "#001b3a";

  vista.getRange("A4:D6").values = [
    ["Indicador", "Formula", "Valor", "Detalle"],
    ["Salidas", "Contador", null, "Cantidad total de filas con ruta"],
    ["Km acumulados", "Suma", null, "Suma de Dist (km) numericos"],
  ];
  styleHeader(vista.getRange("A4:D4"));
  vista.getRange("C5").formulas = [[`COUNTA(Datos!E2:E${data.length + 1})`]];
  vista.getRange("C6").formulas = [[`SUM(Datos!G2:G${data.length + 1})`]];
  vista.getRange("C6").numberFormat = "0.0";

  vista.getRange("F4:H8").values = [
    ["Mix perfiles", "Cantidad", "Mes"],
    ["Fondo", null, ""],
    ["Media montaña", null, ""],
    ["Montaña", null, ""],
    ["Alta Montaña", null, ""],
  ];
  styleHeader(vista.getRange("F4:H4"));
  vista.getRange("G5").formulas = [[profileMixFormula(2, data.length + 1, "Fondo")]];
  vista.getRange("G6").formulas = [[profileMixFormula(2, data.length + 1, "Media montaña")]];
  vista.getRange("G7").formulas = [[profileMixFormula(2, data.length + 1, "Montaña")]];
  vista.getRange("G8").formulas = [[profileMixFormula(2, data.length + 1, "Alta Montaña")]];

  const vistaHeaderRow = 10;
  vista.getRangeByIndexes(vistaHeaderRow - 1, 0, 1, VISTA_COLUMNS.length).values = [
    VISTA_COLUMNS.map((column) => column.label),
  ];
  styleHeader(vista.getRangeByIndexes(vistaHeaderRow - 1, 0, 1, VISTA_COLUMNS.length));
  vista.freezePanes.freezeRows = vistaHeaderRow;

  const vistaValues = data.map((row) => [
    normalizeCell(row.Fecha),
    normalizeCell(row.Semana),
    normalizeCell(row["Tipo Salida"]),
    normalizeCell(row.Inicio),
    normalizeCell(row.Ruta),
    normalizeCell(row.Perfil),
    parseNumeric(row["Dist (km)"]) ?? normalizeCell(row["Dist (km)"]),
    parseNumeric(row["Ganancia Alt"]) ?? normalizeCell(row["Ganancia Alt"]),
    normalizeCell(row["Tiempo Total Aprox"]),
    "",
    "",
    "",
  ]);
  vista.getRangeByIndexes(vistaHeaderRow, 0, vistaValues.length, VISTA_COLUMNS.length).values = vistaValues;
  vista.getRange(`G${vistaHeaderRow + 1}:G${vistaHeaderRow + data.length}`).numberFormat = "0.00";
  vista.getRange(`H${vistaHeaderRow + 1}:H${vistaHeaderRow + data.length}`).numberFormat = "0";

  data.forEach((row, index) => {
    const sourceRow = index + 2;
    const targetRow = vistaHeaderRow + index + 1;
    if (row.StravaURL) vista.getRange(`J${targetRow}`).values = [["Strava"]];
    if (row.MapsURL) vista.getRange(`K${targetRow}`).values = [["Maps"]];
    if (row.WazeURL) vista.getRange(`L${targetRow}`).values = [["Waze"]];
    vista.getRange(`J${targetRow}:L${targetRow}`).format.font = {
      color: "#00a0df",
      underline: true,
    };
    vista.getRange(`J${targetRow}:L${targetRow}`).format.horizontalAlignment = "center";
  });

  vista.getRange(`A${vistaHeaderRow}:L${vistaHeaderRow + data.length}`).format.wrapText = true;
  vista.getRange(`A${vistaHeaderRow}:L${vistaHeaderRow + data.length}`).format.verticalAlignment = "middle";
  setColumnWidths(vista, [95, 70, 100, 130, 420, 130, 90, 90, 120, 80, 80, 80]);

  const inspect = await workbook.inspect({
    kind: "table",
    range: `Vista!A1:L16`,
    include: "values,formulas",
    tableMaxRows: 16,
    tableMaxCols: 12,
  });
  console.log(inspect.ndjson);

  const formulaErrors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 100 },
    summary: "formula scan",
  });
  console.log(formulaErrors.ndjson);

  const previewSheets = [
    { sheetName: "Instrucciones", range: "A1:B13", filename: "instrucciones.png" },
    { sheetName: "Datos", range: "A1:N12", filename: "datos.png" },
    { sheetName: "Vista", range: "A1:L18", filename: "vista.png" },
  ];
  for (const preview of previewSheets) {
    const image = await workbook.render({
      sheetName: preview.sheetName,
      range: preview.range,
      scale: 2,
    });
    await saveRenderArtifact(image, path.join(PREVIEW_DIR, preview.filename));
  }

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(XLSX_FILE);

  console.log(`XLSX generado en ${XLSX_FILE}`);
}

await main();
