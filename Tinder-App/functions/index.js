const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Dispara cuando se crea un nuevo mensaje en RTDB: /mensajes/{convId}/{msgId}
exports.onMensajeCreado = functions.database.ref('/mensajes/{convId}/{msgId}')
  .onCreate(async (snap, context) => {
    const data = snap.val() || {};
    const { remitenteId, destinatarioId, texto } = data;
    const { convId, msgId } = context.params || {};
    console.log('onMensajeCreado:new', { convId, msgId, remitenteId, destinatarioId });

    // Ignorar metadatos u objetos vacíos
    if (!destinatarioId || !texto) return null;
    if (msgId === 'meta') {
      console.log('onMensajeCreado:skip meta', { convId, msgId });
      return null;
    }

    try {
      const db = admin.database();
      const tokenSnap = await db.ref(`usuarios/${destinatarioId}/pushToken`).get();
      const token = tokenSnap.val();
      if (!token) {
        console.log('onMensajeCreado:noToken', { destinatarioId });
        return null;
      }

      // Construir payload con notification + data para deep link
      const payload = {
        notification: {
          title: 'Nuevo mensaje',
          body: String(texto).slice(0, 120),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'mensajes',
          },
        },
        data: {
          destinatarioId: String(destinatarioId),
          convId: String(convId || ''),
          uidA: String(remitenteId || ''),
          uidB: String(destinatarioId || ''),
        },
      };

      console.log('onMensajeCreado:sendFCM:start', { destinatarioId, convId });
      const messageId = await admin.messaging().send({ token, ...payload });
      console.log('onMensajeCreado:sendFCM:ok', { messageId, destinatarioId, convId });
      return null;
    } catch (e) {
      console.error('Error enviando FCM', e);
      return null;
    }
  });