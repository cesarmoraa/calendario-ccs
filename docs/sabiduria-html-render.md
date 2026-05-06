# Sabiduría HTML + GitHub + Render

## Propósito
Plantilla maestra para pedirle a Codex que:
- cree o ajuste un proyecto HTML
- lo deje funcional en local
- lo conecte con GitHub si puede
- lo publique en Render si puede
- y, si no puede hacer una parte, entregue el paso a paso exacto para que tú la completes

Este documento resume aprendizajes reales de proyectos publicados, especialmente sobre:
- autenticación por password
- pruebas reales en localhost
- publicación GitHub -> Render
- diseño responsive desktop + móvil
- mensajes de estado claros
- documentación viva del proyecto

---

## Reglas de Oro
### 1. Nunca validar desde `file://`
- todo flujo dinámico debe probarse en `http://localhost:PUERTO`
- login, sesiones, assets, redirects y APIs no deben darse por válidos solo porque el HTML abre

### 2. Backend primero para acceso privado
- no validar passwords solo en frontend
- no dejar credenciales expuestas en placeholders o textos de ayuda
- usar variable de entorno para passwords
- usar cookies `HttpOnly`

### 3. Mensajes de estado claros
- distinguir entre:
  - actualización local exitosa
  - sin cambios para publicar
  - publicación exitosa
  - error real
- evitar mensajes ambiguos

### 4. No romper el HTML existente
- si ya existe una base, reutilizarla
- mejorar con criterio, sin rehacer por defecto

### 5. Siempre pensar en móvil
- el proyecto debe funcionar bien en desktop y celular
- revisar:
  - scroll horizontal
  - tamaños de botones
  - tablas complejas
  - legibilidad
  - espaciados

### 6. Documentar como bitácora viva
- crear `docs/chat-NOMBRE-PROYECTO.md`
- registrar:
  - objetivo
  - arquitectura
  - decisiones
  - errores
  - aprendizajes
  - despliegue

### 7. Git y Render no se deben asumir
- primero revisar:
  - si existe repo Git
  - si existe remote GitHub
  - si Render está conectado
- si Codex puede hacerlo, que lo haga
- si no puede, debe dar el paso exacto

---

## Qué Debe Hacer Codex Por Defecto
Cuando uses esta sabiduría en otro proyecto, Codex debe intentar:

1. Revisar contexto operativo real
- repo Git existente o no
- remote configurado o no
- rama principal
- scripts de inicio
- estructura real del proyecto

2. Implementar o ajustar el código
- HTML
- CSS
- JS
- backend mínimo o existente
- login / sesión / logout

3. Probar de verdad
- levantar localhost
- validar login
- validar assets
- validar responsive
- validar rutas protegidas

4. Publicar si tiene cómo
- commit
- push
- esperar deploy
- verificar producción

5. Si no puede publicar directamente
- explicar el bloqueo exacto
- no responder genérico
- dar el paso a paso mínimo necesario

---

## Qué Debe Entregar Si No Puede Hacer Una Parte
Si Codex no puede:
- crear repo en GitHub
- conectar Render
- tocar configuración de una plataforma externa

Entonces debe entregar:

### GitHub
1. nombre sugerido del repo
2. visibilidad sugerida
3. pasos exactos para crearlo
4. comandos exactos para conectar el remote

### Render
1. tipo de servicio a crear:
   - `Web Service`
   - o `Static Site` si aplica de verdad
2. rama a usar
3. root directory si aplica
4. build command
5. start command
6. variables de entorno necesarias
7. health check si aplica
8. pasos exactos dentro de Render

---

## Prompt Maestro Reutilizable
Copia y pega esto en otro proyecto cuando quieras que Codex haga el trabajo completo.

