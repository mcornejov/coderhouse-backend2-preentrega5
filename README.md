# Café Aurora · Plataforma de Eventos e Inscripciones

Proyecto de **Backend II** de CoderHouse: una API REST con Express organizada por capas y
persistencia en MongoDB, que crece entrega a entrega hacia una plataforma completa de eventos
con autenticación, roles, inscripciones y control de cupos.

**Pre-entrega 5:** autorización por **roles**. Ya no alcanza con iniciar sesión: cada acción se
valida según el rol del usuario (`user`, `organizer`, `admin`) con una matriz de permisos
centralizada (`src/config/roles.config.js`), un middleware reutilizable `authorize(...roles)`
(`src/middlewares/authorize.middleware.js`) encadenado después del de autenticación, y una primera
regla de propiedad: un `organizer` solo modifica sus propios eventos, un `admin` cualquiera. La API
diferencia **401** (sin sesión) de **403** (con sesión pero sin permiso). Se suman `POST` y
`PUT /api/events` (eventos ahora persistidos en MongoDB) y el recurso administrativo `/api/users`.
La autenticación con Passport de la entrega anterior no cambia.

## Temática elegida

**Café Aurora** es una cafetería de especialidad (marca que acompaña todos mis proyectos de la
carrera Fullstack) que organiza eventos para su comunidad: catas de café, talleres de barismo,
charlas con productores y noches de música en vivo. La plataforma permitirá publicar esos eventos
y gestionar las inscripciones de los clientes.

## Tecnologías

| Tecnología | Uso |
|------------|-----|
| Node.js (>= 20.19) | Entorno de ejecución, módulos ESM |
| Express 5 | Servidor HTTP y enrutamiento |
| MongoDB + Mongoose | Persistencia y modelos (`User`, `Event`) |
| Passport (`passport`, `passport-local`, `passport-jwt`) | Estrategias de autenticación `register`, `login` y `current` |
| bcrypt | Hash y comparación de contraseñas |
| jsonwebtoken | Firma del JWT (la verificación la hace `passport-jwt`) |
| cookie-parser | Lectura de la cookie de sesión |
| dotenv | Variables de entorno |
| node:test + supertest + mongodb-memory-server | Tests de integración con base en memoria |
| pnpm | Gestor de paquetes |

## Instalación

```bash
git clone https://github.com/mcornejov/coderhouse-backend2-preentrega5.git
cd coderhouse-backend2-preentrega5
pnpm install
```

> Si no usas pnpm, `npm install` también funciona.

## Configuración de variables de entorno

Copia el archivo de ejemplo y ajusta los valores:

```bash
cp .env.example .env
```

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `PORT` | Puerto donde escucha el servidor | Sí |
| `NODE_ENV` | Entorno: `development`, `production` o `test`. En `production` la cookie se marca `secure` | Sí |
| `MONGO_URL` | Cadena de conexión a MongoDB (Atlas o local). Sin ella el servidor no arranca | Sí |
| `JWT_SECRET` | Secreto con el que se firman (controller) y verifican (estrategia `current`) los JWT. Usa un valor largo y aleatorio | Sí |
| `JWT_EXPIRES_IN` | Expiración del JWT: número de segundos (`3600`) o duración con unidad (`15m`, `1h`, `7d`). Por defecto `1h` | No |
| `BCRYPT_SALT_ROUNDS` | Costo del hash de bcrypt, entre 10 y 14 (por defecto 10) | No |

El servidor valida la configuración al arrancar (Fail-Fast): si falta una variable obligatoria o
`PORT`/`JWT_EXPIRES_IN` tienen un valor inválido, se detiene con un mensaje claro en vez de
servir una API rota. El secreto **nunca está en el código**: solo se lee de `process.env`.

El archivo `.env` está excluido del repositorio mediante `.gitignore`; nunca se versionan
credenciales.

## Cómo ejecutar

```bash
pnpm start      # producción: node src/server.js
pnpm dev        # desarrollo: reinicia automáticamente al guardar cambios
pnpm test       # suite de tests (usa MongoDB en memoria, no necesita base instalada)
pnpm asignar-rol <email> <rol>      # asigna un rol a un usuario registrado (ver "Primer admin")
```

Con la configuración por defecto el servidor queda disponible en `http://localhost:8080`.

## Roles y matriz de permisos

Los roles y la matriz viven en un solo archivo, `src/config/roles.config.js`; el modelo `User`
los usa como `enum`, los routers los pasan al middleware `authorize(...)` y nada más en el código
compara roles a mano.

| Rol | Quién es | Cómo se obtiene |
|-----|----------|-----------------|
| `user` | Cliente de la cafetería que se inscribe a eventos | Rol **por defecto** de todo registro público. El campo `role` del body se ignora |
| `organizer` | Personal de Café Aurora que organiza catas, talleres y charlas | Un `admin` lo asigna con `PATCH /api/users/:uid/role` |
| `admin` | Administración de la plataforma | Igual que `organizer`, o con `pnpm asignar-rol` para el primer admin de una instalación |

