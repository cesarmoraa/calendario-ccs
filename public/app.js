const state = {
  routes: [],
  filteredRoutes: [],
  user: null,
  report: null,
  loadedAt: null,
  accessSummary: null,
  sourceExcel: '',
  refreshNotice: '',
  view: 'table'
};

const els = {
  welcome: document.getElementById('welcome'),
  subtitle: document.getElementById('hero-subtitle'),
  status: document.getElementById('load-status'),
  metrics: document.getElementById('metrics-grid'),
  adminPanel: document.getElementById('admin-access-panel'),
  adminMetrics: document.getElementById('admin-access-metrics'),
  adminAccessCount: document.getElementById('admin-access-count'),
  adminAccessBody: document.getElementById('admin-access-body'),
  body: document.getElementById('calendar-body'),
  mobile: document.getElementById('mobile-cards'),
  stagesView: document.getElementById('stages-view'),
  tableView: document.getElementById('table-view'),
  viewTabs: Array.from(document.querySelectorAll('.view-tab')),
  refresh: document.getElementById('refresh-btn'),
  logout: document.getElementById('logout-btn'),
  month: document.getElementById('filter-month'),
  start: document.getElementById('filter-start'),
  profile: document.getElementById('filter-profile'),
  type: document.getElementById('filter-type'),
  search: document.getElementById('filter-search')
};

function firstNameFromFullName(value) {
  return String(value || '').trim().split(/\s+/)[0] || '';
}

