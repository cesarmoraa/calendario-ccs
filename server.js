const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, "data");
const ACCESS_LOG_PATH = path.join(DATA_DIR, "accesos.json");
const ROUTES_JSON_PATH = path.join(DATA_DIR, "rutas_procesadas.json");
const REPORT_PATH = path.join(DATA_DIR, "reporte_validacion.txt");
const SESSION_COOKIE = "ccs_session";
const PORT = Number(process.env.PORT || 3000);
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "Lider0001$",
  name: "Administrador CCS",
  rut: "admin-master",
  role: "admin"
};
const VIEWER_CREDENTIALS = [
  {
    username: "visita",
    password: "Visita$",
    name: "Visita",
    rut: "visitor-master",
    role: "view"
  },
  {
    username: "solange",
    password: "ccs2026$",
    name: "Solange",
    rut: "viewer-solange",
    role: "view"
  }
];
const INVALID_LOGIN_ERROR = "No fue posible validar el acceso.";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const sessions = new Map();
const state = {
  loadedAt: null,
  routes: [],
  users: [],
  usersByPin: new Map(),
  duplicatePins: new Map(),
  report: null,
  reportText: ""
};

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ACCESS_LOG_PATH)) fs.writeFileSync(ACCESS_LOG_PATH, "[]\n");
  if (!fs.existsSync(ROUTES_JSON_PATH)) fs.writeFileSync(ROUTES_JSON_PATH, JSON.stringify({ loadedAt: null, routes: [], users: [], report: {} }, null, 2));
  if (!fs.existsSync(REPORT_PATH)) fs.writeFileSync(REPORT_PATH, "Pendiente de generación.\n");
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeString(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  const normalized = normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "por-definir";
}

function resolveExcelPath() {
  const candidates = [
    path.join(ROOT_DIR, "calendario.xlsx"),
    path.join(ROOT_DIR, "Template_Calendario_CCS_GPX.xlsx")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function resolveGpxDir() {
  const candidates = [
    path.join(ROOT_DIR, "gpx"),
    path.join(ROOT_DIR, "GPX")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function resolveTcxDir() {
  const candidates = [
    path.join(ROOT_DIR, "tcx"),
    path.join(ROOT_DIR, "TCX")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function readZipEntry(zipPath, entryPath) {
  return execFileSync("unzip", ["-p", zipPath, entryPath], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function parseAttributes(source) {
  const attrs = {};
  const attrRegex = /([A-Za-z_:][A-Za-z0-9_:\-.]*)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(source))) {
    attrs[match[1]] = decodeXmlEntities(match[2]);
  }
  return attrs;
}

function parseSharedStrings(xml) {
  const strings = [];
  const entryRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = entryRegex.exec(xml))) {
    const textParts = [];
    const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(match[1]))) {
      textParts.push(decodeXmlEntities(textMatch[1]));
    }
    strings.push(textParts.join(""));
  }
  return strings;
}

function parseRelationships(xml) {
  const map = new Map();
  const relRegex = /<Relationship\b([^>]*)\/>/g;
  let match;
  while ((match = relRegex.exec(xml))) {
    const attrs = parseAttributes(match[1]);
    if (attrs.Id && attrs.Target) {
      map.set(attrs.Id, attrs.Target);
    }
  }
  return map;
}

function parseWorkbookSheets(xml, relMap) {
  const sheets = [];
  const sheetRegex = /<sheet\b([^>]*)\/>/g;
  let match;
  while ((match = sheetRegex.exec(xml))) {
    const attrs = parseAttributes(match[1]);
    const relId = attrs["r:id"];
    const target = relMap.get(relId);
    sheets.push({
      name: attrs.name,
      target: target ? `xl/${target}` : null
    });
  }
  return sheets;
}

function columnLettersToIndex(letters) {
  let total = 0;
  for (const char of letters) {
    total = (total * 26) + (char.charCodeAt(0) - 64);
  }
  return total - 1;
}

function columnIndexToLetters(index) {
  let current = index + 1;
  let letters = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    current = Math.floor((current - 1) / 26);
  }
  return letters;
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = [];
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(xml))) {
    const rowAttrs = parseAttributes(rowMatch[1]);
    const cells = {};
    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowMatch[2]))) {
      const attrs = parseAttributes(cellMatch[1]);
      const ref = attrs.r;
      if (!ref) continue;

      const content = cellMatch[2] || "";
      let value = "";
      const valueMatch = content.match(/<v>([\s\S]*?)<\/v>/);
      const inlineMatch = content.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);

      if (attrs.t === "s" && valueMatch) {
        value = sharedStrings[Number.parseInt(valueMatch[1], 10)] || "";
      } else if (inlineMatch) {
        value = decodeXmlEntities(inlineMatch[1]);
      } else if (valueMatch) {
        value = decodeXmlEntities(valueMatch[1]);
      }

      cells[ref] = value;
    }

    rows.push({
      index: Number.parseInt(rowAttrs.r || "0", 10),
      cells
    });
  }

  return rows;
}

