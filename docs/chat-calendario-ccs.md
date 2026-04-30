# Chat Calendario CCS

## Propósito
Bitácora viva del proyecto `Calendario CCS 2026`.

Este archivo resume:
- prompt base del proyecto
- arquitectura acordada
- mejoras implementadas
- estado actual
- errores y aprendizajes
- patrones reutilizables para otros proyectos

Cuando se pida `actualiza el .md`, la regla será:
- no reescribir la historia
- agregar una nueva entrada al historial
- dejar explícitos cambios, problemas, decisiones y aprendizajes

---

## Prompt Inicial
Objetivo original:

Construir una mini app privada del Calendario de Rutas CCS 2026 que:
- lea datos desde un Excel maestro
- lea archivos GPX desde carpeta
- tenga login de usuarios
- registre accesos
- muestre calendario en PC y móvil
- permita actualizar el calendario sin rehacer el HTML

Estructura base pedida:
- `/calendario.xlsx`
- `/gpx/`
- `/server.js`
- `/public/login.html`
- `/public/index.html`
- `/public/app.js`
- `/public/styles.css`
- `/data/rutas_procesadas.json`
- `/data/accesos.json`
- `/data/reporte_validacion.txt`

Reglas relevantes del negocio:
- Excel como fuente de verdad
- usuarios socios derivados del RUT por últimos 4 dígitos
- cálculo de distancia y altimetría desde archivos de ruta
- calendario editable sin rehacer el HTML

---

## Arquitectura Actual
### Backend
- `server.js`
- servidor HTTP nativo en Node.js
- lectura de Excel sin framework web pesado
- procesamiento de rutas desde `GPX/` y `TCX/`
- sesiones por cookie `ccs_session`
- endpoints JSON para login, calendario, refresh y visibilidad de accesos

### Frontend
- `public/login.html`
- `public/index.html`
- `public/app.js`
- `public/styles.css`

### Datos generados
- `data/rutas_procesadas.json`
- `data/accesos.json`
- `data/reporte_validacion.txt`

---

## Estado Actual
### Funcional
- login para socios por PIN derivado del RUT
- admin maestro independiente del Excel
- usuarios `view` de solo lectura
- calendario responsive para desktop y móvil
- filtros por mes, inicio, perfil, tipo y buscador por nombre
- refresh del calendario solo para admin
- lectura y reprocesamiento desde Excel
- soporte prioritario para `TCX` y respaldo en `GPX`
- cálculo de distancia, D+ y tiempo aproximado
- links a Strava, Maps y Waze
- registro de accesos
- panel admin con resumen de ingresos exitosos

### Visual
- diseño deportivo oscuro inspirado en CCS
- toolbar compacta
- métricas más livianas y simétricas
- tabla desktop optimizada para una sola línea por ruta
- tarjetas móviles claras y utilizables

### Seguridad / roles
- `admin`: acceso completo
- `member`: acceso normal al calendario
- `view`: solo lectura

---

## Credenciales y Roles
### Admin
- usuario: `admin`
- password: configurada en backend
- rol: `admin`

### View
- `Visita`
- `Solange`
- ambos con rol `view`

Nota:
- este documento evita consolidar passwords sensibles como fuente documental permanente
- las credenciales reales deben revisarse en `server.js` si hace falta mantenimiento

---

## Historial de Versiones
### Fase 1. Base del sistema
- mini app inicial con Node.js + HTML/CSS/JS
- lectura de Excel
- procesamiento de GPX
- calendario responsive
- endpoints principales

### Fase 2. Login y control de acceso
- socios autenticados por últimos 4 dígitos del RUT
- admin maestro independiente del Excel
- backend validando admin primero y luego socios
- acceso admin operativo incluso si falla Excel al iniciar

Commits relevantes:
- `a0c6274` mejora login socios y admin
- `75e955c` ajusta visibilidad admin y tabla desktop

### Fase 3. Ajustes de visibilidad y copy
- botón `Actualizar calendario` oculto para socios
- saludo usando solo primer nombre
- mensajes de login más sobrios
- placeholders del login limpiados
- errores de login más neutros, sin filtrar lógica interna

Commits relevantes:
- `b7fe99c` ocultar actualizar calendario a socios
- `f8021c6` ajusta texto y placeholders del login
- `4a7a612` simplifica mensaje de acceso en login
- `ac3464a` simplifica errores de acceso

### Fase 4. Datos de rutas mejorados con TCX
- detección de que `TCX` es mejor fuente que `GPX` para este caso
- uso de `TCX` como fuente principal para:
  - distancia
  - tiempo total
  - coordenadas
  - altimetría calculada
- `GPX` queda como respaldo

Commits relevantes:
- `0938da0` usa tcx para tiempo y distancia
- `52ec217` agrega archivos tcx de rutas
- `4ecb6c4` renombra etiqueta tiempo aprox

### Fase 5. Refinamiento visual
- restauración completa del estilo cuando se dañó el CSS
- tabla desktop más limpia
- acciones en una sola línea
- métricas compactadas
- filtros reordenados

Commits relevantes:
- `7536699` compacta metricas del panel
- `e85d7a2` ordena meses del filtro
- `e9b9050` reordena filtros del toolbar

### Fase 6. UX dinámica del calendario
- subtítulo dinámico con acumulado del año en km y altimetría
- selección automática del mes en curso al primer ingreso
- rutas mostrando por defecto el mes actual

