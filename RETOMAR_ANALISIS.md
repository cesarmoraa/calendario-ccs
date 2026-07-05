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
