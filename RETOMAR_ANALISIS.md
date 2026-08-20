# RETOMAR_ANALISIS

## Propósito
Archivo de continuidad operativa del proyecto `Calendario CCS`.

Debe servir para retomar trabajo sin perder contexto sobre:
- cambios recientes
- publicaciones realizadas
- errores reales encontrados
- soluciones aplicadas
- reglas de operación local -> GitHub -> Render
- estado actual del repositorio

Regla permanente:
- actualizar este archivo cada vez que haya:
  - cambio importante de lógica
  - cambio importante de diseño
  - cambio de credenciales o roles
  - publicación relevante
  - bug real encontrado
  - corrección de flujo local / Git / Render

---

## Estado Base del Proyecto
- proyecto: `Calendario CCS 2026`
- backend: `server.js`
- frontend:
  - `public/login.html`
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
- datos generados:
  - `data/rutas_procesadas.json`
  - `data/accesos.json`
  - `data/reporte_validacion.txt`
- bitácora larga:
  - `docs/chat-calendario-ccs.md`
- documento reutilizable para otros proyectos:
  - `docs/sabiduria-html-render.md`

---

## Reglas Operativas Clave
### 1. Fuente de verdad
- el calendario depende del Excel maestro
- actualmente:
  - `calendario.xlsx` apunta a `Template_Calendario_CCS_GPX.xlsx`

### 2. Rutas
- la lógica prioriza `TCX`
- `GPX` queda como respaldo
- se soporta trabajar con `GPX` y `TCX` en una sola carpeta
- carpeta preferida para operación:
  - `GPX/`

### 3. Acceso
- existe login de socios por PIN derivado del RUT
- existe admin maestro independiente del Excel
- existen usuarios `view`
- la validación de login ocurre en backend

### 4. Pruebas reales
- no validar flujos dinámicos desde `file://`
- probar siempre desde:
  - `http://localhost:3000`
  - y/o producción en Render

### 5. Publicación
- si se trabaja en local con cambios en Excel / GPX / TCX:
  - guardar cambios
  - entrar a `localhost`
  - usar `Actualizar calendario` como admin
- en `localhost`, el botón debe:
  - releer Excel
  - releer GPX / TCX
  - regenerar datos
  - detectar cambios fuente
  - hacer commit automático solo de fuentes publicables
  - hacer push a GitHub
  - dejar a Render tomar el deploy

### 6. Estados esperados del banner
- publicación exitosa:
  - muestra hash de commit y aviso de espera de Render
- sin cambios fuente:
  - muestra que no había cambios de Excel, GPX o TCX pendientes para publicar
- error real:
  - debe reportar el problema concreto

---

## Historial Resumido de Cambios Importantes
### Base funcional
- mini app privada con Node + HTML/CSS/JS
- lectura de Excel
- procesamiento de rutas
- calendario responsive

### Seguridad / acceso
- admin maestro implementado
- usuarios `view` implementados
- errores de login neutralizados
- login rerelee Excel antes de validar usuarios nuevos

### Datos de rutas
- adopción de estrategia `TCX-first / GPX-fallback`
- cálculo de tiempo, distancia y altimetría estabilizado

### Publicación y sincronización
- auto refresh si el Excel o archivos de ruta son más nuevos
- diagnóstico visible de fuente Excel
- publicación automática desde `localhost` al refrescar como admin
- soporte de carpeta única `GPX/` para GPX y TCX

