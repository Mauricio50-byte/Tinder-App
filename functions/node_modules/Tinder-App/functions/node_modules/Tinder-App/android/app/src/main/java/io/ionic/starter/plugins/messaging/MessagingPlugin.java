package io.ionic.starter.plugins.messaging;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "Messaging")
public class MessagingPlugin extends Plugin {

    private final Map<String, Suscripcion> suscripciones = new HashMap<>();
    private static final String CANAL_MENSAJES = "mensajes";

    @PluginMethod
    public void enviarMensaje(PluginCall call) {
        String remitenteId = call.getString("remitenteId");
        String destinatarioId = call.getString("destinatarioId");
        String texto = call.getString("texto");
        String databaseURL = call.getString("databaseURL");
        String idToken = call.getString("idToken");
        if (remitenteId == null || destinatarioId == null || texto == null || databaseURL == null || idToken == null) {
            call.reject("Parámetros insuficientes: remitenteId, destinatarioId, texto, databaseURL e idToken son requeridos");
            return;
        }
        try {
            String convId = idConversacion(remitenteId, destinatarioId);
            String ruta = databaseURL + "mensajes/" + convId + ".json?auth=" + idToken;
            JSObject mensaje = new JSObject();
            mensaje.put("remitenteId", remitenteId);
            mensaje.put("destinatarioId", destinatarioId);
            mensaje.put("texto", texto);
            mensaje.put("timestamp", System.currentTimeMillis());
            httpPost(ruta, mensaje.toString());
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void suscribirMensajes(PluginCall call) {
        String uidA = call.getString("uidA");
        String uidB = call.getString("uidB");
        String databaseURL = call.getString("databaseURL");
        String idToken = call.getString("idToken");
        if (uidA == null || uidB == null || databaseURL == null || idToken == null) {
            call.reject("Parámetros insuficientes: uidA, uidB, databaseURL e idToken son requeridos");
            return;
        }
        String convId = idConversacion(uidA, uidB);
        try {
            if (!suscripciones.containsKey(convId)) {
                Suscripcion s = new Suscripcion(databaseURL, idToken, convId);
                s.comenzar();
                suscripciones.put(convId, s);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void detenerSuscripcion(PluginCall call) {
        String uidA = call.getString("uidA");
        String uidB = call.getString("uidB");
        if (uidA == null || uidB == null) { call.resolve(); return; }
        String convId = idConversacion(uidA, uidB);
        Suscripcion s = suscripciones.remove(convId);
        if (s != null) s.detener();
        call.resolve();
    }

    private String idConversacion(String a, String b) {
        String x = a.compareTo(b) <= 0 ? a : b;
        String y = a.compareTo(b) <= 0 ? b : a;
        return x + "_" + y;
    }

    private void httpPost(String urlStr, String body) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setDoOutput(true);
        byte[] out = body.getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) { os.write(out); }
        int code = conn.getResponseCode();
        conn.disconnect();
        if (code < 200 || code >= 300) throw new Exception("Error HTTP " + code);
    }

    private JSONObject getJson(String urlStr) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setDoInput(true);
        conn.connect();
        int code = conn.getResponseCode();
        InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
        BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line; while ((line = br.readLine()) != null) sb.append(line);
        br.close(); conn.disconnect();
        String res = sb.toString();
        if (res == null || res.equals("null") || res.isEmpty()) return null;
        return new JSONObject(res);
    }

    private void crearCanalNotificaciones() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm.getNotificationChannel(CANAL_MENSAJES) == null) {
                NotificationChannel ch = new NotificationChannel(CANAL_MENSAJES, "Mensajes", NotificationManager.IMPORTANCE_DEFAULT);
                nm.createNotificationChannel(ch);
            }
        }
    }

    private void notificarMensaje(String titulo, String texto) {
        crearCanalNotificaciones();
        boolean foreground;
        try { foreground = getBridge().getActivity().hasWindowFocus(); } catch (Exception e) { foreground = true; }
        if (foreground) return; // evitar spam en foreground
        NotificationCompat.Builder b = new NotificationCompat.Builder(getContext(), CANAL_MENSAJES)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(titulo)
                .setContentText(texto)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify((int) System.currentTimeMillis(), b.build());
    }

    private class Suscripcion {
        final String databaseURL;
        final String idToken;
        final String convId;
        final ScheduledExecutorService exec = Executors.newSingleThreadScheduledExecutor();
        final Set<String> keysVistos = new HashSet<>();

        Suscripcion(String databaseURL, String idToken, String convId) {
            this.databaseURL = databaseURL; this.idToken = idToken; this.convId = convId;
        }

        void comenzar() {
            exec.scheduleAtFixedRate(() -> {
                try {
                    JSONObject mensajes = getJson(databaseURL + "mensajes/" + convId + ".json?auth=" + idToken);
                    if (mensajes == null) return;
                    for (Iterator<String> it = mensajes.keys(); it.hasNext(); ) {
                        String key = it.next();
                        if (keysVistos.contains(key)) continue;
                        keysVistos.add(key);
                        JSONObject m = mensajes.optJSONObject(key);
                        if (m == null) continue;
                        JSObject payload = new JSObject();
                        payload.put("id", key);
                        payload.put("remitenteId", m.optString("remitenteId", ""));
                        payload.put("destinatarioId", m.optString("destinatarioId", ""));
                        payload.put("texto", m.optString("texto", ""));
                        payload.put("timestamp", m.optLong("timestamp", System.currentTimeMillis()));
                        notifyListeners("mensaje", payload);
                        notificarMensaje("Nuevo mensaje", payload.getString("texto"));
                    }
                } catch (Exception ignored) {}
            }, 0, 2, TimeUnit.SECONDS);
        }

        void detener() {
            exec.shutdownNow();
        }
    }
}