| Acción | Ruta | `user` | `organizer` | `admin` | Sin sesión |
|--------|------|:------:|:-----------:|:-------:|:----------:|
| Consultar eventos (listado y detalle) | `GET /api/events`, `GET /api/events/:eid` | ✅ | ✅ | ✅ | ✅ |
| Ver la propia sesión | `GET /api/sessions/current` | ✅ | ✅ | ✅ | ❌ 401 |
| Crear eventos | `POST /api/events` | ❌ 403 | ✅ | ✅ | ❌ 401 |
| Modificar eventos **propios** | `PUT /api/events/:eid` | ❌ 403 | ✅ | ✅ | ❌ 401 |
| Modificar **cualquier** evento | `PUT /api/events/:eid` | ❌ 403 | ❌ 403 | ✅ | ❌ 401 |
| Ver todos los usuarios | `GET /api/users` | ❌ 403 | ❌ 403 | ✅ | ❌ 401 |
| Asignar roles | `PATCH /api/users/:uid/role` | ❌ 403 | ❌ 403 | ✅ | ❌ 401 |

En código la matriz es `PERMISOS`: `acción → roles permitidos`. Las acciones sin entrada no las
tiene nadie (cerrado por defecto) y el objeto está congelado para que ningún módulo lo amplíe en
tiempo de ejecución:

```js
export const PERMISOS = Object.freeze({
  CREAR_EVENTO:     [ROLES.ORGANIZER, ROLES.ADMIN],
  MODIFICAR_EVENTO: [ROLES.ORGANIZER, ROLES.ADMIN],   // organizer solo los propios (lo verifica el servicio)
  VER_USUARIOS:     [ROLES.ADMIN],
  ASIGNAR_ROL:      [ROLES.ADMIN],
});
```

### 401 vs 403

| Código | Significa | Cuándo | Respuesta |
|--------|-----------|--------|-----------|
| **401 Unauthorized** | **No sé quién eres.** Falta la cookie `currentUser`, el token está manipulado, firmado con otro secreto o expirado | Lo responde el middleware de **autenticación** (`auth`) en cualquier ruta privada | `{ "status": "error", "message": "No autenticado" }` |
| **403 Forbidden** | **Sé quién eres y no puedes hacer esto.** Hay sesión válida pero el rol no está en los permitidos, o el recurso no es tuyo | Lo responde el middleware de **autorización** (`authorize`) o el servicio al verificar la propiedad | `{ "status": "error", "message": "No tienes permisos para realizar esta acción" }` |

Ninguno de los dos casos llega al `500`: ambos son errores de la aplicación (`UnauthorizedError`,
`ForbiddenError` en `utils/errors.util.js`) que el middleware global traduce al código HTTP. Los
otros códigos de acceso también se distinguen: `404` recurso inexistente (id válido que no está) y
`400` datos inválidos (id con formato incorrecto, campos faltantes o fuera de rango).

### Middlewares

Los dos middlewares son reutilizables, viven en `src/middlewares/` y se encadenan en las rutas en
este orden: primero *quién eres*, después *qué puedes hacer*.

```js
// routes/events.router.js
router.post('/',     auth, authorize(...PERMISOS.CREAR_EVENTO),     controller.crear);
router.put('/:eid',  auth, authorize(...PERMISOS.MODIFICAR_EVENTO), controller.actualizar);
```

| Middleware | Archivo | Qué hace | Si falla |
|------------|---------|----------|----------|
| `auth` | `auth.middleware.js` | Estrategia `current` de Passport: lee el JWT de la cookie `currentUser` (o header `Bearer`), verifica firma y vigencia, deja `{ id, email, role }` en `req.user` | `401 No autenticado` |
| `authorize(...roles)` | `authorize.middleware.js` | Recibe los roles permitidos como parámetro y compara contra `req.user.role` | `403` si el rol no coincide; `401` si se usó sin `auth` antes (defensa ante un olvido) |

`authorize` valida sus argumentos al construir la ruta, en el arranque: sin roles o con un rol que
no existe en la matriz (`'organiser'`) lanza un `TypeError`, en lugar de bloquear la ruta en
silencio para todo el mundo en la primera petición.

### Propiedad de recursos

El middleware decide por rol; para decidir por *dueño* hace falta el evento, que está en la base.
Por eso la regla "un `organizer` solo modifica sus propios eventos" se aplica en
`EventsService.actualizar`, que ya carga el evento para modificarlo: compara `evento.organizer`
con `req.user.id` (ambos como `string`, gracias al DTO) y, si no coinciden y el rol no es `admin`,
lanza `ForbiddenError('Solo puedes modificar tus propios eventos')` → `403`. Un `admin` modifica
cualquiera. El `organizer` de un evento nunca viene del body: se toma de la sesión al crearlo y no
se puede cambiar al modificarlo.

### Primer admin

El registro público solo crea usuarios `user` y asignar roles por la API exige ser `admin`. Para la
primera instalación, el script de administración cambia el rol de un usuario ya registrado usando la
misma `MONGO_URL` del `.env` y las mismas capas que la API (`service → repository → dao`):

```bash
pnpm asignar-rol ana@mail.com admin
# Rol actualizado: ana@mail.com → admin (...)
```

> Con npm: `npm run asignar-rol -- ana@mail.com admin` (npm necesita el separador `--`; pnpm no).