function parseHyperlinks(sheetXml, relationshipsXml) {
  const relMap = parseRelationships(relationshipsXml);
  const hyperlinks = new Map();
  const hyperlinkRegex = /<hyperlink\b([^>]*)\/>/g;
  let match;

  while ((match = hyperlinkRegex.exec(sheetXml))) {
    const attrs = parseAttributes(match[1]);
    if (!attrs.ref) continue;
    const target = attrs["r:id"] ? relMap.get(attrs["r:id"]) : attrs.location;
    if (target) hyperlinks.set(attrs.ref, target);
  }

  return hyperlinks;
}

function dateFromExcelSerial(serialValue) {
  const numeric = Number.parseFloat(serialValue);
  if (!Number.isFinite(numeric)) return null;
  const timestamp = Date.UTC(1899, 11, 30) + Math.round(numeric * 86400 * 1000);
  return new Date(timestamp);
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Por definir";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function monthName(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Sin mes";
  return [
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
    "Diciembre"
  ][date.getUTCMonth()];
}

function parseNumeric(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text || /^por definir$/i.test(text) || /^tbd$/i.test(text)) return null;
  const normalized = text.replace(",", ".");
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

function formatDistance(distanceKm) {
  return typeof distanceKm === "number" ? `${distanceKm.toFixed(1)} km` : "Por definir";
}

function formatElevation(elevationGain) {
  return typeof elevationGain === "number" ? `${Math.round(elevationGain)} m` : "Por definir";
}

function formatDuration(totalSeconds) {
  if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "Por definir";
  }
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function nonEmptyValue(value) {
  const text = normalizeString(value);
  if (!text) return "Por definir";
  if (/^tbd$/i.test(text)) return "Por definir";
  return text;
}

function readWorkbookStructure(excelPath) {
  const workbookXml = readZipEntry(excelPath, "xl/workbook.xml");
  const workbookRelsXml = readZipEntry(excelPath, "xl/_rels/workbook.xml.rels");
  const sharedStringsXml = readZipEntry(excelPath, "xl/sharedStrings.xml");
  const workbookRelMap = parseRelationships(workbookRelsXml);

  return {
    sheets: parseWorkbookSheets(workbookXml, workbookRelMap),
    sharedStrings: parseSharedStrings(sharedStringsXml)
  };
}

function findSheetByName(sheets, aliases, fallbackIndex) {
  const aliasKeys = aliases.map((alias) => normalizeKey(alias));
  const exact = sheets.find((sheet) => aliasKeys.includes(normalizeKey(sheet.name)));
  return exact || sheets[fallbackIndex];
}

function buildHeaderMap(headerRow) {
  const headerMap = new Map();
  Object.entries(headerRow.cells).forEach(([ref, value]) => {
    const letters = ref.match(/[A-Z]+/)[0];
    headerMap.set(columnLettersToIndex(letters), normalizeString(value));
  });
  return headerMap;
}

function cellValueFromRow(row, headerMap, headerNames) {
  const normalizedHeaders = Array.isArray(headerNames) ? headerNames : [headerNames];
  const headerKeys = normalizedHeaders.map((header) => normalizeKey(header));
  for (const [colIndex, headerText] of headerMap.entries()) {
    if (headerKeys.includes(normalizeKey(headerText))) {
      const ref = `${columnIndexToLetters(colIndex)}${row.index}`;
      if (Object.prototype.hasOwnProperty.call(row.cells, ref)) {
        return row.cells[ref];
      }
      return "";
    }
  }
  return "";
}

function cellRefForHeader(row, headerMap, headerName) {
  const key = normalizeKey(headerName);
  for (const [colIndex, headerText] of headerMap.entries()) {
    if (normalizeKey(headerText) === key) {
      return `${columnIndexToLetters(colIndex)}${row.index}`;
    }
  }
  return null;
}

