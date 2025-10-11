# Tinder App (Ionic + Angular) — Guía y Flujo


## Flujo completo para el usuario
- Inicio y acceso:
  - Abre la app y elige iniciar sesión o registrarse.
  - Tras autenticarse, la app crea o recupera su perfil en `usuarios/{uid}`.
- Perfil del usuario:
  - Completa/edita nombre, edad, foto y biografía.
  - Guarda; la información se persiste en Realtime Database.
- Explorar candidatos:
  - Accede a la sección de posibles matches.
  - Marca "Me gusta" o "No me interesa"; se registran en `likes/{uidActual}/{uidDestino}` o `passes/{uidActual}/{uidDestino}`.
  - Los usuarios ya votados no se repiten.
- Coincidencia (Match):
  - Si ambos marcaron "Me gusta", se genera un match.
  - Aparece aviso y el match queda disponible en el chat.
- Conversaciones (Chat):
  - Selecciona un match para conversar.
  - La app carga historial y se suscribe a nuevos mensajes.
  - Notifica localmente cuando llega un mensaje entrante.
- Privacidad y seguridad:
  - Reglas de RTDB restringen lectura/escritura a rutas permitidas.
  - Sólo se consulta lo necesario para confirmar reciprocidad del match.
- Estados y robustez:
  - Para perfiles faltantes, la app usa valores por defecto y mantiene la conversación por UID.
  - Evita notificaciones duplicadas de históricos.
- Salir y volver:
  - Puede volver al inicio o cerrar sesión; la sesión puede persistir según proveedor.