Después, ese admin puede promover a otros desde `PATCH /api/users/:uid/role`. En ambos casos el
cambio rige en el **próximo login**: el JWT ya emitido conserva el rol anterior hasta que expire
(sesión sin estado, ver "Decisiones de seguridad").

## Estrategias de Passport

Todas las estrategias viven en `src/config/passport.config.js`. `app.js` solo las registra con
`configurarPassport()` e inicializa Passport con `passport.initialize()`; no usa
`passport.session()` porque la sesión viaja en el JWT, no en el servidor.

| Estrategia | Tipo | Qué hace | Entrega en `req.user` | Si falla |
|------------|------|----------|------------------------|----------|
| `register` | `passport-local` (`usernameField: 'email'`, `passReqToCallback`) | Valida campos obligatorios, formato de email y largo de contraseña; normaliza el email; verifica unicidad; hashea con bcrypt; crea el usuario con rol `user` (el rol del body se ignora) | Usuario creado sin contraseña | `400` / `409` según la regla incumplida |
| `login` | `passport-local` | Busca el usuario por email normalizado y compara la contraseña con bcrypt (contra un hash señuelo si el email no existe). **No firma el JWT ni setea la cookie** | `{ id, email, role }` | `401` `Credenciales inválidas` (genérico) · `400` si falta email o password |
| `current` | `passport-jwt` | Extrae el JWT de la cookie `currentUser` (o del header `Authorization: Bearer`), verifica firma (`HS256`, `JWT_SECRET`) y vigencia | `{ id, email, role }` del payload | `401` `No autenticado` |

Las rutas delegan en `passport.authenticate(...)` a través de `autenticarCon(estrategia)`
(`src/middlewares/auth.middleware.js`), un envoltorio que convierte los fallos de Passport al
formato JSON de la API en vez del `Unauthorized` en texto plano por defecto. Tras una estrategia
exitosa, el **controller** es quien responde: en el login firma el JWT (`utils/jwt.js`) y lo
guarda en la cookie; en `current` devuelve `req.user`; el logout no pasa por Passport.

### Preparado para providers externos

`passport.config.js` construye las estrategias en una sola función (`crearEstrategias`) que
devuelve un objeto `{ nombre: estrategia }` y las registra en un bucle. Para agregar Google o
GitHub basta con instalar la estrategia correspondiente (`passport-google-oauth20`,
`passport-github2`), sumar una entrada más a ese objeto con su `clientID`/`clientSecret` leídos de
`.env`, y crear las dos rutas del flujo OAuth (`/api/sessions/google` y su `callback`). Ni
`app.js`, ni las rutas existentes, ni el controller cambian: la nueva estrategia entrega el
usuario en `req.user` y el controller emite la misma cookie `currentUser` de siempre.

## Rutas disponibles

| Método | Ruta | Descripción | Middlewares | Respuesta |
|--------|------|-------------|-------------|-----------|
| GET | `/api/health` | Estado del servidor | — | `200` `{ "status": "ok", "message": "Servidor activo" }` |
| POST | `/api/sessions/register` | Registro de usuario (siempre rol `user`) | estrategia `register` | `201` con el usuario creado · `400` · `409` |
| POST | `/api/sessions/login` | Inicio de sesión: emite el JWT en la cookie `currentUser` | estrategia `login` | `200` `Login correcto` · `400` · `401` |
| GET | `/api/sessions/current` | Usuario autenticado (lee la cookie) | `auth` | `200` `{ id, email, role }` · `401` |
| POST | `/api/sessions/logout` | Cierre de sesión: elimina la cookie | — | `200` `Sesión cerrada` |
| GET | `/api/events` | Lista de eventos (pública) | — | `200` con la lista |
| GET | `/api/events/:eid` | Detalle de un evento (pública) | — | `200` · `404` si no existe · `400` id inválido |
| POST | `/api/events` | Crear un evento a nombre del usuario autenticado | `auth`, `authorize(organizer, admin)` | `201` con el evento · `400` · `401` · `403` |
| PUT | `/api/events/:eid` | Modificar un evento (organizer: solo propios; admin: cualquiera) | `auth`, `authorize(organizer, admin)` + propiedad en el servicio | `200` con el evento · `400` · `401` · `403` · `404` |
| GET | `/api/users` | Listar todos los usuarios (sin contraseñas) | `auth`, `authorize(admin)` | `200` con la lista · `401` · `403` |
| PATCH | `/api/users/:uid/role` | Asignar rol a un usuario | `auth`, `authorize(admin)` | `200` con el usuario · `400` · `401` · `403` · `404` |

Formato de respuesta: éxito `{ "status": "success", "payload": ... }` o
`{ "status": "success", "message": "..." }`; error `{ "status": "error", "message": "..." }`.
Las rutas de sesión mantienen el contrato de las entregas anteriores.

A continuación, el detalle de cada ruta con ejemplos de request y response.

### `POST /api/sessions/register`

Request:

```json
{ "first_name": "Ana", "last_name": "Pérez", "email": "Ana@Mail.com ", "password": "Secreta123" }
```

| Campo | Reglas |
|-------|--------|
| `first_name`, `last_name` | Obligatorios |
| `email` | Obligatorio, formato válido, único. Se normaliza con `trim` + minúsculas |
| `password` | Obligatoria, mínimo 8 caracteres y máximo 72 bytes (límite de bcrypt). Se guarda hasheada con bcrypt |