function getFileIndex(baseDir) {
  const files = fs.existsSync(baseDir) ? fs.readdirSync(baseDir) : [];
  const map = new Map();

  for (const file of files) {
    const fullPath = path.join(baseDir, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    const key = normalizeKey(file);
    map.set(key, fullPath);
  }

  return {
    resolve(fileName) {
      const normalized = normalizeKey(fileName);
      if (map.has(normalized)) return map.get(normalized);

      for (const [key, candidate] of map.entries()) {
        if (key.includes(normalized) || normalized.includes(key)) {
          return candidate;
        }
      }

      return null;
    }
  };
}

function getSiblingFileName(fileName, extension) {
  const source = normalizeString(fileName);
  if (!source || source === "Por definir") return "";
  const extWithDot = extension.startsWith(".") ? extension : `.${extension}`;
  if (/\.[a-z0-9]+$/i.test(source)) {
    return source.replace(/\.[a-z0-9]+$/i, extWithDot);
  }
  return `${source}${extWithDot}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = (
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  );
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function parseGpx(filePath) {
  const xml = fs.readFileSync(filePath, "utf8");
  const pointRegex = /<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  const points = [];
  let match;

  while ((match = pointRegex.exec(xml))) {
    const attrs = parseAttributes(match[2]);
    const lat = Number.parseFloat(attrs.lat);
    const lon = Number.parseFloat(attrs.lon);
    const eleMatch = match[3].match(/<ele>([\s\S]*?)<\/ele>/);
    const ele = eleMatch ? Number.parseFloat(decodeXmlEntities(eleMatch[1])) : null;

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push({ lat, lon, ele: Number.isFinite(ele) ? ele : null });
    }
  }

  if (!points.length) {
    return {
      distanceKm: null,
      elevationGain: null,
      startLat: null,
      startLon: null
    };
  }

  let distanceKm = 0;
  let elevationGain = 0;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    distanceKm += haversineKm(prev.lat, prev.lon, current.lat, current.lon);
    if (prev.ele !== null && current.ele !== null) {
      const delta = current.ele - prev.ele;
      if (delta > 0) elevationGain += delta;
    }
  }

  return {
    distanceKm,
    elevationGain,
    startLat: points[0].lat,
    startLon: points[0].lon
  };
}

function parseTcx(filePath) {
  const xml = fs.readFileSync(filePath, "utf8");
  const totalTimeMatch = xml.match(/<TotalTimeSeconds>([\d.]+)<\/TotalTimeSeconds>/);
  const lapDistanceMatch = xml.match(/<Lap>[\s\S]*?<DistanceMeters>([\d.]+)<\/DistanceMeters>/);
  const trackpointRegex = /<Trackpoint>([\s\S]*?)<\/Trackpoint>/g;
  const points = [];

  for (const match of xml.matchAll(trackpointRegex)) {
    const block = match[1];
    const latMatch = block.match(/<LatitudeDegrees>([-\d.]+)<\/LatitudeDegrees>/);
    const lonMatch = block.match(/<LongitudeDegrees>([-\d.]+)<\/LongitudeDegrees>/);
    const eleMatch = block.match(/<AltitudeMeters>([-\d.]+)<\/AltitudeMeters>/);
    const distanceMatch = block.match(/<DistanceMeters>([\d.]+)<\/DistanceMeters>/);
    const lat = Number.parseFloat(latMatch ? latMatch[1] : "");
    const lon = Number.parseFloat(lonMatch ? lonMatch[1] : "");
    const ele = Number.parseFloat(eleMatch ? eleMatch[1] : "");
    const distanceMeters = Number.parseFloat(distanceMatch ? distanceMatch[1] : "");
    points.push({
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      ele: Number.isFinite(ele) ? ele : null,
      distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null
    });
  }

  let elevationGain = 0;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    if (prev.ele === null || current.ele === null) continue;
    const delta = current.ele - prev.ele;
    if (delta > 0) elevationGain += delta;
  }

  const firstPointWithPosition = points.find((point) => point.lat !== null && point.lon !== null) || null;
  const lastPointWithDistance = [...points].reverse().find((point) => point.distanceMeters !== null) || null;
  const distanceKmFromLap = totalTimeMatch && lapDistanceMatch
    ? Number.parseFloat(lapDistanceMatch[1]) / 1000
    : null;
  const distanceKmFromTrack = lastPointWithDistance ? lastPointWithDistance.distanceMeters / 1000 : null;

  return {
    totalSeconds: totalTimeMatch ? Number.parseFloat(totalTimeMatch[1]) : null,
    timeText: totalTimeMatch ? formatDuration(Number.parseFloat(totalTimeMatch[1])) : "Por definir",
    distanceKm: Number.isFinite(distanceKmFromLap) ? distanceKmFromLap : distanceKmFromTrack,
    elevationGain: points.length ? elevationGain : null,
    startLat: firstPointWithPosition ? firstPointWithPosition.lat : null,
    startLon: firstPointWithPosition ? firstPointWithPosition.lon : null
  };
}

function deriveProfile(rawProfile, elevationGain) {
  const profile = nonEmptyValue(rawProfile);
  if (profile !== "Por definir") return profile;
  if (typeof elevationGain !== "number") return "Por definir";
  if (elevationGain < 1000) return "Fondo";
  if (elevationGain <= 2000) return "Media montaña";
  return "Alta montaña";
}

function buildMapsLink(rawLink, lat, lon) {
  const link = nonEmptyValue(rawLink);
  if (link !== "Por definir") return link;
  if (typeof lat === "number" && typeof lon === "number") {
    return `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
  }
  return "Pendiente";
}