### Visual
- restauración y consolidación del CSS
- métricas compactadas
- ancho desktop aumentado para reducir scroll horizontal
- nueva vista "Etapas" estilo Marca (tabs Tabla / Etapas)
  - `parseGpx` / `parseTcx` ahora devuelven `elevationProfile` (serie downsampleada a ~140 puntos), incluida en `data/rutas_procesadas.json`
  - se regenera en cada arranque (`bootstrap -> refreshData`); en Render se regenera solo al deploy
  - layout compacto en grid de 2 columnas (1 columna en móvil ≤640px)
  - cada tarjeta: cabecera "Ruta N — día, fecha", salida/llegada con altura y pin, perfil altimétrico en SVG (relleno cian de marca), etiqueta de la cima más alta, eje "Km 0 … total" y pie "Origen / Destino (km)"
  - texto del perfil fuera del SVG (evita el estiramiento por `preserveAspectRatio="none"`)
  - 28/34 rutas con perfil (las 6 sin GPX/TCX muestran "Perfil no disponible")
  - LIMITACIÓN: solo se rotula la cima más alta; Marca rotula cimas intermedias, pero no tenemos nombres de puntos intermedios del GPX
  - PUBLICADO en `d9b0905` (código de la función; se dejó fuera ruido local .DS_Store/logs)
- limpieza de UI (18-07-2026):
  - se ELIMINÓ el estado ("Confirmada"/"Por definir") de toda la app: columna de la tabla,
    pastilla de las tarjetas móviles y de las etapas. El usuario lo consideró inútil.
    OJO: `computeRouteStatus` y `statusKey` siguen existiendo en el backend; solo no se pintan.
  - botones de Strava agrupados con título "Link Strava" centrado sobre R/M/C
  - en móvil, el cuadro Link Strava ocupa el ancho y centra sus botones (tarjetas y etapas)
  - encabezado de cada etapa muestra SOLO el Inicio (columna D). Antes mostraba origen -> destino,
    pero en rutas circulares/largas el nombre completo se solapaba. El nombre completo ya está
    en el pie de la tarjeta junto a los km.

---

## Publicaciones Relevantes
- `978740a` publica cambios de rutas y mejora refresh
- `0ef81a7` relee excel antes del login
- `9a1075a` actualiza excel con usuarios corregidos
- `87bf7af` automatiza publicacion desde refresh local
- `ee1f5b8` permite gpx y tcx en una sola carpeta
- `1a14f52` publica cambios de calendario 2026-04-30 13:34
- `92b3797` corrige auto publish del refresh local
- `5020dc6` aclara estado del refresh local
- `1597c1b` publica cambios de calendario 2026-04-30 13:43
- `c22677c` ensancha layout desktop del calendario
- `70a11dc` actualiza bitacora del calendario
- `3edeb9e` agrega sabiduria html render
- `d9b0905` agrega vista Etapas estilo Marca con perfil altimetrico
- `5bb40b9` corrige panel de accesos que siempre mostraba 0
- `de1f725` actualiza calendario 2026 desde Excel (33 -> 67 rutas)
- `081e337` agrega keep-alive con GitHub Actions (resultó NO confiable, ver sección cold-start)
- `66588b4` agrega 3 links de Strava por ruta (niveles R/M/C)
- `af2f5f0` titulo "Link Strava" sobre botones R/M/C y quita columna Estado
- `d2e9818` centra el titulo "Link Strava"
- `f6f24a9` movil: quita pastilla de estado y centra el cuadro Link Strava
- `7f54a43` etapas: encabezado muestra solo el Inicio (evita solape en rutas circulares)
- `9e12155` etapas movil: centra el cuadro Link Strava

---

## Errores Reales y Soluciones
### 1. CSS roto por parche parcial
Problema:
- se publicó una hoja de estilos recortada

Solución:
- reconstrucción completa de `public/styles.css`
- verificar clases realmente usadas por HTML

### 2. Diferencia entre local y web pública
Problema:
- local mostraba cambios pero Render no

Causa:
- cambios del Excel o rutas no estaban publicados en GitHub

Solución:
- publicar fuentes reales
- reforzar flujo local con auto-publish

### 3. Usuarios nuevos no podían entrar
Problema:
- el login no veía de inmediato usuarios nuevos del Excel

Solución:
- hacer `ensureFreshData()` antes de validar `/api/login`

### 4. Auto-publish bloqueado por stage ajeno
Problema:
- el botón local no publicaba si había archivos staged no relacionados

Solución:
- limitar commit automático a fuentes publicables