El campo `role` **no se acepta desde el body**: todo usuario nuevo se crea con el rol `user`
(menor privilegio). Los roles posibles son `user`, `organizer` y `admin`.

Response `201`:

```json
{ "status": "success", "payload": { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user" } }
```

| Código | Cuándo | Cuerpo |
|--------|--------|--------|
| `400` | Faltan campos obligatorios | `{ "status": "error", "message": "Faltan campos obligatorios" }` |
| `400` | Email con formato inválido | `{ "status": "error", "message": "El email no tiene un formato válido" }` |
| `400` | Contraseña menor a 8 caracteres | `{ "status": "error", "message": "La contraseña debe tener al menos 8 caracteres" }` |
| `400` | Contraseña mayor a 72 bytes | `{ "status": "error", "message": "La contraseña no puede superar los 72 bytes" }` |
| `409` | Email ya registrado | `{ "status": "error", "message": "El email ya está registrado" }` |

La respuesta **nunca incluye la contraseña**, ni en texto plano ni hasheada.

### `POST /api/sessions/login`

Request:

```json
{ "email": "ana@mail.com", "password": "Secreta123" }
```

Response `200` (además setea la cookie `currentUser`, `HttpOnly`):

```json
{ "status": "success", "message": "Login correcto" }
```

```http
Set-Cookie: currentUser=eyJhbGciOiJIUzI1NiIs...; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax
```

Response `401` (email inexistente **o** contraseña incorrecta: siempre el mismo mensaje, para no
revelar cuál de los dos falló):

```json
{ "status": "error", "message": "Credenciales inválidas" }
```

Response `400` (falta `email` o `password`):

```json
{ "status": "error", "message": "Faltan campos obligatorios" }
```

Qué hace el login:

1. La estrategia `login` valida la presencia de `email` y `password` y normaliza el email.
2. Busca el usuario y compara la contraseña con el hash almacenado (`bcrypt.compare`).
   Si el email no existe igual se ejecuta una comparación contra un hash señuelo, para que el
   tiempo de respuesta no delate qué correos están registrados. Si todo coincide, deja
   `{ id, email, role }` en `req.user`; si no, falla con el mensaje genérico.
3. El **controller** genera el JWT con ese payload mínimo (nunca la contraseña), firmado con
   `JWT_SECRET` y con expiración `JWT_EXPIRES_IN`.
4. El controller guarda el token en la cookie `currentUser` con `httpOnly: true`,
   `sameSite: 'lax'`, `maxAge: 3600000` y `secure: true` solo en producción. El token **no viaja
   en el body**.
   La cookie dura una hora; si `JWT_EXPIRES_IN` es menor, la sesión termina cuando expira el
   token (`/current` responde `401` aunque la cookie siga presente).

### `GET /api/sessions/current`

Ruta protegida por el middleware `auth`, que es la estrategia `current` de Passport: lee la
cookie `currentUser` (o, alternativamente, el header `Authorization: Bearer <token>`), verifica
la firma y la vigencia del JWT y deja `{ id, email, role }` en `req.user`.

Response `200` (con la cookie):

```json
{ "status": "success", "payload": { "id": "665f2a...", "email": "ana@mail.com", "role": "user" } }
```

Response `401` (sin cookie, token manipulado, firmado con otro secreto o expirado):

```json
{ "status": "error", "message": "No autenticado" }
```

### `POST /api/sessions/logout`

Elimina la cookie `currentUser` (la reenvía vencida con los mismos atributos con que se creó).
No requiere estar autenticado.

Response `200`:

```json
{ "status": "success", "message": "Sesión cerrada" }
```

### `POST /api/events`

Protegida con `auth` + `authorize(organizer, admin)`.

Request (con la cookie de un `organizer` o `admin`):

```json
{ "title": "Cata de cafés de Colombia", "description": "Tres orígenes con método V60", "date": "2027-03-15T19:00:00.000Z", "location": "Café Aurora, Providencia", "capacity": 12, "price": 15000 }
```

| Campo | Reglas |
|-------|--------|
| `title`, `location` | Obligatorios, texto no vacío |
| `date` | Obligatoria, fecha válida (ISO 8601) |
| `capacity` | Obligatorio, entero mayor que 0 |
| `price` | Opcional, número mayor o igual a 0 (por defecto 0) |
| `description` | Opcional |

`organizer` y `status` **no se aceptan desde el body**: el organizador es el usuario de la sesión y
el evento nace en estado `draft` (la gestión de estados llega con el CRUD completo).

Response `201`:

```json
{ "status": "success", "payload": { "id": "6690...", "title": "Cata de cafés de Colombia", "description": "Tres orígenes con método V60", "date": "2027-03-15T19:00:00.000Z", "location": "Café Aurora, Providencia", "capacity": 12, "price": 15000, "status": "draft", "organizer": "665f2a...", "category": null } }
```