```text
Actúa como desarrollador full-stack experto en Node.js, HTML, CSS, JavaScript, GitHub y despliegue en Render.

OBJETIVO
Quiero que este proyecto quede funcional en local y publicado en Render, o, si alguna parte no la puedes hacer directamente, que me dejes el paso a paso exacto de lo que debo hacer yo.

FORMA DE TRABAJO
Trabaja como en un proyecto real:
- primero inspecciona el contexto operativo
- luego implementa
- luego prueba en localhost real
- luego publica si puedes
- luego verifica producción si puedes

NO QUIERO RESPUESTAS GENÉRICAS.
Si algo no se puede hacer, quiero saber exactamente cuál es el bloqueo:
- falta repo Git
- falta remote GitHub
- falta conexión con Render
- faltan permisos
- falta variable de entorno
- falta comando de start

CONTEXTO OPERATIVO
Primero revisa y determina:
- si esta carpeta ya es un repo Git
- si tiene remote GitHub configurado
- si la rama principal está lista
- si existe estructura usable para Render
- si puedes hacer commit y push
- si puedes verificar el despliegue

Si ya existe repo:
- úsalo directamente
- haz commit y push si corresponde

Si no existe repo:
- créalo si puedes
- si no puedes crearlo tú directamente en GitHub, deja todo listo localmente y dame el paso a paso exacto para crear el repo y conectarlo

Si Render ya está conectado:
- publica el proyecto
- verifica el deploy

Si Render no está conectado:
- deja el proyecto preparado
- indícame exactamente cómo crear el servicio en Render, campo por campo

DESARROLLO
Si ya existe HTML base:
- reutilízalo
- no rehagas todo desde cero salvo necesidad real

Si hay que crear un dashboard o interfaz:
- debe funcionar bien en desktop y móvil
- no confiar en pruebas desde file://
- probar todo desde localhost

REQUISITOS DE ACCESO
Si el proyecto requiere acceso privado:
- implementar login con password solamente
- sin usuario
- sin email
- validar password en backend
- guardar password en variable de entorno ACCESS_PASSWORD
- crear sesión por cookie HttpOnly
- proteger rutas privadas
- agregar logout
- usar mensajes neutros

RESPONSIVE
El proyecto debe quedar usable en:
- desktop wide
- notebook
- celular

Revisar especialmente:
- tablas
- botones
- formularios
- scroll horizontal
- densidad visual

PUBLICACIÓN
Si puedes publicar:
- haz commit
- haz push
- verifica en producción

Si no puedes publicar:
- no te detengas con una frase general
- entrega el paso exacto para:
  1. crear repo en GitHub
  2. conectar el remote
  3. crear el Web Service en Render
  4. cargar variables de entorno
  5. hacer el primer deploy

DOCUMENTACIÓN
Crea o actualiza:
- docs/chat-NOMBRE-PROYECTO.md

Incluye:
- objetivo
- arquitectura
- decisiones tomadas
- despliegue
- errores encontrados
- aprendizajes reutilizables

AL FINAL
Quiero que me digas con precisión:
1. si encontraste repo Git o no
2. si encontraste remote GitHub o no
3. si encontraste Render conectado o no
4. si pudiste publicar o no
5. cuál fue el bloqueo exacto si algo faltó
6. qué archivos modificaste
7. qué variables de entorno debo crear
8. qué comando de build/start usar
9. cómo cambiar credenciales o configuración después
```

---

## Variante Para Proyectos Con Password Única
Usa esto cuando quieras acceso privado simple:

```text
Implementa acceso privado con una sola password global.

Reglas:
- no pedir usuario
- no pedir email
- solo un campo password
- validar password en backend
- guardar password en ACCESS_PASSWORD
- crear sesión por cookie HttpOnly
- proteger todas las rutas privadas
- agregar logout
- usar mensaje de error neutro

La password debe quedar editable por mí cambiando solo la variable de entorno.
```

---

## Variante Para Pedir Diseño
Usa esto si quieres un HTML mejor diseñado:

```text
No hagas un HTML genérico.
Quiero una interfaz:
- profesional
- limpia
- clara
- con buena jerarquía visual
- responsive real
- pensada para desktop y móvil

Si ya existe HTML base, mejora sobre eso.
No rehagas todo desde cero sin necesidad.

Debes revisar:
- ancho útil real en desktop
- densidad visual
- tablas sin scroll innecesario
- botones táctiles en móvil
- mensajes de estado claros
```

---

## Instrucción Para Crear Repo En GitHub Si Codex No Puede
Si Codex no puede crear el repo directamente, debe darte algo como esto:

```text
Paso a paso GitHub:
1. Entra a https://github.com/new
2. Nombre del repo: NOMBRE-DEL-PROYECTO
3. Visibilidad: Private o Public según necesidad
4. No marques README si ya existe proyecto local con archivos
5. Crea el repo

Luego ejecuta:
git init
git branch -M main
git remote add origin https://github.com/TU-USUARIO/NOMBRE-DEL-PROYECTO.git
git add .
git commit -m "inicio del proyecto"
git push -u origin main
```

---

## Instrucción Para Crear Web Service En Render Si Codex No Puede
Si Codex no puede crearlo directamente, debe darte algo como esto:

```text
Paso a paso Render:
1. Entra a https://dashboard.render.com/
2. Click en New +
3. Selecciona Web Service
4. Conecta el repo GitHub
5. Elige la rama main
6. Root Directory: dejar vacío o el directorio correcto del proyecto
7. Runtime: Node
8. Build Command:
   npm install
9. Start Command:
   node server.js
10. Variables de entorno:
   ACCESS_PASSWORD=TU_PASSWORD
11. Crear servicio
12. Esperar deploy
13. Verificar URL publicada
```

Si el proyecto fuera verdaderamente estático, entonces en lugar de `Web Service`:
- usar `Static Site`
- indicar `Publish Directory`

Pero si hay login o backend:
- debe ser `Web Service`

---

## Checklist Final Que Debe Cumplir Codex
- HTML funcional
- CSS consistente
- JS funcional
- backend funcional si hace falta
- login real si aplica
- sesión real si aplica
- logout real si aplica
- localhost probado
- móvil considerado
- repo revisado
- Render revisado
- deploy hecho o paso a paso exacto entregado
- `.md` de bitácora creado

---

## Consejo Operativo
Si quieres el mejor resultado, al abrir un proyecto nuevo pídele a Codex algo como:

```text
Usa como guía el archivo docs/sabiduria-html-render.md y aplica ese estándar completo a este proyecto.
```

Eso fuerza a que el proyecto arranque con:
- criterio técnico
- criterio visual
- criterio de publicación
- criterio documental

