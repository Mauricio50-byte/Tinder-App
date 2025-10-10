package io.ionic.starter.plugins.matchview;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
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
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

@CapacitorPlugin(name = "MatchView")
public class MatchViewPlugin extends Plugin {

    @PluginMethod
    public void cargarSiguientePerfil(PluginCall call) {
        String uidActual = call.getString("uidActual");
        String databaseURL = call.getString("databaseURL");
        String idToken = call.getString("idToken");
        if (uidActual == null || databaseURL == null || idToken == null) {
            call.reject("Parámetros insuficientes: uidActual, databaseURL e idToken son requeridos");
            return;
        }
        try {
            // Leer matches del usuario actual para filtrar repetidos
            JSONObject matches = getJson(databaseURL + "matches/" + uidActual + ".json?auth=" + idToken);
            Set<String> yaVistos = new HashSet<>();
            if (matches != null) {
                for (Iterator<String> it = matches.keys(); it.hasNext(); ) {
                    yaVistos.add(it.next());
                }
            }

            // Leer usuarios
            JSONObject usuarios = getJson(databaseURL + "usuarios.json?auth=" + idToken);
            if (usuarios == null || usuarios.length() == 0) {
                call.resolve(new JSObject());
                return;
            }
            for (Iterator<String> it = usuarios.keys(); it.hasNext(); ) {
                String uid = it.next();
                if (uid.equals(uidActual)) continue;
                if (yaVistos.contains(uid)) continue;
                JSONObject u = usuarios.optJSONObject(uid);
                if (u == null) continue;
                JSObject usuario = new JSObject();
                usuario.put("id", uid);
                usuario.put("nombre", u.optString("nombre", ""));
                usuario.put("edad", u.optInt("edad", 0));
                usuario.put("email", u.optString("email", ""));
                usuario.put("fotoUrl", u.optString("fotoUrl", ""));
                usuario.put("bio", u.optString("bio", ""));
                JSObject res = new JSObject();
                res.put("usuario", usuario);
                call.resolve(res);
                return;
            }
            // Si no hay candidato
            call.resolve(new JSObject());
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void marcarAceptado(PluginCall call) {
        cambiarEstado(call, "aceptado");
    }

    @PluginMethod
    public void marcarRechazado(PluginCall call) {
        cambiarEstado(call, "rechazado");
    }

    private void cambiarEstado(PluginCall call, String estado) {
        String uidActual = call.getString("uidActual");
        String idUsuario = call.getString("idUsuario");
        String databaseURL = call.getString("databaseURL");
        String idToken = call.getString("idToken");
        if (uidActual == null || idUsuario == null || databaseURL == null || idToken == null) {
            call.reject("Parámetros insuficientes: uidActual, idUsuario, databaseURL e idToken son requeridos");
            return;
        }
        try {
            String ruta = databaseURL + "matches/" + uidActual + "/" + idUsuario + ".json?auth=" + idToken;
            String body = "{\"estado\":\"" + estado + "\",\"timestamp\":" + System.currentTimeMillis() + "}";
            httpPut(ruta, body);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
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
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
        br.close();
        conn.disconnect();
        String res = sb.toString();
        if (res == null || res.equals("null") || res.isEmpty()) return null;
        return new JSONObject(res);
    }

    private void httpPut(String urlStr, String body) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("PUT");
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setDoOutput(true);
        byte[] out = body.getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(out);
        }
        int code = conn.getResponseCode();
        conn.disconnect();
        if (code < 200 || code >= 300) {
            throw new Exception("Error HTTP " + code);
        }
    }
}