function fmtNumber(value, digits = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Por definir';
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function formatAccessDate(value) {
  if (!value) return 'Sin registro';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin registro';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(parsed);
}

function roleLabel(role) {
  return {
    admin: 'Admin',
    member: 'Socio',
    view: 'Visita'
  }[role] || 'Cuenta';
}

function buildLoadStatusText(routeCount) {
  const parts = [];
  if (state.refreshNotice) parts.push(state.refreshNotice);
  parts.push(`Mostrando ${routeCount} rutas`);
  if (state.loadedAt) parts.push(`actualizado ${state.loadedAt}`);
  if (state.sourceExcel) parts.push(`fuente ${state.sourceExcel}`);
  return parts.join(' · ');
}

function monthNameFromDate(dateText) {
  const [day, month] = String(dateText || '').split('/');
  const monthIndex = Number.parseInt(month, 10);
  const names = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return names[monthIndex] || 'Sin mes';
}

const MONTH_ORDER = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function currentMonthName() {
  return MONTH_ORDER[new Date().getMonth()] || '';
}

function applyDefaultMonthFilter() {
  if (!els.month || els.month.dataset.initialized === 'true') return;

  const month = currentMonthName();
  const availableValues = Array.from(els.month.options).map((option) => option.value);
  if (availableValues.includes(month)) {
    els.month.value = month;
  }

  els.month.dataset.initialized = 'true';
}

function parseRouteDate(dateText) {
  const match = String(dateText || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const rawYear = Number.parseInt(match[3], 10);
  const year = match[3].length === 2 ? 2000 + rawYear : rawYear;
  const parsed = new Date(year, month, day, 12, 0, 0, 0);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function routeMatches(route, filters) {
  const haystack = `${route.route} ${route.start}`.toLowerCase();
  if (filters.month && route.monthName !== filters.month) return false;
  if (filters.start && route.start !== filters.start) return false;
  if (filters.profile && route.profile !== filters.profile) return false;
  if (filters.type && route.type !== filters.type) return false;
  if (filters.search && !haystack.includes(filters.search)) return false;
  return true;
}

function buildActionButton(link, label, title) {
  const disabled = !link || link === 'Pendiente' || link === 'Por definir';
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a class="action-btn ${disabled ? 'is-disabled' : ''}"${titleAttr} ${disabled ? '' : `href="${link}" target="_blank" rel="noopener noreferrer"`}>${label}</a>`;
}

const STRAVA_VARIANTS = [
  ['stravaR', 'R', 'Ristretto'],
  ['stravaM', 'M', 'Macchiato'],
  ['stravaC', 'C', 'Capuccino']
];

// Tres botones de Strava por nivel (R/M/C). Fallback a stravaUrl si aún no hay R.
function buildStravaButtons(route) {
  const buttons = STRAVA_VARIANTS.map(([key, label, title]) => {
    const link = route[key] || (key === 'stravaR' ? route.stravaUrl : '');
    return buildActionButton(link, label, `Strava · ${title}`);
  }).join('');
  return `<span class="strava-group"><span class="strava-group-label">Link Strava</span><span class="strava-group-buttons">${buttons}</span></span>`;
}

function renderMetrics(routes) {
  const km = routes.reduce((sum, route) => sum + (route.distanceKm || 0), 0);
  const gain = routes.reduce((sum, route) => sum + (route.elevationGain || 0), 0);
  const counts = routes.reduce((acc, route) => {
    acc[route.profile] = (acc[route.profile] || 0) + 1;
    return acc;
  }, {});
  const pending = routes.filter((route) => route.status === 'Por definir').length;

  const cards = [
    ['Rutas visibles', routes.length],
    ['Km acumulados', fmtNumber(km, 1)],
    ['D+ acumulado', typeof gain === 'number' ? `${fmtNumber(gain, 0)} m` : 'Por definir'],
    ['Por definir', pending]
  ];

  const mixMarkup = Object.entries(counts)
    .map(([key, value]) => `<span class="metric-chip">${value} × ${key}</span>`)
    .join('') || '<span class="metric-chip">Sin datos</span>';

  els.metrics.innerHTML = cards
    .map(([title, value]) => `<article class="metric-card"><span>${title}</span><strong>${value}</strong></article>`)
    .join('') + `<article class="metric-card metric-wide metric-mix"><span>Mix de perfiles</span><div class="metric-chip-row">${mixMarkup}</div></article>`;
}

function renderYearToDateSummary(routes) {
  if (!els.subtitle) return;

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const totals = routes.reduce((acc, route) => {
    const routeDate = parseRouteDate(route.date);
    if (!routeDate) return acc;
    if (routeDate.getFullYear() !== today.getFullYear()) return acc;
    if (routeDate > today) return acc;

    acc.km += route.distanceKm || 0;
    acc.gain += route.elevationGain || 0;
    return acc;
  }, { km: 0, gain: 0 });

  els.subtitle.textContent = `Este año llevamos ${fmtNumber(totals.km, 1)} km y ${fmtNumber(totals.gain, 0)} m de altimetría acumulada.`;
}

function renderAccessSummary(summary) {
  if (!els.adminPanel) return;
  if (!summary || state.user?.role !== 'admin') {
    els.adminPanel.hidden = true;
    return;
  }

  const cards = [
    ['Ingresos exitosos', summary.totals.successfulLogins],
    ['Cuentas con ingreso', summary.totals.accountsWithAccess]
  ];

  els.adminMetrics.innerHTML = cards
    .map(([label, value]) => `<article class="admin-access-metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join('');

  els.adminAccessCount.textContent = `${summary.accounts.length} cuentas`;
  els.adminAccessBody.innerHTML = summary.accounts.length
    ? summary.accounts.map((entry) => `
      <tr>
        <td>${entry.name || 'Sin nombre'}</td>
        <td>${roleLabel(entry.role)}</td>
        <td>${entry.count}</td>
        <td>${formatAccessDate(entry.lastAccess)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4">Todavía no hay ingresos exitosos registrados.</td></tr>';

  els.adminPanel.hidden = false;
}

function renderTable(routes) {
  els.body.innerHTML = routes.map((route) => `
    <tr>
      <td>${route.date}</td>
      <td>${route.type}</td>
      <td class="route-name">${route.route}</td>
      <td>${route.start}</td>
      <td><span class="profile-chip profile-${route.profileKey}">${route.profile}</span></td>
      <td>${route.distanceText}</td>
      <td>${route.elevationText}</td>
      <td>${route.timeText}</td>
      <td>
        <div class="action-stack">
          ${buildStravaButtons(route)}
          ${buildActionButton(route.mapsUrl, 'Maps')}
          ${buildActionButton(route.wazeUrl, 'Waze')}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCards(routes) {
  els.mobile.innerHTML = routes.map((route) => `
    <article class="route-card">
      <div class="route-card-top">
        <div>
          <span class="route-date">${route.date}</span>
          <h3>${route.route}</h3>
        </div>
      </div>
      <div class="route-meta-grid">
        <div><span>Tipo</span><strong>${route.type}</strong></div>
        <div><span>Inicio</span><strong>${route.start}</strong></div>
        <div><span>Perfil</span><strong>${route.profile}</strong></div>
        <div><span>Tiempo Aprox</span><strong>${route.timeText}</strong></div>
        <div><span>Distancia</span><strong>${route.distanceText}</strong></div>
        <div><span>D+</span><strong>${route.elevationText}</strong></div>
      </div>
      <div class="action-row">
        ${buildStravaButtons(route)}
        ${buildActionButton(route.mapsUrl, 'Maps')}
        ${buildActionButton(route.wazeUrl, 'Waze')}
      </div>
    </article>
  `).join('');
}

const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function stageEndpoints(route) {
  const parts = String(route.route || '').split(/\s+[-–—]\s+/).map((piece) => piece.trim()).filter(Boolean);
  const origin = route.start && route.start !== 'Por definir' ? route.start : (parts[0] || route.route || 'Salida');
  let finish = parts.length > 1 ? parts[parts.length - 1] : '';
  if (finish && finish.toLowerCase() === origin.toLowerCase()) finish = '';
  return { origin, finish };
}

function stageDateLabel(route) {
  const parsed = parseRouteDate(route.date);
  if (!parsed) return route.date || '';
  return `${DAY_FULL[parsed.getDay()]}, ${parsed.getDate()} de ${MONTH_FULL[parsed.getMonth()]}`;
}

// Marca-style elevation block: filled silhouette (SVG, no text) plus HTML
// overlays for the peak label and km axis so nothing gets stretched.
function buildProfileBlock(profile) {
  if (!Array.isArray(profile) || profile.length < 2) {
    return '<div class="stage-profile-empty">Perfil no disponible</div>';
  }

  const W = 1000;
  const H = 200;
  const padTop = 0.16;
  const padBottom = 0.12;
  const totalKm = profile[profile.length - 1].d || 1;
  const elevations = profile.map((point) => point.e);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const eleRange = Math.max(maxEle - minEle, 1);

  const xFrac = (d) => d / totalKm;
  const yFrac = (e) => padTop + (1 - (e - minEle) / eleRange) * (1 - padTop - padBottom);

  const linePoints = profile.map((point) => `${(xFrac(point.d) * W).toFixed(1)},${(yFrac(point.e) * H).toFixed(1)}`);
  const areaPath = `M0,${H} L${linePoints.join(' L')} L${W},${H} Z`;
  const linePath = `M${linePoints.join(' L')}`;

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const gx = (W * i) / 4;
    return `<line class="stage-grid" x1="${gx.toFixed(1)}" y1="0" x2="${gx.toFixed(1)}" y2="${H}"></line>`;
  }).join('');

  const peak = profile.reduce((best, point) => (point.e > best.e ? point : best), profile[0]);
  const peakLeft = Math.min(Math.max(xFrac(peak.d) * 100, 12), 88);
  const peakTop = yFrac(peak.e) * 100;

  return `
    <div class="stage-plot">
      <svg class="stage-profile" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Perfil altimétrico">
        <defs>
          <linearGradient id="stage-fill-${Math.round(minEle)}-${Math.round(maxEle)}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--stage-fill-top)"></stop>
            <stop offset="100%" stop-color="var(--stage-fill-bottom)"></stop>
          </linearGradient>
        </defs>
        ${gridLines}
        <path class="stage-area" d="${areaPath}" fill="url(#stage-fill-${Math.round(minEle)}-${Math.round(maxEle)})"></path>
        <path class="stage-line" d="${linePath}"></path>
      </svg>
      <span class="stage-peak" style="left:${peakLeft.toFixed(1)}%;top:${peakTop.toFixed(1)}%">
        <i class="stage-peak-dot"></i>${Math.round(peak.e)} m
      </span>
    </div>
    <div class="stage-axis">
      <span>Km 0</span>
      <span>${Math.round(totalKm)} km</span>
    </div>
  `;
}

function renderStages(routes) {
  if (!els.stagesView) return;

  if (!routes.length) {
    els.stagesView.innerHTML = '<p class="stages-empty">No hay rutas para los filtros seleccionados.</p>';
    return;
  }

  els.stagesView.innerHTML = routes.map((route, index) => {
    const { origin, finish } = stageEndpoints(route);
    const profile = route.elevationProfile;
    const hasProfile = Array.isArray(profile) && profile.length > 1;
    const startEle = hasProfile ? `${Math.round(profile[0].e)} m` : '';
    const endEle = hasProfile ? `${Math.round(profile[profile.length - 1].e)} m` : '';
    const caption = finish
      ? `${origin} / ${finish} (${route.distanceText})`
      : `${route.route} (${route.distanceText})`;

    return `
      <article class="stage-card">
        <div class="stage-head">
          <span class="stage-index">Ruta ${index + 1}</span>
          <span class="stage-head-date">${stageDateLabel(route)}</span>
        </div>
        <div class="stage-endpoints">
          <div class="stage-ep">
            <span class="stage-ep-name"><i class="stage-pin start"></i>${origin}</span>
            <span class="stage-ep-ele">${startEle}</span>
          </div>
          <div class="stage-ep end">
            <span class="stage-ep-name">${finish || route.route}<i class="stage-pin finish"></i></span>
            <span class="stage-ep-ele">${finish ? endEle : ''}</span>
          </div>
        </div>

        ${buildProfileBlock(profile)}

        <div class="stage-caption">${caption}</div>

        <div class="stage-footer">
          <div class="stage-tags">
            <span class="profile-chip profile-${route.profileKey}">${route.profile}</span>
            <span class="stage-tag">D+ ${route.elevationText}</span>
            <span class="stage-tag">${route.timeText}</span>
          </div>
          <div class="stage-actions">
            ${buildStravaButtons(route)}
            ${buildActionButton(route.mapsUrl, 'Maps')}
            ${buildActionButton(route.wazeUrl, 'Waze')}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function setView(view) {
  state.view = view;
  const isStages = view === 'stages';

  els.viewTabs.forEach((tab) => {
    const active = tab.dataset.view === view;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  if (els.stagesView) els.stagesView.hidden = !isStages;
  if (els.tableView) els.tableView.hidden = isStages;
  document.body.classList.toggle('stages-active', isStages);
}

function renderFilters(routes) {
  const unique = (values) => ['Todos', ...Array.from(new Set(values)).filter(Boolean)];
  const orderedMonths = (values) => {
    const presentMonths = new Set(Array.from(new Set(values)).filter(Boolean));
    return ['Todos', ...MONTH_ORDER.filter((month) => presentMonths.has(month)), ...Array.from(presentMonths).filter((month) => !MONTH_ORDER.includes(month))];
  };

  const options = {
    month: orderedMonths(routes.map((route) => route.monthName)),
    start: unique(routes.map((route) => route.start)),
    profile: unique(routes.map((route) => route.profile)),
    type: unique(routes.map((route) => route.type))
  };

  Object.entries(options).forEach(([key, values]) => {
    const select = els[key];
    const previous = select.dataset.value || 'Todos';
    select.innerHTML = values.map((value) => `<option value="${value === 'Todos' ? '' : value}">${value}</option>`).join('');
    select.value = previous === 'Todos' ? '' : previous;
  });
}

function applyFilters() {
  const filters = {
    month: els.month.value,
    start: els.start.value,
    profile: els.profile.value,
    type: els.type.value,
    search: els.search.value.trim().toLowerCase()
  };

  Object.entries({
    month: els.month,
    start: els.start,
    profile: els.profile,
    type: els.type
  }).forEach(([key, element]) => {
    element.dataset.value = element.value || 'Todos';
  });

  state.filteredRoutes = state.routes.filter((route) => routeMatches(route, filters));
  renderMetrics(state.filteredRoutes);
  renderTable(state.filteredRoutes);
  renderCards(state.filteredRoutes);
  renderStages(state.filteredRoutes);
  els.status.textContent = buildLoadStatusText(state.filteredRoutes.length);
}

async function fetchSession() {
  const res = await fetch('/api/session', { credentials: 'same-origin' });
  if (!res.ok) {
    window.location.href = '/login.html';
    return;
  }
  const data = await res.json();
  state.user = data.user;
  const firstName = firstNameFromFullName(state.user.name);
  els.welcome.textContent = `Hola, ${firstName}`;
  els.refresh.hidden = state.user.role !== 'admin';
  if (els.adminPanel) els.adminPanel.hidden = state.user.role !== 'admin';
}

async function fetchCalendar() {
  els.status.textContent = 'Cargando calendario...';
  const res = await fetch('/api/calendar', { credentials: 'same-origin' });
  if (res.status === 401) {
    window.location.href = '/login.html';
    return;
  }
  const data = await res.json();
  state.routes = data.routes;
  state.report = data.report;
  state.loadedAt = data.loadedAt;
  state.sourceExcel = data.sourceExcel || '';
  renderYearToDateSummary(state.routes);
  renderFilters(state.routes);
  applyDefaultMonthFilter();
  applyFilters();
  if (state.user?.role === 'admin') {
    await fetchAccessSummary();
  }
}

async function fetchAccessSummary() {
  const res = await fetch('/api/access-summary', { credentials: 'same-origin' });
  if (!res.ok) {
    renderAccessSummary(null);
    return;
  }
  const data = await res.json();
  state.accessSummary = data;
  renderAccessSummary(state.accessSummary);
}

async function refreshCalendar() {
  els.status.textContent = 'Actualizando desde Excel y GPX...';
  try {
    const res = await fetch('/api/refresh', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (!res.ok) {
      els.status.textContent = data.error || 'No fue posible refrescar.';
      return;
    }
    state.refreshNotice = buildRefreshNotice(data.publish);
    await fetchCalendar();
  } catch (error) {
    els.status.textContent = 'No fue posible conectar con el servidor para actualizar el calendario.';
  }
}

function buildRefreshNotice(publish) {
  if (!publish) return 'Calendario actualizado localmente.';
  if (publish.published) {
    return `Calendario actualizado y publicado (${publish.commit}). Render puede tardar unos segundos en reflejarlo.`;
  }
  if (publish.reason) {
    return `Calendario actualizado. ${publish.reason}`;
  }
  return 'Calendario actualizado localmente.';
}

async function logout() {
  await fetch('/api/logout', {
    method: 'POST',
    credentials: 'same-origin'
  });
  window.location.href = '/login.html';
}

Object.values({
  month: els.month,
  start: els.start,
  profile: els.profile,
  type: els.type
}).forEach((element) => element.addEventListener('change', applyFilters));

els.search.addEventListener('input', applyFilters);
els.refresh.addEventListener('click', refreshCalendar);
els.logout.addEventListener('click', logout);
els.viewTabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));

(async function init() {
  await fetchSession();
  await fetchCalendar();
})();