| Código | Cuándo | Cuerpo |
|--------|--------|--------|
| `401` | Sin cookie o token inválido | `{ "status": "error", "message": "No autenticado" }` |
| `403` | Sesión válida con rol `user` | `{ "status": "error", "message": "No tienes permisos para realizar esta acción" }` |
| `400` | Faltan campos | `{ "status": "error", "message": "Faltan campos obligatorios: date, location, capacity" }` |
| `400` | Valor inválido | `{ "status": "error", "message": "El campo capacity debe ser un entero mayor que 0" }` (y análogos para `date`, `price`, `title`, `location`) |

### `PUT /api/events/:eid`

Protegida con `auth` + `authorize(organizer, admin)`; además, el servicio verifica la propiedad.
Se envían solo los campos a cambiar (mismas reglas que al crear); los demás se conservan.

```json
{ "title": "Cata de cafés de Etiopía", "capacity": 10 }
```

| Código | Cuándo | Cuerpo |
|--------|--------|--------|
| `200` | El `organizer` dueño o un `admin` | `{ "status": "success", "payload": { ...evento actualizado } }` |
| `403` | `organizer` sobre un evento ajeno | `{ "status": "error", "message": "Solo puedes modificar tus propios eventos" }` |
| `403` | Rol `user` | `{ "status": "error", "message": "No tienes permisos para realizar esta acción" }` |
| `404` | No existe un evento con ese id | `{ "status": "error", "message": "No existe un evento con id ..." }` |
| `400` | Id con formato inválido, sin campos modificables o valores inválidos | `{ "status": "error", "message": "..." }` |
| `401` | Sin sesión | `{ "status": "error", "message": "No autenticado" }` |

### `GET /api/users`

Ruta administrativa: `auth` + `authorize(admin)`.

Response `200`:

```json
{ "status": "success", "payload": [ { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "admin" } ] }
```

`401` sin sesión; `403` con rol `user` u `organizer`. La respuesta sale del DTO de usuario: nunca
incluye la contraseña ni su hash.

### `PATCH /api/users/:uid/role`

Ruta administrativa: `auth` + `authorize(admin)`.

```json
{ "role": "organizer" }
```

`200` con el usuario actualizado · `400` `El rol debe ser uno de: user, organizer, admin` · `404` si el
usuario no existe · `401` / `403` como el resto de rutas administrativas. El nuevo rol rige en el
próximo login del usuario.

## Cómo probarlo

Con `curl` (la opción `-c` guarda la cookie que devuelve el login y `-b` la reenvía):

```bash
# 1. Registro
curl -X POST http://localhost:8080/api/sessions/register \
  -H "Content-Type: application/json" \
  -d '{ "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "password": "Secreta123" }'

# 2. Login: guarda la cookie currentUser en cookies.txt (con -i se ve el header Set-Cookie)
curl -i -c cookies.txt -X POST http://localhost:8080/api/sessions/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "ana@mail.com", "password": "Secreta123" }'
# { "status": "success", "message": "Login correcto" }

# 3. Usuario actual con la cookie → 200
curl -b cookies.txt http://localhost:8080/api/sessions/current
# { "status": "success", "payload": { "id": "...", "email": "ana@mail.com", "role": "user" } }

# 4. Logout: borra la cookie
curl -b cookies.txt -c cookies.txt -X POST http://localhost:8080/api/sessions/logout
# { "status": "success", "message": "Sesión cerrada" }

# 5. Usuario actual tras el logout → 401
curl -b cookies.txt http://localhost:8080/api/sessions/current
# { "status": "error", "message": "No autenticado" }

# Login con email inexistente o contraseña incorrecta → 401 con el mismo mensaje
curl -X POST http://localhost:8080/api/sessions/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "nadie@mail.com", "password": "Secreta123" }'
# { "status": "error", "message": "Credenciales inválidas" }

# /current sin cookie → 401
curl http://localhost:8080/api/sessions/current
# { "status": "error", "message": "No autenticado" }

# /current con token manipulado → 401
curl -b "currentUser=token.manipulado.xyz" http://localhost:8080/api/sessions/current
# { "status": "error", "message": "No autenticado" }
```

### Flujo de roles (casos de la consigna)