function buildWazeLink(rawLink, lat, lon) {
  const link = nonEmptyValue(rawLink);
  if (link !== "Por definir") return link;
  if (typeof lat === "number" && typeof lon === "number") {
    return `https://waze.com/ul?ll=${lat.toFixed(6)},${lon.toFixed(6)}&navigate=yes`;
  }
  return "Pendiente";
}

function computeRouteStatus(route) {
  const criticalValues = [
    route.start,
    route.distanceText,
    route.elevationText
  ];
  if (criticalValues.includes("Por definir")) return "Por definir";
  if (!route.stravaUrl || route.stravaUrl === "Por definir") return "Por definir";
  return "Confirmada";
}

function formatRouteForOutput(route) {
  const profileKey = slugify(route.profile);
  const status = computeRouteStatus(route);
  return {
    ...route,
    profileKey,
    status,
    statusKey: slugify(status)
  };
}

function buildValidationText(report) {
  const lines = [
    "Reporte de validación CCS 2026",
    `Generado: ${report.generatedAt}`,
    "",
    `Excel fuente: ${report.excelFile}`,
    `Carpeta GPX: ${report.gpxDirectory}`,
    `Usuarios cargados: ${report.usersLoaded}`,
    ""
  ];

  const sections = [
    ["Rutas sin GPX", report.routesWithoutGpx],
    ["GPX no encontrados", report.gpxNotFound],
    ["Rutas sin Strava", report.routesWithoutStrava],
    ["Rutas sin Inicio", report.routesWithoutStart],
    ["Filas ignoradas", report.ignoredRows],
    ["Usuarios duplicados por PIN", report.duplicatePins]
  ];

  for (const [title, items] of sections) {
    lines.push(`${title}: ${items.length}`);
    if (items.length) {
      for (const item of items) {
        lines.push(`- ${item}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

function trimRouteName(value) {
  return normalizeString(value) || "Por definir";
}

function parseWorkbookData() {
  const excelPath = resolveExcelPath();
  const gpxDir = resolveGpxDir();
  const tcxDir = resolveTcxDir();
  const { sheets, sharedStrings } = readWorkbookStructure(excelPath);
  const routeSheet = findSheetByName(sheets, ["RUTAS", "HOJA RUTAS", "Template_Calendario_CCS"], 0);
  const userSheet = findSheetByName(sheets, ["USUARIOS", "USERS", "Usuarios"], 1);

  const routeSheetXml = readZipEntry(excelPath, routeSheet.target);
  const routeRows = parseWorksheetRows(routeSheetXml, sharedStrings);
  const routeRelsPath = routeSheet.target.replace("xl/worksheets/", "xl/worksheets/_rels/").replace(".xml", ".xml.rels");
  const routeRelsXml = fs.existsSync(path.join(ROOT_DIR, routeRelsPath)) ? "" : null;
  let routeHyperlinks = new Map();
  try {
    routeHyperlinks = parseHyperlinks(routeSheetXml, readZipEntry(excelPath, routeRelsPath));
  } catch {
    routeHyperlinks = new Map();
  }

  const userSheetXml = readZipEntry(excelPath, userSheet.target);
  const userRows = parseWorksheetRows(userSheetXml, sharedStrings);
  const gpxIndex = getFileIndex(gpxDir);
  const tcxIndex = getFileIndex(tcxDir);

  const routeHeaderMap = buildHeaderMap(routeRows[0]);
  const userHeaderMap = buildHeaderMap(userRows[0]);

  const report = {
    generatedAt: new Date().toLocaleString("es-CL"),
    excelFile: path.basename(excelPath),
    gpxDirectory: path.basename(gpxDir),
    usersLoaded: 0,
    routesWithoutGpx: [],
    gpxNotFound: [],
    routesWithoutStrava: [],
    routesWithoutStart: [],
    ignoredRows: [],
    duplicatePins: []
  };

  const routes = [];
  for (const row of routeRows.slice(1)) {
    const routeName = trimRouteName(cellValueFromRow(row, routeHeaderMap, "Ruta"));
    const hasAnyValue = Object.values(row.cells).some((value) => normalizeString(value));
    if (routeName === "Por definir") {
      if (hasAnyValue) report.ignoredRows.push(`Fila ${row.index}: falta Ruta`);
      continue;
    }

    const date = dateFromExcelSerial(cellValueFromRow(row, routeHeaderMap, "Fecha"));
    const type = nonEmptyValue(cellValueFromRow(row, routeHeaderMap, "Tipo Salida"));
    const start = nonEmptyValue(cellValueFromRow(row, routeHeaderMap, "Inicio"));
    const gpxFile = nonEmptyValue(cellValueFromRow(row, routeHeaderMap, "Archivo GPX"));
    const timeText = nonEmptyValue(cellValueFromRow(row, routeHeaderMap, "Tiempo Total Aprox"));
    const profileRaw = cellValueFromRow(row, routeHeaderMap, "Perfil");
    const mapsRaw = cellValueFromRow(row, routeHeaderMap, "Google Maps (inicio exacto)");
    const wazeRaw = cellValueFromRow(row, routeHeaderMap, "Waze (inicio exacto)");
    const stravaRef = cellRefForHeader(row, routeHeaderMap, "Link Strava");
    const stravaText = cellValueFromRow(row, routeHeaderMap, "Link Strava");
    const stravaUrl = routeHyperlinks.get(stravaRef) || (/^https?:\/\//i.test(stravaText) ? stravaText : "");

    if (!stravaUrl) report.routesWithoutStrava.push(`${formatDate(date)} · ${routeName}`);
    if (start === "Por definir") report.routesWithoutStart.push(`${formatDate(date)} · ${routeName}`);

    let gpxPath = null;
    let gpxData = {
      distanceKm: null,
      elevationGain: null,
      startLat: null,
      startLon: null
    };
    let tcxPath = null;
    let tcxData = {
      totalSeconds: null,
      timeText: "Por definir",
      distanceKm: null,
      elevationGain: null,
      startLat: null,
      startLon: null
    };

    if (gpxFile === "Por definir") {
      report.routesWithoutGpx.push(`${formatDate(date)} · ${routeName}`);
    } else {
      gpxPath = gpxIndex.resolve(gpxFile);
      if (!gpxPath) {
        report.gpxNotFound.push(`${formatDate(date)} · ${routeName} · ${gpxFile}`);
      } else {
        gpxData = parseGpx(gpxPath);
      }
    }

    const tcxCandidate = getSiblingFileName(gpxFile, ".tcx") || getSiblingFileName(routeName, ".tcx");
    if (tcxCandidate) {
      tcxPath = tcxIndex.resolve(tcxCandidate);
      if (tcxPath) {
        tcxData = parseTcx(tcxPath);
      }
    }

    const resolvedLat = tcxData.startLat ?? gpxData.startLat;
    const resolvedLon = tcxData.startLon ?? gpxData.startLon;
    const resolvedDistanceKm = tcxData.distanceKm ?? gpxData.distanceKm;
    const resolvedElevationGain = tcxData.elevationGain ?? gpxData.elevationGain;
    const resolvedTimeText = timeText !== "Por definir" ? timeText : tcxData.timeText;
    const mapsUrl = buildMapsLink(mapsRaw, resolvedLat, resolvedLon);
    const wazeUrl = buildWazeLink(wazeRaw, resolvedLat, resolvedLon);
    const profile = deriveProfile(profileRaw, resolvedElevationGain);
    const distanceText = formatDistance(resolvedDistanceKm);
    const elevationText = formatElevation(resolvedElevationGain);

    routes.push(formatRouteForOutput({
      id: `route-${row.index}`,
      date: formatDate(date),
      dateIso: date ? date.toISOString() : null,
      monthName: monthName(date),
      type,
      route: routeName,
      start,
      profile,
      distanceKm: resolvedDistanceKm,
      distanceText,
      elevationGain: resolvedElevationGain,
      elevationText,
      timeText: resolvedTimeText,
      stravaUrl: stravaUrl || "Por definir",
      mapsUrl,
      wazeUrl,
      gpxFile: gpxFile === "Por definir" ? null : gpxFile,
      gpxResolvedPath: gpxPath ? path.basename(gpxPath) : null,
      tcxResolvedPath: tcxPath ? path.basename(tcxPath) : null,
      latitude: resolvedLat,
      longitude: resolvedLon
    }));
  }

  routes.sort((left, right) => {
    if (!left.dateIso || !right.dateIso) return left.route.localeCompare(right.route, "es");
    return left.dateIso.localeCompare(right.dateIso);
  });

  const users = [];
  const usersByPin = new Map();
  const duplicatePins = new Map();

  for (const row of userRows.slice(1)) {
    const status = normalizeString(cellValueFromRow(row, userHeaderMap, ["estado del socio", "Estado", "estado"]));
    const rut = normalizeString(cellValueFromRow(row, userHeaderMap, ["RUT", "Rut"]));
    const firstName = normalizeString(cellValueFromRow(row, userHeaderMap, ["Nombre", "NOMBRE"]));
    const lastName = normalizeString(cellValueFromRow(row, userHeaderMap, ["Apellido", "APELLIDO"]));
    if (!rut || !firstName) continue;
    if (status && normalizeKey(status) !== "activo") continue;

    const canonicalRut = rut.replace(/\s+/g, "");
    const pin = extractPinFromRut(canonicalRut);
    const user = {
      name: normalizeString(`${firstName} ${lastName}`),
      rut: canonicalRut,
      pin
    };
    users.push(user);

    if (!usersByPin.has(pin)) usersByPin.set(pin, []);
    usersByPin.get(pin).push(user);
  }

  for (const [pin, entries] of usersByPin.entries()) {
    if (entries.length > 1) {
      duplicatePins.set(pin, entries);
      report.duplicatePins.push(`${pin}: ${entries.map((entry) => `${entry.name} (${entry.rut})`).join(" | ")}`);
    }
  }

  report.usersLoaded = users.length;
  return {
    routes,
    users,
    usersByPin,
    duplicatePins,
    report
  };
}

function extractPinFromRut(rut) {
  const cleaned = String(rut || "").replace(/\./g, "").replace(/\s+/g, "").replace(/,/g, ".");
  const beforeDash = cleaned.split("-")[0].replace(/\D/g, "");
  return beforeDash.slice(-4);
}

function persistProcessedData() {
  const serializableUsers = state.users.map((user) => ({ name: user.name, rut: user.rut }));
  writeJson(ROUTES_JSON_PATH, {
    loadedAt: state.loadedAt,
    routes: state.routes,
    users: serializableUsers,
    report: state.report
  });
  fs.writeFileSync(REPORT_PATH, `${state.reportText}\n`, "utf8");
}

function loadPersistedState() {
  const persisted = safeReadJson(ROUTES_JSON_PATH, null);
  if (!persisted || typeof persisted !== "object") return false;

  state.loadedAt = persisted.loadedAt || null;
  state.routes = Array.isArray(persisted.routes) ? persisted.routes : [];
  state.users = Array.isArray(persisted.users)
    ? persisted.users
        .map((user) => ({
          name: user.name,
          rut: user.rut,
          pin: extractPinFromRut(user.rut)
        }))
        .filter((user) => user.name && user.rut && user.pin)
    : [];
  state.report = persisted.report || null;
  state.reportText = fs.existsSync(REPORT_PATH)
    ? fs.readFileSync(REPORT_PATH, "utf8").trimEnd()
    : "";
  state.usersByPin = new Map();
  state.duplicatePins = new Map();

  for (const user of state.users) {
    if (!state.usersByPin.has(user.pin)) state.usersByPin.set(user.pin, []);
    state.usersByPin.get(user.pin).push(user);
  }

  for (const [pin, entries] of state.usersByPin.entries()) {
    if (entries.length > 1) state.duplicatePins.set(pin, entries);
  }

  return true;
}

async function refreshData() {
  const result = parseWorkbookData();
  state.loadedAt = new Date().toLocaleString("es-CL");
  state.routes = result.routes;
  state.users = result.users;
  state.report = result.report;
  state.reportText = buildValidationText(result.report);
  state.usersByPin = new Map();
  state.duplicatePins = result.duplicatePins;

  for (const user of result.users) {
    if (!state.usersByPin.has(user.pin)) state.usersByPin.set(user.pin, []);
    state.usersByPin.get(user.pin).push(user);
  }

  persistProcessedData();
}

function getCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((acc, chunk) => {
    const [key, ...rest] = chunk.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function getSession(req) {
  const cookies = getCookies(req);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(`${JSON.stringify(payload)}\n`);
}

function sendText(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  });
  res.end(payload);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

function notFound(res) {
  sendJson(res, 404, { error: "No encontrado" });
}

function unauthorized(res) {
  sendJson(res, 401, { error: "Sesión no válida" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

function appendAccessLog(entry) {
  const log = safeReadJson(ACCESS_LOG_PATH, []);
  log.push(entry);
  writeJson(ACCESS_LOG_PATH, log);
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
}

function registerAccess(req, meta) {
  appendAccessLog({
    nombre: meta.name || "",
    rut: meta.rut || "",
    role: meta.role || "",
    fecha_hora: new Date().toISOString(),
    user_agent: req.headers["user-agent"] || "",
    ip: clientIp(req),
    resultado: meta.result
  });
}

function inferAccessRole(entry) {
  if (entry.role) return entry.role;
  if (entry.rut === ADMIN_CREDENTIALS.rut) return "admin";
  if (VIEWER_CREDENTIALS.some((viewer) => viewer.rut === entry.rut)) return "view";
  if (entry.rut) return "member";
  return "";
}

function summarizeAccessLog(logEntries, users) {
  const successfulEntries = logEntries.filter((entry) => entry && entry.result === "ok");
  const byAccount = new Map();

  for (const entry of successfulEntries) {
    const rut = String(entry.rut || "").trim();
    const name = String(entry.nombre || "").trim();
    const role = inferAccessRole(entry);
    const key = rut || name.toLowerCase();
    if (!key) continue;

    const timestamp = Date.parse(entry.fecha_hora || "");
    const current = byAccount.get(key) || {
      name,
      rut,
      role,
      count: 0,
      lastAccess: "",
      lastAccessTs: 0
    };

    current.count += 1;
    current.name = current.name || name;
    current.rut = current.rut || rut;
    current.role = current.role || role;
    if (!Number.isNaN(timestamp) && timestamp >= current.lastAccessTs) {
      current.lastAccess = entry.fecha_hora || "";
      current.lastAccessTs = timestamp;
    }

    byAccount.set(key, current);
  }

  const accounts = Array.from(byAccount.values())
    .sort((left, right) => {
      if (right.lastAccessTs !== left.lastAccessTs) return right.lastAccessTs - left.lastAccessTs;
      return right.count - left.count;
    })
    .map(({ lastAccessTs, ...entry }) => entry);

  const enteredMemberRuts = new Set(
    accounts
      .filter((entry) => entry.role === "member" && entry.rut)
      .map((entry) => entry.rut)
  );

  const neverEntered = users
    .filter((user) => user && user.rut && !enteredMemberRuts.has(user.rut))
    .map((user) => ({
      name: user.name,
      rut: user.rut
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "es"));

  return {
    totals: {
      successfulLogins: successfulEntries.length,
      accountsWithAccess: accounts.length,
      membersNeverEntered: neverEntered.length
    },
    accounts,
    neverEntered
  };
}

function validatePin(username, password) {
  const userPin = String(username || "").trim();
  const passwordPin = String(password || "").trim();
  if (!/^\d{4}$/.test(userPin) || userPin !== passwordPin) {
    return { ok: false, error: INVALID_LOGIN_ERROR };
  }

  const candidates = state.usersByPin.get(userPin) || [];
  if (!candidates.length) {
    return { ok: false, error: INVALID_LOGIN_ERROR };
  }
  if (candidates.length > 1) {
    return { ok: false, error: INVALID_LOGIN_ERROR };
  }

  return {
    ok: true,
    user: {
      ...candidates[0],
      role: "member"
    }
  };
}

function validateCredentials(username, password) {
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "").trim();

  if (normalizedUsername === ADMIN_CREDENTIALS.username) {
    if (normalizedPassword !== ADMIN_CREDENTIALS.password) {
      return { ok: false, error: INVALID_LOGIN_ERROR };
    }

    return {
      ok: true,
      user: {
        name: ADMIN_CREDENTIALS.name,
        rut: ADMIN_CREDENTIALS.rut,
        role: ADMIN_CREDENTIALS.role
      }
    };
  }

  const viewerUser = VIEWER_CREDENTIALS.find((viewer) => normalizedUsername.toLowerCase() === viewer.username);
  if (viewerUser) {
    if (normalizedPassword !== viewerUser.password) {
      return { ok: false, error: INVALID_LOGIN_ERROR };
    }

    return {
      ok: true,
      user: {
        name: viewerUser.name,
        rut: viewerUser.rut,
        role: viewerUser.role
      }
    };
  }

  return validatePin(normalizedUsername, normalizedPassword);
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    unauthorized(res);
    return null;
  }
  return session;
}

function forbidden(res, message = "No autorizado.") {
  sendJson(res, 403, { error: message });
}

function requireAdminSession(req, res) {
  const session = requireSession(req, res);
  if (!session) return null;
  if (session.role !== "admin") {
    forbidden(res);
    return null;
  }
  return session;
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/session" && req.method === "GET") {
    const session = getSession(req);
    if (!session) {
      unauthorized(res);
      return;
    }
    sendJson(res, 200, { user: { name: session.name, role: session.role || "member" } });
    return;
  }

  if (pathname === "/api/login" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const validation = validateCredentials(body.username, body.password);
      if (!validation.ok) {
        registerAccess(req, { result: "error" });
        sendJson(res, 401, { error: validation.error });
        return;
      }

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, {
        sessionId,
        name: validation.user.name,
        rut: validation.user.rut,
        role: validation.user.role,
        createdAt: Date.now()
      });
      registerAccess(req, {
        name: validation.user.name,
        rut: validation.user.rut,
        role: validation.user.role,
        result: "ok"
      });
      sendJson(
        res,
        200,
        { ok: true, user: { name: validation.user.name, role: validation.user.role } },
        {
          "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800`
        }
      );
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Solicitud inválida" });
      return;
    }
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    const cookies = getCookies(req);
    if (cookies[SESSION_COOKIE]) sessions.delete(cookies[SESSION_COOKIE]);
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
    });
    return;
  }

  if (pathname === "/api/calendar" && req.method === "GET") {
    const session = requireSession(req, res);
    if (!session) return;
    sendJson(res, 200, {
      loadedAt: state.loadedAt,
      report: state.report,
      routes: state.routes
    });
    return;
  }

  if (pathname === "/api/refresh" && req.method === "POST") {
    const session = requireAdminSession(req, res);
    if (!session) return;
    try {
      await refreshData();
      sendJson(res, 200, {
        ok: true,
        loadedAt: state.loadedAt,
        routes: state.routes.length
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "No fue posible actualizar el calendario." });
    }
    return;
  }

  if (pathname === "/api/access-log" && req.method === "GET") {
    const session = requireAdminSession(req, res);
    if (!session) return;
    sendJson(res, 200, safeReadJson(ACCESS_LOG_PATH, []));
    return;
  }

  if (pathname === "/api/access-summary" && req.method === "GET") {
    const session = requireAdminSession(req, res);
    if (!session) return;
    const log = safeReadJson(ACCESS_LOG_PATH, []);
    sendJson(res, 200, summarizeAccessLog(log, state.users));
    return;
  }

  if (pathname === "/api/report" && req.method === "GET") {
    const session = requireAdminSession(req, res);
    if (!session) return;
    sendText(res, 200, state.reportText || "Sin reporte");
    return;
  }

  notFound(res);
}

