const state = {
  routes: [],
  filteredRoutes: [],
  user: null,
  report: null,
  loadedAt: null,
  accessSummary: null,
  sourceExcel: '',
  refreshNotice: ''
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

function buildActionButton(link, label) {
  const disabled = !link || link === 'Pendiente' || link === 'Por definir';
  return `<a class="action-btn ${disabled ? 'is-disabled' : ''}" ${disabled ? '' : `href="${link}" target="_blank" rel="noopener noreferrer"`}>${label}</a>`;
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
      <td><span class="status-pill status-${route.statusKey}">${route.status}</span></td>
      <td>
        <div class="action-stack">
          ${buildActionButton(route.stravaUrl, 'Strava')}
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
        <span class="status-pill status-${route.statusKey}">${route.status}</span>
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
        ${buildActionButton(route.stravaUrl, 'Strava')}
        ${buildActionButton(route.mapsUrl, 'Maps')}
        ${buildActionButton(route.wazeUrl, 'Waze')}
      </div>
    </article>
  `).join('');
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

(async function init() {
  await fetchSession();
  await fetchCalendar();
})();