### 5. Pathspec incorrecto por case-insensitive macOS
Problema:
- `fs.existsSync('gpx')` devolvía true en macOS aunque la carpeta real fuera `GPX`
- Git luego fallaba con pathspec inválido

Solución:
- resolver nombres reales visibles en raíz del proyecto

### 6. Mensaje de refresh ambiguo
Problema:
- el banner decía “No fue posible preparar archivos fuente...” cuando en realidad no había cambios

Solución:
- separar:
  - no-op legítimo
  - publicación exitosa
  - error real

### 7. TCX presentes pero no usados en producción
Problema:
- el HTML publicado seguía mostrando `Tiempo Aprox = Por definir` aunque los `.tcx` existían en `GPX/`

Causa:
- el resolvedor de carpetas seguía priorizando `TCX/` por nombre, aunque esa carpeta estuviera vacía
- algunos nombres de archivos duplicados con sufijo `(1)` tampoco empataban limpio

Solución:
- resolver carpeta por contenido real (`.gpx` / `.tcx`) y no solo por existencia del nombre
- relajar el matching de nombres para tolerar duplicados tipo `(1)`

---

### 8. Panel "Quién ha ingresado" siempre en 0
Problema:
- el panel admin de accesos mostraba "0 cuentas" pese a que sí había logins

Causa:
- `registerAccess` guarda el campo como `resultado` (español)
- `summarizeAccessLog` filtraba por `entry.result` (inglés) → nunca empataba

Solución:
- filtrar por `(entry.resultado || entry.result) === "ok"` (tolera registros viejos y nuevos)
- verificado contra `data/accesos.json`: 23/24 registros ahora cuentan como ingreso exitoso

---

## Estado Actual a Revisar Antes de Tocar Algo
Revisar siempre:
1. si el Excel fuente fue realmente guardado
2. si los archivos de ruta están en `GPX/`
3. si `localhost` está corriendo
4. si el banner local muestra:
   - publicado
   - sin cambios
   - error real
5. si producción ya tomó el último commit

---

## Estado Git Observado al Crear Este Archivo
Contexto observado:
- branch: `main`
- había cambios locales en archivos generados:
  - `data/accesos.json`
  - `data/reporte_validacion.txt`
  - `data/rutas_procesadas.json`
- también archivos de sistema:
  - `.DS_Store`
  - `outputs/.DS_Store`
  - `~$Template_Calendario_CCS_GPX.xlsx` borrado

Regla:
- no confundir cambios generados/locales con cambios fuente reales del calendario

---

## Qué Hacer al Retomar
### Si el usuario dice “no se publicó”
1. revisar `git diff` de:
   - Excel
   - `GPX/`
   - `TCX/`
2. revisar respuesta real de `POST /api/refresh` en localhost
3. revisar último commit creado por auto-publish
4. revisar si producción ya refleja ese commit

### Si el usuario dice “no cambia el calendario”
1. confirmar que el cambio fue guardado en el Excel real
2. confirmar que el JSON local se regeneró
3. confirmar que el refresh local publicó
4. confirmar que Render ya tomó el deploy

### Si el usuario dice “no puedo entrar”
1. revisar login en localhost
2. confirmar carga de usuarios desde Excel
3. confirmar que el cambio de usuarios fue publicado
4. confirmar producción

---

## Actualización de Calendario 18-07-2026
Fuente: Excel maestro actualizado (19985 → 22327 bytes) + ~10 pares GPX/TCX nuevos.
- rutas: 33 → 67 (41 nuevas, 7 renombradas/reorganizadas)
- ~19 rutas existentes recibieron su Tiempo (antes "Por definir") por los TCX nuevos
- usuarios cargados: 97 (0 duplicados por PIN, 0 filas ignoradas)
- calendario completo hasta diciembre 2026
- FIX: la ruta 24/10 "Kross - Pangue - Casa Blanca - Cuesta Zapata - Kross" pedía un GPX
  con nombre distinto al del archivo subido ("...Geronimo - cuesta zapata"). Se renombró
  el par .gpx/.tcx al nombre del Excel → ahora resuelve (106.9 km, 3:57:50, 1230 m D+)
