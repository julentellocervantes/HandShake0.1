# HandShake

App web de seguimiento personal, privada y pensada para móvil, con diseño tipo "Liquid Glass" de iOS.

## Qué incluye

- **Bienvenida:** pantalla "HandShake" (con "TELLO APPS" arriba y "Desliza hacia arriba" abajo). Se abre arrastrando hacia arriba; la lámina de cristal se levanta y la app aparece desde detrás. También funciona con la rueda del ratón, con Enter/flecha arriba o tocando el aviso de abajo.
- **Fondo vivo:** burbujas de colores difuminadas que flotan despacio en bucle.
  - **Día (6:00 a 20:00):** colores claros y vivos.
  - **Noche (20:00 a 6:00):** colores fríos y oscuros. Cambia solo, sin recargar.
- **Barra inferior con iconos (2 + ＋ + 2):** Inicio, Juegos ⚔️, **+** (nuevo registro), Amigos y Perfil. Inicio incluye también el **Historial** (calendario y estadísticas) y Juegos incluye la **Tienda**: arriba de cada una hay un selector (Resumen/Historial y Duelos/Tienda). El indicador de cristal se desliza entre apartados y el contenido entra y sale con animación.
- **Racha 🔥:** días seguidos con al menos un registro. Aparece junto a tu nombre en la cabecera, en el perfil y en una tarjeta de Inicio con los últimos 7 días. Si hoy aún no has registrado, la racha sigue viva hasta que acabe el día.
- **Logros y marcos:** 10 logros, cada uno da un marco para tu foto de perfil (algunos animados). Se ven completados y por completar, con barra de progreso.
- **Perfil:** cambia tu nombre, pon una foto (se recorta y reduce sola), elige marco y consulta tus logros.
- **Código de amigo:** cada usuario tiene uno de **4 números y 3 letras** (por ejemplo `4827KQM`).
- **Solicitudes de amistad** (dentro de Amigos > pestaña **Amigos**, con un punto en la pestaña cuando llega una nueva): primero escribes el código de otra persona para solicitarle amistad, y debajo está la bandeja con las solicitudes recibidas para aceptarlas o rechazarlas. Al aceptar sois amigos: podéis chatear directamente o crear grupos.
- **Chats y grupos:** cuando subes un registro con "Avisar a mis grupos", el chat muestra una tarjeta con tu **ánimo** (y tu nota, si quieres) tal como lo subiste.
- **Efecto del registro:** 4 emojis opcionales (✨ Limpio, 💧 Gotas, 💦 Manchó, 🌊 Desastre). Se ven en el historial, en las estadísticas y, si quieres, en la tarjeta del chat.
- **Eventos en chats:** el botón ✨ junto al cuadro de mensaje lanza un evento. Solo hay uno activo por chat, con cuenta atrás y un mensaje resumen al terminar:
  - ⏱️ **Reto relámpago:** todos tienen 15/30/60 min para subir un registro.
  - 🗳️ **Encuesta:** pregunta con 2-4 opciones.
  - 😄 **Pulso:** cada uno marca su ánimo.
  - 🎯 **Meta de grupo:** entre todos alcanzáis un nº de registros.
  - 🎲 **Duelo de dados:** todos lanzan; gana quien saque más (+3 rollos).
  - 🎡 **Ruleta de rollos:** cada uno gira una vez y gana de 1 a 5 rollos.
  - 🔮 **Predicción:** cara o cruz; al terminar se lanza la moneda y quien acierta gana +4.
  - 🚦 **Semáforo:** proponéis un plan y cada uno responde 🟢 🟡 🔴.

  Los rollos que se ganan en eventos tienen un tope de **14 al día**.