function serveStatic(req, res, pathname) {
  let targetPath = pathname === "/" ? "/login.html" : pathname;
  const safePath = path.normalize(targetPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    notFound(res);
    return;
  }
  sendFile(res, filePath);
}

function createServer() {
  return http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname || "/";
    try {
      if (pathname.startsWith("/api/")) {
        await handleApi(req, res, pathname);
        return;
      }
      serveStatic(req, res, pathname);
    } catch (error) {
      sendJson(res, 500, { error: error.message || "Error interno del servidor" });
    }
  });
}

async function bootstrap() {
  ensureDataFiles();
  try {
    await refreshData();
  } catch (error) {
    const restored = loadPersistedState();
    console.error(
      restored
        ? `No fue posible leer el Excel al iniciar. Se mantiene la cache local y el acceso admin: ${error.message}`
        : `No fue posible leer el Excel al iniciar. Se mantiene el acceso admin con datos vacíos: ${error.message}`
    );
  }
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`CCS mini app lista en http://localhost:${PORT}`);
  });
  return server;
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("No fue posible iniciar la mini app:", error);
    process.exitCode = 1;
  });
}

module.exports = {
  createServer,
  refreshData,
  parseWorkbookData,
  extractPinFromRut,
  validatePin,
  validateCredentials,
  state,
  ensureDataFiles,
  bootstrap,
  loadPersistedState
};