```bash
# 0. Registrar tres usuarios: ana (será admin), bruno (será organizer) y carla (user)
for u in ana bruno carla; do
  curl -s -X POST http://localhost:8080/api/sessions/register -H "Content-Type: application/json" \
    -d "{ \"first_name\": \"$u\", \"last_name\": \"Prueba\", \"email\": \"$u@mail.com\", \"password\": \"Secreta123\" }"
done

# 1. Primer admin con el script (usa la MONGO_URL del .env)
pnpm asignar-rol ana@mail.com admin

# 2. Login de cada uno (una cookie por archivo)
for u in ana bruno carla; do
  curl -s -c $u.txt -X POST http://localhost:8080/api/sessions/login -H "Content-Type: application/json" \
    -d "{ \"email\": \"$u@mail.com\", \"password\": \"Secreta123\" }"
done

# 3. Ruta administrativa con admin → 200 (lista de usuarios, sin contraseñas)
curl -b ana.txt http://localhost:8080/api/users

# 4. El admin promueve a bruno a organizer → 200. Bruno vuelve a hacer login para renovar su JWT
BRUNO_ID=$(curl -s -b ana.txt http://localhost:8080/api/users | node -pe 'JSON.parse(require("fs").readFileSync(0)).payload.find(u => u.email === "bruno@mail.com").id')
curl -b ana.txt -X PATCH http://localhost:8080/api/users/$BRUNO_ID/role -H "Content-Type: application/json" -d '{ "role": "organizer" }'
curl -s -c bruno.txt -X POST http://localhost:8080/api/sessions/login -H "Content-Type: application/json" -d '{ "email": "bruno@mail.com", "password": "Secreta123" }'

# 5. Ruta administrativa con organizer → 403
curl -b bruno.txt http://localhost:8080/api/users
# { "status": "error", "message": "No tienes permisos para realizar esta acción" }

# 6. POST /api/events con user (carla) → 403
curl -b carla.txt -X POST http://localhost:8080/api/events -H "Content-Type: application/json" \
  -d '{ "title": "Cata de cafés de Colombia", "date": "2027-03-15T19:00:00.000Z", "location": "Café Aurora", "capacity": 12, "price": 15000 }'
# { "status": "error", "message": "No tienes permisos para realizar esta acción" }

# 7. POST /api/events con organizer (bruno) → 201
curl -b bruno.txt -X POST http://localhost:8080/api/events -H "Content-Type: application/json" \
  -d '{ "title": "Cata de cafés de Colombia", "date": "2027-03-15T19:00:00.000Z", "location": "Café Aurora", "capacity": 12, "price": 15000 }'
# { "status": "success", "payload": { "id": "...", "title": "Cata de cafés de Colombia", ..., "organizer": "<id de bruno>" } }

# 8. Cualquier ruta privada sin cookie → 401
curl -X POST http://localhost:8080/api/events -H "Content-Type: application/json" -d '{}'
# { "status": "error", "message": "No autenticado" }

# 9. organizer modificando un evento ajeno → 403 (ana crea uno como admin y bruno intenta editarlo)
EVENTO_AJENO=$(curl -s -b ana.txt -X POST http://localhost:8080/api/events -H "Content-Type: application/json" \
  -d '{ "title": "Noche de jazz", "date": "2027-05-01T21:00:00.000Z", "location": "Café Aurora", "capacity": 40 }' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).payload.id')
curl -b bruno.txt -X PUT http://localhost:8080/api/events/$EVENTO_AJENO -H "Content-Type: application/json" -d '{ "title": "Otro" }'
# { "status": "error", "message": "Solo puedes modificar tus propios eventos" }

# 10. admin modificando cualquier evento → 200
curl -b ana.txt -X PUT http://localhost:8080/api/events/$EVENTO_AJENO -H "Content-Type: application/json" -d '{ "capacity": 50 }'
```

En Postman o Thunder Client la cookie se guarda sola tras el login: basta con llamar a la ruta
después y ver el código; para probar el `401`, borrar la cookie `currentUser` en el gestor de
cookies (o esperar a que expire). Para cambiar de rol, hacer login con otro usuario.

### Suite de tests

Todos los casos anteriores están automatizados:

```bash
pnpm test
```

76 tests con MongoDB en memoria. Los 43 de la entrega anterior siguen pasando (autenticación con
Passport, registro, login, cookie, configuración). Los 33 nuevos cubren esta entrega:

- `test/authorize.test.js`: la matriz define los tres roles con `user` por defecto y es inmutable;
  `authorize` deja pasar al rol permitido, responde `403` al no permitido y `401` si se usa sin
  `auth`; rechaza roles desconocidos al construirse; vive separado de las rutas y ninguna ruta
  compara roles a mano. Y la tabla 401/403: **toda** ruta privada sin cookie o con token manipulado
  → `401`; con sesión de `user` → `403` (nunca 401 ni 500); `/current` responde `200` a los tres roles.
- `test/events.test.js`: `POST` con `user` → `403` (y no se crea nada); con `organizer`/`admin` →
  `201` con `organizer` igual al id de la sesión; `organizer`/`status` del body ignorados; `400`
  por campos faltantes o inválidos; listado y detalle públicos; `PUT` del dueño → `200`, de otro
  `organizer` → `403` sin modificar la base, de `admin` → `200` conservando al organizador original;
  `404` inexistente, `400` id inválido o sin campos.
- `test/users.test.js`: `GET /api/users` con `organizer` → `403`, con `admin` → `200` sin hashes;
  `PATCH .../role` promueve a `organizer` y el nuevo rol aparece tras volver a iniciar sesión;
  rol inválido → `400`; usuario inexistente → `404`.

## Decisiones de seguridad

- **Autorización en el middleware, no en las rutas ni solo en el negocio**: las rutas declaran
  `auth, authorize(...PERMISOS.X)`; los controllers y servicios reciben un `req.user` ya autorizado.
  La única comparación fuera del middleware es la de propiedad (`organizer` dueño), que necesita el
  recurso cargado y por eso vive en el servicio junto a las demás reglas del evento.
- **Cerrado por defecto**: la matriz solo enumera lo permitido; un rol o acción fuera de ella no
  tiene permiso. `authorize` sin `req.user` responde `401` en vez de fallar con `500`, y los roles
  desconocidos se detectan al arrancar.