- quedan 14 rutas "Por definir" por diseño: viajes/eventos sin ruta única
  (Viaje Colchagua, Viaje al Norte, Criterium Ruta de las Estrellas, Giro al Sur, Paseo Santo Domingo)

---

## Actualización de Calendario 19-07-2026 (b) — links C + fix RUT
Excel editado (24115 -> 24956 bytes), sin nuevos GPX. Rutas 63, usuarios 97 (mismos conteos, solo edición).
- se pegaron los links propios de C (Capuccino) en 18 rutas -> C ya no cae a R en esas
- M sigue sin link propio (= R por ahora)
- usuario: "Rodrigo Martinez" corrige su RUT 10.652.669.9 -> 10.652.669-9 (punto -> guion);
  como el PIN se deriva del RUT, esto arregla su login
- validación: GPX no encontrados 0, 0 filas ignoradas, 0 PIN duplicados

### Nota de entorno (19-07-2026): permiso de macOS a iCloud
En una sesión, el proceso de Claude Code PERDIÓ el acceso a la carpeta de iCloud
(`~/Library/Mobile Documents/com~apple~CloudDocs/...`) a mitad de camino: `ls`/`git` daban
"Operation not permitted" (fallaba el recorrido de carpetas y hasta leer archivos), mientras
que HOME funcionaba. Causa: TCC de macOS. Solución que funcionó: activar "Acceso a disco completo"
para la app de Claude Code en Ajustes > Privacidad y seguridad, y **reiniciar la app (⌘Q)** —
un proceso ya abierto no toma el permiso. Alternativa de raíz: mover el repo fuera de iCloud.

## Actualización de Calendario 19-07-2026
Excel maestro editado (24443 -> 24115 bytes), sin nuevos GPX/TCX. Rutas: 67 -> 63.
- 2 nuevas: "Lo Prado - Cuesta Ibacache (Bis)" (05/09), "Giro Zapallar" (10/10, Por definir)
- 6 quitadas: "Enjoy Los Andes a Zapallar", el bloque de 4 "Criterium Ruta de las Estrellas"
  (09-13/10) y "Mc Chamisero - Til Til - Cumbre La Dormida (Bis)" (10/10)
- sin cambios de métricas en las demás; GPX no encontrados: 0; 97 usuarios
- links M/C siguen = R (aún no se han pegado los reales)

---

## Observaciones de Uso (al 04-07-2026)
Análisis de `data/accesos.json` (24 registros, 23 exitosos):
- 21 ingresos son de la cuenta admin ("Administrador CCS")
- solo 1 socio ha entrado: "Fabian Mercado" (member), 2 veces el 30-04-2026 durante el lanzamiento
- ningún socio ha entrado después del 30-04-2026 (mayo–junio solo admin)
- conclusión: la app la ha usado casi solo el admin; falta difusión a los socios

---

## Cold-start de Render / posible migración a Vercel (18-07-2026)
Problema: el plan free de Render duerme el servicio tras ~15 min sin visitas; el primer visitante
espera 30-50s ("SERVICE WAKING UP"). Molesta mucho al usuario.

Intentos:
1. Keep-alive con GitHub Actions (`.github/workflows/keepalive.yml`, cron */10) -> **NO FUNCIONÓ**.
   En 1h20 no disparó ni un run programado (solo los manuales). GitHub estrangula los cron de
   intervalo corto; no es confiable como keep-alive. Se dejó el workflow pero no hay que contar con él.