- **Rollos de papel 🧻 y Tienda:** nueva pestaña en la barra inferior con tu saldo (también visible en la cabecera). Se ganan con:
  - Un registro al día: +3 (y +1 por cada 7 días de racha, hasta +3 extra).
  - Hablar al día con un amigo (+2) o en un grupo (+2).
  - Cada logro nuevo: +10.
  - Eventos de chat: reto superado +4, meta +2, voto +2, pulso +2 y +3 si el evento se completa.

  **La tienda se renueva cada día:** en cada apartado se ofrecen exactamente 6 artículos distintos (igual para todos ese día), con cuenta atrás y un punto rojo en el icono de Juegos y en «Tienda» cuando hay novedades. Lo que compras es tuyo para siempre y se equipa desde el Perfil.

  Se canjean por **iconos de perfil**, **fondos de pantalla** (cada uno con versión de día y de noche), **color de nombre** (con oro y arcoíris animados) **marcos animados** y **burbujas de mensaje** (el estilo de tus mensajes en los chats). Al canjear, se equipa al momento y puedes cambiar cuando quieras.
- **Duelos ⚔️:** seis minijuegos rápidos, **solos contra el robot 🤖 o en línea 🌐: cada jugador juega desde su propio móvil**:
  - 🏒 **Air hockey:** primero en marcar 5 goles (la pala va un poco por encima del dedo para verla).
  - 🏎️ **Carrera de coches:** esquiva barriles, coge rayos ⚡ para ir más rápido; toca izquierda o derecha.
  - ⚡ **Reflejos:** toca en cuanto se ponga verde, pero hay trampas (el color amarillo engaña). Gana quien lleve 2 rondas.
  - 🔴 **Conecta 4:** el robot piensa varias jugadas por delante; hay 20 s por turno.
  - ✌️ **Piedra, papel o tijera:** al mejor de 3.
  - 🪢 **Tira y afloja:** toca lo más rápido que puedas.

  Con sonido y vibración (si el móvil la admite).

  **Partidas en línea:** pulsa 🌐 En línea en un juego. Uno pulsa *Crear partida* y recibe un código de 5 letras + 3 números; el otro pulsa *Unirme con un código* y lo escribe: la partida empieza sola (necesita el servidor, ver arriba). Con amigos conectados es aún más fácil: botón 🎮 en su fila. Va directo de móvil a móvil (WebRTC); usa un servidor STUN público de Google solo para encontrar el camino. En redes muy restrictivas (algunas wifis de empresa o datos móviles) puede no conectar, porque no hay servidor TURN.

  Ganar da **+6 rollos**. **Máximo 50 rollos al día** por duelos.

  **Coste:** tienes **2 partidas gratis al día**; después cada partida cuesta **3 rollos** (la revancha también cuenta como partida).

  **Torneos 🏆:** crea un torneo con 1 a 3 amigos. Cada jugador pone 5, 10, 20 o 50 rollos en el bote. Son 3 rondas (air hockey, carrera y reflejos); tus amigos los controla el robot y los demás se enfrentan entre sí de forma simulada. Quien gane más rondas se lleva el bote; si hay empate se reparte. Abandonar una ronda cuenta como derrota. La ganancia extra del torneo cuenta para el límite de 50 rollos al día. Las partidas del torneo no cuestan rollos.