- **El rol nunca viene del cliente**: ni en el registro (se ignora del body) ni al crear o modificar
  eventos (`organizer` sale de la sesión). Solo un `admin` cambia roles, por una ruta protegida o
  por el script de administración con acceso a la base.
- **Ids comparados como texto**: el DTO de evento convierte `organizer` a `string`, igual que el
  `id` del JWT, así la verificación de propiedad no depende de `ObjectId` vs `string`.
- **Contraseñas**: se guardan solo como hash de bcrypt (`utils/hash.js`, funciones
  reutilizables `hashPassword` / `comparePassword`). Nunca se devuelven ni se incluyen en el JWT.
  Se rechazan las de más de 72 bytes porque bcrypt ignora el resto y compararía truncado.
- **Entrada validada en la frontera**: email y password deben ser strings; un objeto en el body
  (por ejemplo `{ "$gt": "" }`) se rechaza antes de llegar a la consulta de Mongoose.
- **Mensaje genérico en el login**: `Credenciales inválidas` tanto si el email no existe como si
  la contraseña no coincide. Además se compara siempre contra un hash (real o señuelo) para no
  revelar por tiempo de respuesta qué emails existen.
- **JWT**: firmado con `JWT_SECRET` de entorno, algoritmo fijado en el servidor
  (`algorithms: ['HS256']`, nunca tomado del header del token), payload mínimo `{ id, email, role }`
  y expiración configurable.
- **Cookie `httpOnly`**: el token no es accesible desde JavaScript del navegador (mitiga XSS);
  `sameSite: 'lax'` reduce el riesgo de CSRF; `secure` solo en producción para poder probar en
  `http://localhost`.
- **Estrategia `current` / middleware `auth`**: ante cualquier falla (sin token, firma inválida,
  manipulado, expirado) responde `401 No autenticado` sin detallar la causa.
- **Passport no firma tokens**: las estrategias solo autentican y entregan el usuario; emitir el
  JWT y manejar la cookie es responsabilidad del controller (capa HTTP).
- **Credenciales solo en el body**: `passport-local` también las leería de la query string, pero
  las estrategias validan desde `req.body` para que ninguna contraseña termine en URLs o logs.
- **Payload del JWT verificado en forma, no solo en firma**: la estrategia `current` exige
  `{ id, email, role }`; un token firmado con el mismo secreto pero con otro contenido no
  autentica.
- **Fail-Fast de configuración**: sin `JWT_SECRET` o `MONGO_URL` el servidor no arranca; un
  `JWT_EXPIRES_IN` inválido o cero también lo detiene, y un secreto de menos de 32 caracteres
  genera un aviso al iniciar.
- **Sesión sin estado**: `/current` y `authorize` deciden con el payload del JWT, sin consultar la
  base. Un cambio de rol (o la baja del usuario) rige cuando el token expira o el usuario vuelve a
  iniciar sesión; por eso la expiración es corta (1 h) y el `PATCH .../role` lo documenta. La
  alternativa (consultar el rol en la base en cada petición) se evalúa cuando existan acciones
  más sensibles; hoy el costo de una hora de desfase es aceptable.

## Estructura de carpetas