2. **UptimeRobot** (monitor HTTP cada 5 min a https://calendario-ccs.onrender.com/) -> configurado
   el 18-07-2026 con la cuenta de GitHub del usuario. ESTADO: funcionando.
   - monitor "calendario-ccs.onrender.com", HTTP/S, intervalo 5 min
   - Current status: Up · 100% last 24h · 0 incidentes · respuesta ~295ms
   - verificado también por curl: HTTP 200 en ~0.2s
   - el rojo/0% inicial fue solo el arranque (el primer chequeo pilló el servicio dormido)
   - PENDIENTE la prueba real del usuario: no visitar por ~30 min y comprobar que abre instantáneo
   - por qué funciona: Render duerme a los 15 min de silencio; un ping cada 5 min nunca lo permite

Si UptimeRobot no basta -> MIGRAR A VERCEL. Plan acordado:
- **Datos**: mover el parseo de Excel + GPX/TCX al **build** (script que emite JSON estático).
  Elimina el trabajo en runtime y la escritura de `data/rutas_procesadas.json`.
- **Frontend**: `public/` servido estático desde CDN (esto es lo que da la sensación instantánea).
- **Login**: reemplazar las sesiones en memoria (`sessions` Map) por **cookie firmada** (HMAC/JWT con
  secreto en env var). CUIDADO: el listado de socios/PIN debe quedar solo del lado servidor,
  NUNCA como asset público.
- **Log de accesos**: hoy escribe `data/accesos.json` (imposible en Vercel, FS de solo lectura).
  Mover a un store externo (Vercel KV o Upstash, ambos con capa gratis).
- **Auto-publish por git**: se elimina (ya hoy solo funciona desde localhost; se publica con git push).
- Endpoints como funciones serverless: `api/login`, `api/session`, `api/logout`, `api/calendar`,
  `api/access-summary`.
- Esfuerzo estimado: varias horas; la parte delicada es el login.

---

## Pendientes / Ideas
- niveles de ruta R/M/C (Ristretto/Macchiato/Capuccino):
  - FASE 1 (HECHA Y PUBLICADA): 3 columnas R/M/C (E/F/G) en el Excel = 3 links de Strava por ruta.
    Backend: extractStravaLink lee R/M/C (fallback R -> "Link Strava"); M y C caen a R si no tienen
    su propio link. Frontend: buildStravaButtons muestra 3 botones (tabla, tarjetas, etapas).
    OJO: el usuario clonó M/C con fórmula "=E2", que copia el texto "Strava" pero NO el hipervínculo,
    así que M/C no traen URL propia -> hoy caen a R. Para que M/C tengan su ruta, hay que pegar la
    URL real (como hipervínculo o texto https://...) en esas celdas, reemplazando la fórmula.
  - DECISION: solo se necesitan los 3 LINKS. NO se hará métricas por grupo (se descartó carpetas
    GPX/R,M,C y selector). El GPX/TCX único por fila sigue dando inicio/término + métricas.
  - FASE 2 (DESCARTADA salvo pedido futuro): cada grupo con su propio GPX/TCX y métricas. Requeriría
    PROPIA distancia/D+/tiempo/perfil. Diseño acordado con el usuario:
    - carpetas: GPX/R, GPX/M, GPX/C (los archivos actuales se mueven a GPX/R)
    - una sola columna "Archivo GPX" con el nombre base; la app lo resuelve DENTRO de cada carpeta
    - backend: parsear el gpx/tcx de cada carpeta por fila; si M o C no tienen archivo, fallback a R
    - salida sugerida: route.variants = { R:{...}, M:{...}, C:{...} }, top-level = R para compat
    - UI: selector R/M/C que intercambia distancia/D+/tiempo/perfil y el perfil altimétrico
    - se difiere a cuando exista data real de M/C para poder probarlo (evita build a ciegas)
- exportar el log de accesos a Excel/CSV (todos los registros o resumen por cuenta)
- opcional: mostrar en el panel admin los socios que aún NO han entrado
  (ya existe la lógica `neverEntered` en `summarizeAccessLog`, pero la tabla no la pinta)
- opcional: perfil Etapas en amarillo tipo Marca (hoy va en cian de marca CCS)

---

## Regla de Mantenimiento Futuro
Cada vez que haya:
- publicación nueva
- bug encontrado
- cambio de flujo
- cambio importante visual
- ajuste de seguridad o acceso

Agregar aquí:
1. qué cambió
2. qué problema resolvió
3. cómo se verificó
4. qué commit quedó asociado