- **Pase de temporada 🎃 (Inicio):** barra de experiencia fija arriba de todas las pantallas (nivel y XP hacia el siguiente; tócala para abrir el pase). Con el premium activo, el icono y la barra se vuelven dorados. temporada **Noche Encantada** (hasta el 1 de diciembre de 2026), **20 niveles** con dos vías: **Gratis** y **Premium** (se desbloquea con **150 rollos**). Subes de nivel con XP (6 XP por cada rollo que ganas por registros, chats, logros, duelos y eventos; 100 XP por nivel). Cada nivel da un premio distinto: rollos u objetos **exclusivos** (iconos, fondos, colores de nombre, marcos y burbujas de mensaje) que no se venden en la tienda y se equipan desde el inventario.
- **Tutorial guiado:** la primera vez que entras te lleva por todas las secciones y te regala 10 rollos al terminar. Se puede repetir desde Ajustes. Quien ya tenía datos de antes no lo ve solo.
- **Cuenta con Google:** inicio de sesión opcional (ver «Iniciar sesión con Google» más abajo). Se puede continuar sin cuenta.
- **Inventario (Perfil):** carpeta plegable con todo lo que has canjeado (iconos, fondos, color de nombre y marcos, incluidos los de logros) para equiparlo desde el perfil. "Logros completados" y "Por completar" también se pueden abrir y cerrar.
- **Ajustes de apariencia:** tema **Automático / Día / Noche** e **idioma Español / English**. La traducción vive en `i18n.js`; lo que escribes tú (nombres, notas, mensajes) no se traduce.
- **Privacidad:** los datos se guardan solo en `localStorage` de este navegador. Ya no hay PIN.

## Logros y marcos

| Logro | Cómo se consigue | Marco |
|---|---|---|
| Primer paso | 1 registro | Menta |
| En llamas | racha de 3 días | Llama |
| Imparable | racha de 7 días | Fuego (animado) |
| Leyenda | racha de 30 días | Oro (animado) |
| Constante | 10 registros | Océano |
| Veterano | 50 registros | Aurora (animado) |
| Con palabras | 5 registros con nota | Atardecer |
| Primer amigo | 1 amigo | Rosa |
| En grupo | crear un grupo | Violeta |
| Cara visible | poner foto de perfil | Cristal (animado) |

## Cómo abrirla

1. Descomprime la carpeta.
2. Doble clic en `index.html`, o abre la carpeta en VS Code y usa **Live Server** (clic derecho en `index.html` > Open with Live Server).
3. Para verla como en el móvil desde el ordenador: `F12` y luego `Ctrl+Shift+M` (modo móvil).

## Qué se comparte con los chats

Solo lo que tú decides al registrar: el aviso, tu ánimo y, si lo dejas activado, tu nota. Puedes desactivar el aviso en cada registro o por chat (toca el nombre del chat).

## Servidor (amigos, solicitudes, chat y retos)

La carpeta `server/` es un servidor propio (Node.js + WebSocket, un solo archivo) pensado para la máquina gratis "Always Free" de Oracle. **Guía paso a paso en `server/DEPLOY.md`** (un script instala todo con HTTPS).

Con servidor conectado (Ajustes → Servidor → "Conectado ✅"):

- Cada código de amigo es una cuenta (sin contraseña: cada móvil guarda una clave secreta aleatoria).
- **Solicitudes** de amistad enviadas, recibidas, aceptadas, rechazadas y canceladas entre móviles reales.
- **Chat directo y de grupo**; los mensajes para alguien desconectado se guardan y llegan al volver. Sin conexión, tus mensajes quedan con ⏳ y salen solos al reconectar.
- **Registros compartidos** con los chats que elijas.
- **Presencia** 🟢 y botón 🎮 para **retar a un amigo conectado**: elige juego, le llega la invitación y, si acepta, la partida empieza sola.
- **Salas con código corto** (5 letras + 3 números, por ejemplo `KQMTR482`) para duelos con quien no es amigo. El servidor solo reenvía el "apretón de manos"; la partida va directa de móvil a móvil (WebRTC). Si el servidor no está, sigue existiendo la opción de códigos largos sin servidor.

Sin servidor (por ejemplo abriendo `index.html` suelto) la app funciona en local y aparece el **Modo prueba** en Ajustes para simular amigos, solicitudes y eventos.

Cómo encuentra la app el servidor: 1) `serverUrl` en `config.js`, 2) la dirección guardada en Ajustes, 3) el mismo sitio desde el que se abrió la app (si es el servidor de `server/`).