```
coderhouse-backend2-preentrega5/
├── src/
│   ├── app.js                        # configura Express (json, cookie-parser, routers); no levanta el server
│   ├── server.js                     # punto de entrada: conecta MongoDB y levanta el servidor
│   ├── config/
│   │   ├── env.config.js             # carga y valida variables de entorno (Fail-Fast), JWT_EXPIRES_IN
│   │   ├── db.config.js              # conexión a MongoDB con Mongoose
│   │   ├── passport.config.js        # estrategias 'register', 'login' y 'current' centralizadas
│   │   └── roles.config.js           # ROLES, USER_ROLES, DEFAULT_ROLE y la matriz PERMISOS
│   ├── routes/
│   │   ├── index.js                  # router principal: monta los recursos bajo /api
│   │   ├── health.router.js
│   │   ├── events.router.js          # GET públicos; POST/PUT con auth + authorize(...PERMISOS)
│   │   ├── users.router.js           # rutas administrativas: auth + authorize(admin)
│   │   └── sessions.router.js        # delega en passport.authenticate(...) vía autenticarCon
│   ├── controllers/
│   │   ├── health.controller.js
│   │   ├── events.controller.js      # listar, obtenerPorId, crear, actualizar
│   │   ├── users.controller.js       # listar, asignarRol
│   │   └── sessions.controller.js    # HTTP: responde códigos, firma el JWT y setea/borra la cookie
│   ├── services/
│   │   ├── events.service.js         # reglas de eventos: whitelist, validación, propiedad (organizer dueño o admin)
│   │   └── users.service.js          # administración: listar usuarios, asignar rol válido
│   ├── repositories/
│   │   ├── events.repository.js      # devuelve DTOs de evento (ids como string)
│   │   └── users.repository.js       # acceso a datos; devuelve DTOs sin contraseña
│   ├── dao/
│   │   ├── events.dao.js             # única capa que usa el modelo Event de Mongoose
│   │   └── users.dao.js              # única capa que usa el modelo User de Mongoose
│   ├── dto/
│   │   ├── user.dto.js               # toUserDTO (registro, listado) y toSessionDTO ({ id, email, role })
│   │   └── event.dto.js              # toEventDTO: ObjectId → string, sin _id ni __v
│   ├── models/
│   │   ├── User.js                   # first_name, last_name, email (único), password, role (enum de roles.config)
│   │   └── Event.js                  # title, description, date, location, capacity, price, status, organizer, category
│   ├── middlewares/
│   │   ├── auth.middleware.js        # autenticarCon(estrategia) envuelve passport.authenticate; auth = 'current' → 401
│   │   ├── authorize.middleware.js   # authorize(...roles): compara req.user.role → 403
│   │   ├── notFound.middleware.js
│   │   └── error.middleware.js       # traduce errores a 400 / 401 / 403 / 404 / 409 / 500
│   ├── scripts/
│   │   └── asignar-rol.js            # pnpm asignar-rol <email> <rol>: primer admin de una instalación
│   └── utils/
│       ├── jwt.js                    # signToken (jsonwebtoken, HS256, JWT_SECRET); la verificación la hace passport-jwt
│       ├── hash.js                   # hashPassword / comparePassword con bcrypt
│       ├── cookies.util.js           # nombre y opciones de la cookie currentUser
│       ├── validators.js             # isValidEmail, normalizeEmail, largo mínimo de contraseña
│       ├── errors.util.js            # HttpError y errores 400 / 401 / 403 / 404 / 409
│       └── responses.util.js         # helpers de respuesta uniforme
├── test/
│   ├── env.js                        # variables mínimas para la suite
│   ├── setup.js                      # MongoDB en memoria para los tests
│   ├── helpers.js                    # crearUsuarioConRol(role): registro → rol → login → cookie
│   ├── config.test.js                # validación de JWT_EXPIRES_IN y JWT_SECRET al arrancar
│   ├── api.test.js
│   ├── register.test.js
│   ├── auth.test.js                  # login, current, logout, flujo completo
│   ├── passport.test.js              # estrategias registradas, separación app.js / config, JSON en fallos
│   ├── authorize.test.js             # matriz, middleware authorize, tabla 401 vs 403 de todas las rutas privadas
│   ├── events.test.js                # POST/PUT por rol, propiedad del recurso, validaciones, consulta pública
│   └── users.test.js                 # rutas administrativas: listar usuarios y asignar roles
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Flujo de la autenticación

```
POST /api/sessions/register
  → sessions.router        autenticarCon('register') → passport.authenticate('register')
  → passport.config        estrategia 'register': valida, normaliza, verifica unicidad, hashea
                           (utils/hash.js) y crea el usuario vía users.repository → users.dao
  → sessions.controller    responde 201 con req.user (DTO sin contraseña)

POST /api/sessions/login
  → sessions.router        autenticarCon('login') → passport.authenticate('login')
  → passport.config        estrategia 'login': findCredentialsByEmail + bcrypt.compare;
                           done(null, { id, email, role }) o done(null, false, 'Credenciales inválidas')
  → sessions.controller    firma el JWT (utils/jwt.js) y lo guarda en la cookie currentUser

GET /api/sessions/current
  → auth.middleware        auth = autenticarCon('current') → passport.authenticate('current')
  → passport.config        estrategia 'current' (passport-jwt): cookie currentUser o Bearer,
                           verifica firma/vigencia, done(null, { id, email, role })
  → sessions.controller    responde { id, email, role } desde req.user

POST /api/sessions/logout
  → sessions.controller    clearCookie('currentUser') y confirma (no pasa por Passport)
```

### Flujo de la autorización

```
POST /api/events  (cookie de un organizer)
  → auth                   estrategia 'current': JWT válido → req.user = { id, email, role: 'organizer' }
                           (sin cookie o token inválido → 401 "No autenticado")
  → authorize(organizer, admin)
                           'organizer' ∈ PERMISOS.CREAR_EVENTO → next()
                           (rol 'user' → 403 "No tienes permisos para realizar esta acción")
  → events.controller      crear(req.body, req.user)
  → events.service         whitelist de campos, validación, organizer = req.user.id
  → events.repository/dao  Event.create → DTO → 201

PUT /api/events/:eid  (cookie de otro organizer)
  → auth → authorize(organizer, admin)   pasa: el rol está permitido
  → events.service         carga el evento; evento.organizer !== req.user.id y no es admin
                           → 403 "Solo puedes modificar tus propios eventos"
```

## Modelos

- **User**: `first_name`, `last_name`, `email` (único, minúsculas), `password` (hash de bcrypt),
  `role` (`enum` de `roles.config.js`: `user` por defecto | `organizer` | `admin`), timestamps.
- **Event**: `title`, `description`, `date`, `location`, `capacity` (≥ 1), `price` (≥ 0),
  `status` (`draft` por defecto | `published` | `cancelled` | `finished`), `organizer`
  (referencia a `User`, tomado de la sesión), `category` (referencia a `Category`, se gestiona con
  el CRUD de eventos), timestamps.

## Próximos pasos

CRUD completo de eventos con categorías, cambio de estado (`PATCH /:eid/status`, cancelar =
estado), filtros y paginación; inscripciones con control de cupos; y providers externos
(Google/GitHub) como estrategias adicionales en `passport.config.js`.
