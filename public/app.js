const state = {
  routes: [],
  filteredRoutes: [],
  user: null,
  report: null,
  loadedAt: null
};

const els = {
  welcome: document.getElementById('welcome'),
  status: document.getElementById('load-status'),
  metrics: document.getElementById('metrics-grid'),
  body: document.getElementById('calendar-body'),
  mobile: document.getElementById('mobile-cards'),
  refresh: document.getElementById('refresh-btn'),
  logout: document.getElementById('logout-btn'),
  month: document.getElementById('filter-month'),
  start: document.getElementById('filter-start'),
  profile: document.getElementById('filter-profile'),
  type: document.getElementById('filter-type'),
  routeState: document.getElementById('filter-state'),
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

function monthNameFromDate(dateText) {
  const [day, month] = String(dateText || '').split('/');
  const monthIndex = Number.parseInt(month, 10);
  const names = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return names[monthIndex] || 'Sin mes';
}

function routeMatches(route, filters) {
  const haystack = `${route.route} ${route.start}`.toLowerCase();
  if (filters.month && route.monthName !== filters.month) return false;
  if (filters.start && route.start !== filters.start) return false;
  if (filters.profile && route.profile !== filters.profile) return false;
  if (filters.type && route.type !== filters.type) return false;
  if (filters.state && route.status !== filters.state) return false;
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

  const options = {
    month: unique(routes.map((route) => route.monthName)),
    start: unique(routes.map((route) => route.start)),
    profile: unique(routes.map((route) => route.profile)),
    type: unique(routes.map((route) => route.type)),
    routeState: unique(routes.map((route) => route.status))
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
    state: els.routeState.value,
    search: els.search.value.trim().toLowerCase()
  };

  Object.entries({
    month: els.month,
    start: els.start,
    profile: els.profile,
    type: els.type,
    routeState: els.routeState
  }).forEach(([key, element]) => {
    element.dataset.value = element.value || 'Todos';
  });

  state.filteredRoutes = state.routes.filter((route) => routeMatches(route, filters));
  renderMetrics(state.filteredRoutes);
  renderTable(state.filteredRoutes);
  renderCards(state.filteredRoutes);
  els.status.textContent = `Mostrando ${state.filteredRoutes.length} rutas · actualizado ${state.loadedAt || 'recién'}`;
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
  renderFilters(state.routes);
  applyFilters();
}

async function refreshCalendar() {
  els.status.textContent = 'Actualizando desde Excel y GPX...';
  const res = await fetch('/api/refresh', {
    method: 'POST',
    credentials: 'same-origin'
  });
  const data = await res.json();
  if (!res.ok) {
    els.status.textContent = data.error || 'No fue posible refrescar.';
    return;
  }
  await fetchCalendar();
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
  type: els.type,
  routeState: els.routeState
}).forEach((element) => element.addEventListener('change', applyFilters));

els.search.addEventListener('input', applyFilters);
els.refresh.addEventListener('click', refreshCalendar);
els.logout.addEventListener('click', logout);

(async function init() {
  await fetchSession();
  await fetchCalendar();
})();
