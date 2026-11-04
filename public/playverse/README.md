# PLAYVERSE (v0.5: rediseño Arcade, fases 1 y 2): frontend + backend + base de datos, todo gratis

Plataforma de entretenimiento familiar con puntos virtuales (sin dinero real).

- **Frontend** (`public/`): juegos locales + pestaña **🌐 Online**.
- **Backend** (`server/`): Node.js + Express (cuentas y ranking) + Socket.IO (salas en tiempo real).
- **Base de datos**: PostgreSQL en **Neon** (plan gratis, sin tarjeta).
- **Cuentas opcionales**: se puede jugar como **invitado** (solo un nombre) y luego pulsar *Guardar mi cuenta* para poner contraseña sin perder los puntos.

## 1. Crear la base de datos gratis (Neon)
1. Entra a https://neon.com y crea una cuenta (con Google o GitHub).
2. Crea un proyecto (ponle `playverse`). Copia la **connection string** (empieza con `postgresql://...`).
3. Las tablas se crean solas al arrancar el servidor.

## 2. Probar en tu computadora (Visual Studio Code)
1. Instala Node.js 20.6 o superior.
2. Abre la carpeta `playverse` en VS Code.
3. Copia `.env.example` como `.env` y pega tu connection string en `DATABASE_URL`.
4. En la terminal: `npm install` y luego `npm run dev`.
5. Abre http://localhost:3000. Para probar salas, usa una ventana normal y otra de incógnito.

## 3. Publicarlo gratis con URL (Render)
1. Sube la carpeta a un repositorio de GitHub (VS Code > Control de código fuente > Publicar en GitHub). El archivo `.env` no se sube (está en `.gitignore`).
2. En https://render.com crea cuenta > **New > Blueprint** > elige tu repositorio.
3. Cuando pida `DATABASE_URL`, pega la connection string de Neon.
4. Al terminar tendrás una URL como `https://playverse-xxxx.onrender.com` con HTTPS.

### Límites del plan gratis (importante)
- **Render gratis se duerme** tras 15 minutos sin visitas; la primera visita después tarda cerca de 1 minuto en despertar.
- Las **salas viven en memoria**: si el servidor se duerme o se reinicia, las salas activas se pierden. Las cuentas, puntos y ranking **no**, porque están en Neon.
- Neon gratis ofrece 0.5 GB de almacenamiento, suficiente para muchísimos jugadores en este proyecto.
- Revisa los límites vigentes de ambos servicios antes de compartir la URL con mucha gente.

## Novedades v0.5 (solo cambia la carpeta `public/`)
- Nueva interfaz arcade: menú lateral, barra superior con buscador y perfil, banner de bienvenida, juegos destacados, panel "Juega en línea", ranking semanal y juegos rápidos.
- Navegación por URL (`#/juegos`, `#/ranking`, `#/perfil`, `#/online`...): el botón Atrás funciona y se pueden compartir enlaces.
- Catálogo con buscador y filtros. Basta y Ajedrez aparecen como "Próximamente" (sin botón de jugar).
- Para actualizar: reemplaza la carpeta `public/` completa (no toques `.env` ni `node_modules`) y haz `git add .`, `git commit -m "rediseño"`, `git push`; Render se actualiza solo.

## Novedades v0.6
- **Basta (Stop) en modo local**: 2 a 10 jugadores por turnos, 3 a 8 categorías, 1/3/5 rondas, temporizador, respuestas ocultas, revisión con opción de anular y puntuación (100 única, 50 repetida, 0 vacía o inválida). Las reglas están en `public/js/basta-core.js`, que más adelante usará también el servidor.
- Solo cambia la carpeta `public/`.

## Estructura
```
server/index.js       API REST + arranque
server/db.js          PostgreSQL (usuarios, puntos, partidas)
server/rooms.js       Salas y trivia en tiempo real
server/questions.json Banco de preguntas
public/index.html     Estructura de la página
public/css/arcade.css Tema visual arcade
public/js/app.js      Estado, navegación, páginas y catálogo
public/js/games-local.js Juegos locales
public/online.js      Cuenta, lobby y partida online
render.yaml           Configuración de despliegue
```

## Pendiente
Más juegos online (adivinanzas, torneos por equipos, azar), retos diarios, panel de administración, logros guardados en servidor.