Commits relevantes:
- `4fb209c` actualiza resumen anual del encabezado
- `0d8c184` selecciona mes actual por defecto
- `e6f6e51` fuerza mes actual al primer ingreso

### Fase 7. Accesos y visibilidad admin
- creación de usuarios `view`
- blindaje backend de endpoints solo admin
- panel admin con resumen de ingresos exitosos
- visibilidad de:
  - cuentas que ingresaron
  - cantidad de ingresos
  - último acceso
  - socios que nunca entraron

Commits relevantes:
- `222ce14` agrega usuario visita de solo lectura
- `901568a` agrega usuario view solange
- `de3fe8c` agrega panel admin de accesos

### Fase 8. Ajustes de credenciales admin
Commits relevantes:
- `9c71f9a` actualiza password del admin

### Fase 9. Sincronización local hacia producción
- `Actualizar calendario` en `localhost` no solo refresca datos
- también debe:
  - releer Excel
  - releer GPX/TCX
  - regenerar JSON
  - detectar cambios fuente
  - hacer `git add`, `commit` y `push` automáticamente si hay cambios publicables
- la publicación automática se limita al flujo local para que Render pueda tomar los cambios desde GitHub
- soporte para usar `GPX` y `TCX` en una sola carpeta, preferentemente `GPX/`

Commits relevantes:
- `87bf7af` automatiza publicacion desde refresh local
- `ee1f5b8` permite gpx y tcx en una sola carpeta

---

## Errores / Fricciones Reales del Proyecto
### 1. CSS roto por parche parcial
Problema:
- se perdió el estilo en producción porque se publicó un `styles.css` recortado

Aprendizaje:
- cuando se ajusta CSS con asistencia externa, validar siempre que el archivo siga siendo una hoja completa y no un parche parcial

Aplicación futura:
- antes de deployar, revisar clases efectivamente usadas por el HTML y confirmar que siguen definidas

### 2. Diferencia entre `file://` y app real servida
Problema:
- ciertas pruebas parecían fallar al abrir `login.html` directo desde disco

Aprendizaje:
- varios comportamientos dependen del backend y de la sesión, por lo que deben probarse en `http://localhost:3000` o en el deploy real

Aplicación futura:
- evitar validar flujos dinámicos desde `file://`

### 3. GPX insuficiente para tiempo
Problema:
- con `GPX` se podían calcular km y D+, pero no el tiempo aproximado como el mostrado por Strava

Aprendizaje:
- para rutas ciclistas exportadas desde plataformas, `TCX` suele ser mejor que `GPX` cuando se necesita tiempo y distancia más fieles

Aplicación futura:
- en proyectos similares, diseñar desde el inicio una estrategia `TCX-first / GPX-fallback`

### 4. Render y persistencia limitada
Problema:
- los accesos quedan en archivo local del servidor, lo que puede no ser persistente ante ciertos reinicios o redeploys

Aprendizaje:
- si el registro histórico importa realmente, no basta un JSON local en hosting efímero

Aplicación futura:
- usar SQLite o una base persistente para auditoría real

### 5. Errores de login demasiado explícitos
Problema:
- mensajes como `Debes ingresar 4 dígitos iguales...` revelaban demasiado sobre la mecánica de acceso

Aprendizaje:
- mensajes de autenticación deben ser neutros para no exponer reglas internas

Aplicación futura:
- preferir errores genéricos en login y dejar el detalle solo para logs internos

---

## Aprendizajes Reutilizables para Otros Proyectos
### Patrón 1. Roles simples pero efectivos
Usar tres capas claras:
- `admin`
- `member`
- `view`

Valor:
- simplifica permisos sin sobreingeniería

### Patrón 2. Fuente de verdad + caché procesada
Modelo recomendado:
- Excel como fuente editable
- JSON procesado para servir rápido al frontend

Valor:
- mantiene edición simple para el dueño del contenido y vista rápida para usuarios

### Patrón 3. Frontend estático con backend pequeño
Stack:
- HTML + CSS + JS plano
- Node HTTP simple

Valor:
- rápido de mantener
- fácil de desplegar
- ideal para herramientas privadas con poca complejidad estructural

### Patrón 4. Panel admin dentro del mismo producto
En vez de una app aparte:
- mostrar a admin herramientas internas dentro de la misma interfaz

Valor:
- menor costo de mantenimiento
- mejor adopción

### Patrón 5. Historial vivo de decisiones
Mantener un `.md` de chat/proyecto con:
- cambios
- errores
- aprendizajes
- decisiones

Valor:
- acelera continuidad entre sesiones
- permite reutilizar soluciones en nuevos proyectos

---

## Próximas Mejoras Recomendadas
- persistencia real del historial de accesos con SQLite
- exportación del resumen de accesos
- vista admin con filtro por rango de fechas
- ranking de uso por socio
- detección de último acceso por dispositivo
- documentación de deploy y reinicio local

---

## Protocolo de Actualización del Documento
Cuando se pida `actualiza el .md`, hacer esto:

1. agregar nueva entrada al `Historial de Versiones`
2. actualizar `Estado Actual` si cambió algo funcional o visual
3. agregar errores reales observados si existieron
4. registrar aprendizajes reutilizables si el cambio dejó una lección clara
5. no borrar historia previa; solo corregir si hay un dato objetivamente errado

---

## Referencia Rápida
Archivo principal de esta bitácora:

[docs/chat-calendario-ccs.md](/Users/cesarmora/Library/Mobile%20Documents/com~apple~CloudDocs/Personal/Ciclismo/Calendario/docs/chat-calendario-ccs.md)
