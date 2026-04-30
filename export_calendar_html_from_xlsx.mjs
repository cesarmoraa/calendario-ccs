import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const WORKDIR = process.cwd();
const TEMPLATE_HTML = path.join(WORKDIR, "Calendario_Primer_Semestre_2026_miniapp_WIDE.html");
const XLSX_FILE = path.join(WORKDIR, "outputs", "calendario_ccs_2026", "Calendario_Primer_Semestre_2026_editable.xlsx");
const OUTPUT_HTML = path.join(WORKDIR, "outputs", "calendario_ccs_2026", "Calendario_Primer_Semestre_2026_desde_excel.html");

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

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function cellText(cell) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) {
    const dd = String(cell.getUTCDate()).padStart(2, "0");
    const mm = String(cell.getUTCMonth() + 1).padStart(2, "0");
    const yy = String(cell.getUTCFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }
  return String(cell).trim();
}

function deriveLists(data) {
  const mesesMap = new Map();
  const inicios = new Set();
  const perfiles = new Set();

  data.forEach((row) => {
    if (row.Mes) {
      const num = String(row.Mes);
      const dateText = cellText(row.Fecha);
      const [, monthText] = dateText.split("/");
      const monthIndex = Number.parseInt(monthText, 10);
      const monthNames = [
        "",
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ];
      mesesMap.set(num, monthNames[monthIndex] || "");
    }
    if (row.Inicio) inicios.add(row.Inicio);
    if (row.Perfil) perfiles.add(row.Perfil);
  });

  const meses = Array.from(mesesMap.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([num, name]) => ({ num, name }));

  return {
    meses,
    inicios: Array.from(inicios).sort((a, b) => a.localeCompare(b, "es")),
    perfiles: Array.from(perfiles).sort((a, b) => a.localeCompare(b, "es")),
  };
}

async function main() {
  const template = await fs.readFile(TEMPLATE_HTML, "utf8");
  const file = await FileBlob.load(XLSX_FILE);
  const workbook = await SpreadsheetFile.importXlsx(file);
  const matrix = workbook.worksheets.getItem("Datos").getRange("A1:N200").values
    .filter((row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== ""));

  if (matrix.length < 2) {
    throw new Error("La hoja Datos no contiene filas suficientes para reconstruir el HTML.");
  }

  const header = matrix[0].map((value) => cellText(value));
  const records = matrix.slice(1).map((rowValues) => {
    const row = {};
    header.forEach((field, index) => {
      row[field] = cellText(rowValues[index]);
    });
    row["Link Strava"] = row.StravaURL ? "Strava" : "Por definir";
    row["Google Maps (inicio exacto)"] = row.MapsURL ? "Maps" : "";
    row["Waze (inicio exacto)"] = row.WazeURL ? "Waze" : "";
    return row;
  }).filter((row) => row.Ruta);

  const { meses, inicios, perfiles } = deriveLists(records);

  const replacements = [
    { regex: /const DATA = .*?;/s, value: `const DATA = ${escapeScriptJson(records)};` },
    { regex: /const MESES = .*?;/s, value: `const MESES = ${escapeScriptJson(meses)};` },
    { regex: /const INICIOS = .*?;/s, value: `const INICIOS = ${escapeScriptJson(inicios)};` },
    { regex: /const PERFILES = .*?;/s, value: `const PERFILES = ${escapeScriptJson(perfiles)};` },
  ];

  let output = template;
  replacements.forEach((item) => {
    output = output.replace(item.regex, item.value);
  });

  await fs.writeFile(OUTPUT_HTML, output, "utf8");
  console.log(`HTML generado en ${OUTPUT_HTML}`);
}

await main();
