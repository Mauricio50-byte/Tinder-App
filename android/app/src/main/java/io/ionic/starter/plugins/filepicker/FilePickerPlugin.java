package io.ionic.starter.plugins.filepicker;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

import android.util.Base64;

@CapacitorPlugin(name = "FilePicker")
public class FilePickerPlugin extends Plugin {

    private static final int REQUEST_IMAGE_PICK = 1001;
    private static final int REQUEST_FILE_PICK = 1002;

    @PluginMethod
    public void pickImage(PluginCall call) {
        saveCall(call);
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, REQUEST_IMAGE_PICK);
    }

    @PluginMethod
    public void pickFile(PluginCall call) {
        saveCall(call);
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(call, intent, REQUEST_FILE_PICK);
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_IMAGE_PICK && requestCode != REQUEST_FILE_PICK) {
            return;
        }

        PluginCall saved = getSavedCall();
        if (saved == null) {
            return;
        }

        if (resultCode != Activity.RESULT_OK || data == null) {
            saved.reject("Image picking cancelled or no data");
            return;
        }

        try {
            Uri uri = data.getData();
            if (uri == null) {
                saved.reject("No image uri returned");
                return;
            }

            String mimeType = getContext().getContentResolver().getType(uri);
            if (mimeType == null) {
                // Try to guess from extension
                String ext = MimeTypeMap.getFileExtensionFromUrl(uri.toString());
                mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                if (mimeType == null) mimeType = "image/*";
            }

            InputStream inputStream = getContext().getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                saved.reject("Unable to open image stream");
                return;
            }
            byte[] bytes = readAllBytes(inputStream);
            String base64 = Base64.encodeToString(bytes, Base64.NO_WRAP);

            JSObject ret = new JSObject();
            ret.put("base64", base64);
            ret.put("mimeType", mimeType);
            saved.resolve(ret);
        } catch (IOException e) {
            saved.reject("Error reading image: " + e.getMessage());
        }
    }

    private byte[] readAllBytes(InputStream inputStream) throws IOException {
        try (InputStream is = inputStream; ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            int nRead;
            byte[] data = new byte[4096];
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            return buffer.toByteArray();
        }
    }
}