- **Eventos del chat** (reto relámpago, encuesta, pulso, meta, dado, ruleta, predicción, semáforo) entre móviles: quien lo lanza lo crea en el chat de todos y cada participación (voto, tirada, giro, elección) llega a los demás. Cada móvil da por terminado el evento y reparte sus propios rollos. Si te quedas sin conexión justo al participar, esa participación no se reenvía.

Aún local (no pasa por el servidor): los rollos, la tienda y los duelos de torneo. Para evitar trampas con los rollos habría que validarlos en el servidor.

Seguridad y privacidad: los mensajes se guardan en el servidor sin cifrado de extremo a extremo; hay límites de ritmo, tamaño, amigos y grupos, pero no hay moderación ni bloqueo. Prueba automática del servidor: ver `server/` (arranca con `npm install && npm start`; variables `PORT`, `DATA_FILE`, `ALLOWED_ORIGINS`).

## Acabado y accesibilidad

- **Inicio** pone el registro de hoy en primer plano: botón "Añadir registro de hoy" dentro de la racha (cambia a "✅ Hoy ya registraste"), y el pase de temporada queda debajo del resumen.
- **Barra inferior** con el nombre de cada apartado (Inicio, Juegos, Amigos, Perfil).
- Zonas táctiles de al menos 44 px, ningún texto por debajo de 11 px, foco visible con teclado, texto secundario con más contraste y nombres accesibles en los ánimos y en los días del calendario.
- El aviso de Amigos explica cómo conectar el servidor y desaparece cuando está conectado. El **Modo prueba** de Ajustes está plegado y se oculta cuando hay servidor.

## Estructura

- `index.html`: bienvenida, pantallas, barra inferior y hojas.
- `styles.css`: Liquid Glass, tema día/noche, burbujas, marcos y animaciones.
- `i18n.js`: traducción al inglés (frases, plantillas y glosario).
- `app.js`: estado, racha, logros, perfil, códigos, solicitudes, chats, tienda, pase, tutorial, inicio de sesión y la bienvenida.
- `duels.js`: los seis minijuegos, el sonido y la conexión en línea (WebRTC, salas de código corto).
- `srv.js`: conexión de la app con el servidor.
- `server/`: servidor (`server.js`), instalador (`setup.sh`) y guía (`DEPLOY.md`).
- `config.js`: tu ID de cliente de Google.

## Hábitos: motivos reales para volver (v14)

Cinco funciones, todas opcionales (Ajustes → Hábitos), sin cuentas atrás, sin culpa y sin comparar con otros. Los datos personales no salen del móvil.

| Función | Cómo funciona | Tope |
|---|---|---|
| Meta del día | Un reto pequeño y distinto cada día (unos se cumplen solos con tus datos, otros los marcas tú). Aparece en Inicio. | +2 🧻 una vez al día |
| Protector de racha | Se gana con cada 7 días de racha. Perdona **un** día suelto si ya llevabas ≥3 días. | Máx. 2 guardados y 2 usos al mes |
| Resumen semanal | Domingo (semana en curso) y lunes (semana anterior): días con registro, ánimo medio, mejor día y comparación con la semana previa. Solo tus datos. | Sin recompensa |
| Recordatorio diario | Una sola notificación a la hora elegida, solo si aún no has registrado hoy. El permiso se pide solo al activarlo. | 1 al día |
| Misiones semanales | Registrar 4 días (+5), escribir 2 notas (+3), cumplir 3 metas del día (+2). Más 2 logros nuevos (Con rumbo, Semanas redondas). | Máx. 10 🧻 por semana |

Notas honestas:
- El recordatorio es una notificación del navegador: solo salta con la app abierta (o en segundo plano). Sin servidor de notificaciones push no puede avisar con el navegador cerrado.
- Los datos nuevos viven en `retain` y `settings.retain` dentro de `jerkon.v3`; los estados antiguos se rellenan solos al cargar.
- Retos con amigos (racha compartida) quedan fuera: requieren ampliar el protocolo del servidor.
