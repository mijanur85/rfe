package com.neogallery.app;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Size;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * NOTE: this queries MediaStore.Images.Media and MediaStore.Video.Media
 * SEPARATELY (the type-specific collections) rather than the generic
 * MediaStore.Files collection. Per Android's own docs, on API 29+ the
 * generic Files collection only reliably returns items the CALLING APP
 * itself created -- it does not reliably show photos/videos created by
 * the camera, WhatsApp, or other apps, even with storage permission
 * granted. Images.Media / Video.Media do not have that restriction.
 * https://developer.android.com/training/data-storage/shared/media
 */
@CapacitorPlugin(
    name = "MediaStorePlugin",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO },
            alias = "media"
        ),
        @Permission(
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE },
            alias = "storage"
        )
    }
)
public class MediaStorePlugin extends Plugin {

    // Registered once when the plugin loads (must happen before the Activity
    // reaches STARTED) so that later calls can launch the system's delete
    // confirmation dialog and receive the result.
    private ActivityResultLauncher<IntentSenderRequest> deleteLauncher;
    private String pendingDeleteCallId;

    // Same pattern as deleteLauncher above, but for MediaStore.createWriteRequest --
    // the API 30+ system dialog that grants this app temporary write access to
    // rename/move MediaStore items it doesn't itself own. This is the same
    // one-time consent prompt Google Photos shows before moving or renaming a
    // file it didn't create; it's the modern, non-deprecated replacement for
    // catching RecoverableSecurityException on every write attempt.
    private ActivityResultLauncher<IntentSenderRequest> writeLauncher;
    private Runnable pendingWriteAction;
    private PluginCall pendingWriteCall;

    @Override
    public void load() {
        super.load();
        deleteLauncher = bridge.registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                if (pendingDeleteCallId == null) return;
                PluginCall savedCall = bridge.getSavedCall(pendingDeleteCallId);
                pendingDeleteCallId = null;
                if (savedCall == null) return;

                boolean success = result.getResultCode() == Activity.RESULT_OK;
                JSObject ret = new JSObject();
                ret.put("success", success);
                savedCall.resolve(ret);
                bridge.releaseCall(savedCall);
            }
        );

        writeLauncher = bridge.registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                boolean granted = result.getResultCode() == Activity.RESULT_OK;
                PluginCall call = pendingWriteCall;
                Runnable action = pendingWriteAction;
                pendingWriteCall = null;
                pendingWriteAction = null;
                if (!granted) {
                    if (call != null) call.reject("User denied write permission");
                    return;
                }
                if (action != null) action.run();
            }
        );
    }

    // Ensures the app is allowed to modify (rename/move) MediaStore items it
    // doesn't itself own, showing the system consent dialog on API 30+ when
    // needed. On API < 30 there's no such dialog -- an app holding storage
    // permission can already write directly, so onGranted runs immediately.
    private void ensureWriteAccess(List<Uri> uris, PluginCall call, Runnable onGranted) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                PendingIntent pi = MediaStore.createWriteRequest(getContext().getContentResolver(), uris);
                call.setKeepAlive(true);
                pendingWriteCall = call;
                pendingWriteAction = onGranted;
                writeLauncher.launch(new IntentSenderRequest.Builder(pi.getIntentSender()).build());
            } catch (Exception e) {
                call.reject("Error requesting write access: " + e.getMessage());
            }
        } else {
            onGranted.run();
        }
    }

    // Deletes the given items from the device's real storage (not just from
    // the app's own list). On Android 11+ this shows the system's own
    // one-time confirmation dialog (MediaStore.createDeleteRequest) -- the
    // same dialog Google Photos and other gallery apps use -- and the files
    // are only removed if the user approves it. On Android 10 and below,
    // apps holding storage permission can delete directly without a prompt.
    @PluginMethod
    public void deleteMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }

        JSArray itemsArr = call.getArray("items");
        if (itemsArr == null || itemsArr.length() == 0) {
            call.reject("No items specified");
            return;
        }

        try {
            List<Uri> uris = new ArrayList<>();
            for (int i = 0; i < itemsArr.length(); i++) {
                JSONObject obj = itemsArr.getJSONObject(i);
                long id = obj.getLong("mediaId");
                boolean isVideo = obj.optBoolean("isVideo", false);
                Uri base = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                uris.add(ContentUris.withAppendedId(base, id));
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                PendingIntent pi = MediaStore.createDeleteRequest(getContext().getContentResolver(), uris);
                call.setKeepAlive(true);
                bridge.saveCall(call);
                pendingDeleteCallId = call.getCallbackId();
                deleteLauncher.launch(new IntentSenderRequest.Builder(pi.getIntentSender()).build());
            } else {
                int deletedCount = 0;
                for (Uri uri : uris) {
                    try {
                        deletedCount += getContext().getContentResolver().delete(uri, null, null);
                    } catch (Exception ignored) {
                    }
                }
                JSObject ret = new JSObject();
                ret.put("success", deletedCount > 0);
                ret.put("deletedCount", deletedCount);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Error deleting media: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // TRASH / UNTRASH -- real Recycle Bin support, same mechanism Google
    // Photos uses. On API 30+ this shows the system's own one-time "Move
    // to trash?" consent dialog (MediaStore.createTrashRequest) and, once
    // approved, the items are flagged IS_TRASHED at the MediaStore level:
    // they disappear from this app's normal queries, from every OTHER
    // gallery app, and from the system Photos picker -- exactly like being
    // removed from "main storage" -- while the real file is NOT deleted
    // and can be restored (trashed=false) or queried back by us later. On
    // API 29 the same IS_TRASHED column exists but there is no consent
    // dialog yet, so we set it directly. Below API 29 there is no trash
    // concept at all; the caller falls back to app-level-only soft delete.
    // ------------------------------------------------------------------
    @PluginMethod
    public void trashMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }
        JSArray itemsArr = call.getArray("items");
        boolean trashed = Boolean.TRUE.equals(call.getBoolean("trashed", true));
        if (itemsArr == null || itemsArr.length() == 0) {
            call.reject("No items specified");
            return;
        }

        try {
            List<Uri> uris = new ArrayList<>();
            for (int i = 0; i < itemsArr.length(); i++) {
                JSONObject obj = itemsArr.getJSONObject(i);
                long id = obj.getLong("mediaId");
                boolean isVideo = obj.optBoolean("isVideo", false);
                Uri base = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                uris.add(ContentUris.withAppendedId(base, id));
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                PendingIntent pi = MediaStore.createTrashRequest(getContext().getContentResolver(), uris, trashed);
                call.setKeepAlive(true);
                bridge.saveCall(call);
                pendingDeleteCallId = call.getCallbackId();
                deleteLauncher.launch(new IntentSenderRequest.Builder(pi.getIntentSender()).build());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                int updated = 0;
                for (Uri uri : uris) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.IS_TRASHED, trashed ? 1 : 0);
                        int rows = getContext().getContentResolver().update(uri, cv, null, null);
                        if (rows > 0) updated++;
                    } catch (Exception ignored) {
                    }
                }
                JSObject ret = new JSObject();
                ret.put("success", updated > 0);
                ret.put("updatedCount", updated);
                call.resolve(ret);
            } else {
                // No OS-level trash below API 29 -- report unsupported so the
                // JS layer knows to keep this as an app-only (local) soft
                // delete instead of pretending the real file moved.
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("updatedCount", 0);
                ret.put("unsupported", true);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Error trashing media: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // SAVE EDITED IMAGE -- writes the edited-image bytes as a brand-new
    // real file in MediaStore (Pictures/<album>/), instead of the edited
    // result only living as a base64 string in the app's own JS state.
    // This is what other gallery apps (and the system Files app / other
    // gallery apps) then see as a normal photo.
    // ------------------------------------------------------------------
    @PluginMethod
    public void saveEditedImage(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }
        String dataUrl = call.getString("dataUrl");
        String displayName = call.getString("displayName", "Edited_" + System.currentTimeMillis() + ".jpg");
        String albumName = call.getString("albumName", "Neo Gallery Edits");
        if (dataUrl == null || dataUrl.isEmpty()) {
            call.reject("dataUrl required");
            return;
        }
        try {
            String base64 = dataUrl.contains(",") ? dataUrl.substring(dataUrl.indexOf(',') + 1) : dataUrl;
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);

            ContentValues cv = new ContentValues();
            cv.put(MediaStore.MediaColumns.DISPLAY_NAME, displayName);
            cv.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
            cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + albumName + "/");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
            }

            Uri uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) {
                call.reject("Failed to create MediaStore entry");
                return;
            }

            try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
                if (out == null) {
                    call.reject("Failed to open output stream for new file");
                    return;
                }
                out.write(bytes);
                out.flush();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, done, null, null);
            }

            long newId = ContentUris.parseId(uri);
            String path = getOrCreateThumbnailPath(newId, uri, false); // warms the thumb cache too
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("mediaId", newId);
            ret.put("uri", uri.toString());
            ret.put("thumbnailPath", path);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error saving edited image: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // RENAME -- renames the real MediaStore entry (and therefore the real
    // on-disk file), requesting write access first if this app isn't the
    // one that originally created the file.
    // ------------------------------------------------------------------
    @PluginMethod
    public void renameMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }
        String newName = call.getString("newName");
        if (newName == null || newName.trim().isEmpty()) {
            call.reject("New name required");
            return;
        }
        try {
            long id = call.getData().getLong("mediaId");
            boolean isVideo = call.getBoolean("isVideo", false);
            Uri base = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            Uri uri = ContentUris.withAppendedId(base, id);
            List<Uri> uris = Collections.singletonList(uri);

            ensureWriteAccess(uris, call, () -> {
                try {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, newName.trim());
                    int rows = getContext().getContentResolver().update(uri, cv, null, null);
                    JSObject ret = new JSObject();
                    ret.put("success", rows > 0);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Rename failed: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            call.reject("Error renaming media: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // MOVE -- updates RELATIVE_PATH on the real MediaStore entries.
    // MediaProvider physically moves the underlying file on disk when this
    // changes (this is the officially supported scoped-storage way to move
    // media, not a client-side copy+delete), creating the destination
    // folder automatically if it doesn't exist yet.
    // ------------------------------------------------------------------
    @PluginMethod
    public void moveMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }
        JSArray itemsArr = call.getArray("items");
        String targetAlbum = call.getString("targetAlbumName");
        if (itemsArr == null || itemsArr.length() == 0 || targetAlbum == null || targetAlbum.trim().isEmpty()) {
            call.reject("items and targetAlbumName required");
            return;
        }
        try {
            List<Uri> uris = new ArrayList<>();
            List<boolean[]> videoFlags = new ArrayList<>();
            for (int i = 0; i < itemsArr.length(); i++) {
                JSONObject obj = itemsArr.getJSONObject(i);
                long id = obj.getLong("mediaId");
                boolean isVideo = obj.optBoolean("isVideo", false);
                Uri base = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                uris.add(ContentUris.withAppendedId(base, id));
                videoFlags.add(new boolean[] { isVideo });
            }

            ensureWriteAccess(uris, call, () -> {
                int moved = 0;
                for (int i = 0; i < uris.size(); i++) {
                    Uri u = uris.get(i);
                    boolean isVideo = videoFlags.get(i)[0];
                    String basePath = isVideo ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES;
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, basePath + "/" + targetAlbum.trim() + "/");
                        int rows = getContext().getContentResolver().update(u, cv, null, null);
                        if (rows > 0) moved++;
                    } catch (Exception ignored) {
                    }
                }
                JSObject ret = new JSObject();
                ret.put("success", moved > 0);
                ret.put("movedCount", moved);
                call.resolve(ret);
            });
        } catch (Exception e) {
            call.reject("Error moving media: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // COPY -- inserts a brand-new MediaStore entry under the target album
    // and streams the source file's bytes into it. Creating a new entry
    // never needs the write-request consent dialog (only modifying an
    // existing item you don't own does), so this never prompts.
    // ------------------------------------------------------------------
    @PluginMethod
    public void copyMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }
        JSArray itemsArr = call.getArray("items");
        String targetAlbum = call.getString("targetAlbumName");
        if (itemsArr == null || itemsArr.length() == 0 || targetAlbum == null || targetAlbum.trim().isEmpty()) {
            call.reject("items and targetAlbumName required");
            return;
        }
        try {
            JSArray resultsArr = new JSArray();
            for (int i = 0; i < itemsArr.length(); i++) {
                JSONObject obj = itemsArr.getJSONObject(i);
                long id = obj.getLong("mediaId");
                boolean isVideo = obj.optBoolean("isVideo", false);
                Uri sourceBase = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                Uri sourceUri = ContentUris.withAppendedId(sourceBase, id);

                String displayName = "Copy_" + System.currentTimeMillis() + "_" + i + (isVideo ? ".mp4" : ".jpg");
                String mimeType = isVideo ? "video/mp4" : "image/jpeg";
                String[] proj = isVideo
                    ? new String[] { MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.MIME_TYPE }
                    : new String[] { MediaStore.Images.Media.DISPLAY_NAME, MediaStore.Images.Media.MIME_TYPE };
                try (Cursor c = getContext().getContentResolver().query(sourceUri, proj, null, null, null)) {
                    if (c != null && c.moveToFirst()) {
                        String origName = c.getString(0);
                        if (origName != null && !origName.isEmpty()) displayName = "Copy_" + origName;
                        String origMime = c.getString(1);
                        if (origMime != null && !origMime.isEmpty()) mimeType = origMime;
                    }
                } catch (Exception ignored) {
                }

                String basePath = isVideo ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES;
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, displayName);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, basePath + "/" + targetAlbum.trim() + "/");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
                }
                Uri destBase = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                Uri destUri = getContext().getContentResolver().insert(destBase, cv);
                if (destUri == null) continue;

                boolean copyOk = false;
                try (InputStream in = getContext().getContentResolver().openInputStream(sourceUri);
                     OutputStream out = getContext().getContentResolver().openOutputStream(destUri)) {
                    if (in != null && out != null) {
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            out.write(buf, 0, n);
                        }
                        copyOk = true;
                    }
                } catch (Exception ignored) {
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues done = new ContentValues();
                    done.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContext().getContentResolver().update(destUri, done, null, null);
                }

                if (!copyOk) {
                    try {
                        getContext().getContentResolver().delete(destUri, null, null);
                    } catch (Exception ignored) {
                    }
                    continue;
                }

                JSObject r = new JSObject();
                r.put("originalMediaId", id);
                r.put("newMediaId", ContentUris.parseId(destUri));
                resultsArr.put(r);
            }
            JSObject ret = new JSObject();
            ret.put("success", resultsArr.length() > 0);
            ret.put("results", resultsArr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error copying media: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // CREATE ALBUM -- makes a real directory on disk under Pictures/<name>.
    // Requires "All files access" (MANAGE_EXTERNAL_STORAGE) because scoped
    // storage otherwise has no API to create an *empty* shared folder --
    // MediaStore only creates folders implicitly when a file is written
    // into them. An empty MediaStore-only "album" is exactly the
    // virtual/app-only behavior being fixed here.
    // ------------------------------------------------------------------
    @PluginMethod
    public void createAlbum(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.trim().isEmpty()) {
            call.reject("Album name required");
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("needsAllFilesPermission", true);
                call.resolve(ret);
                return;
            }
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), name.trim());
            boolean created = dir.exists() || dir.mkdirs();
            JSObject ret = new JSObject();
            ret.put("success", created);
            ret.put("path", dir.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error creating album: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkAllFilesAccess(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.R || Environment.isExternalStorageManager();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    // Opens the system's "All files access" settings screen for this app.
    // There's no runtime request dialog for MANAGE_EXTERNAL_STORAGE -- the
    // user has to flip it on from Settings, same as any other app that
    // needs full folder management (e.g. file managers).
    @PluginMethod
    public void requestAllFilesAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R || Environment.isExternalStorageManager()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("granted", false);
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // SET AS WALLPAPER -- hands the image off to the system's own "Set as"
    // chooser (wallpaper, contact photo, etc.), exactly the same
    // ACTION_ATTACH_DATA flow the stock Android gallery/Photos app uses,
    // rather than reimplementing wallpaper-setting ourselves.
    // ------------------------------------------------------------------
    @PluginMethod
    public void setAsWallpaper(PluginCall call) {
        try {
            long id = call.getData().getLong("mediaId");
            Uri uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id);

            Intent intent = new Intent(Intent.ACTION_ATTACH_DATA);
            intent.setDataAndType(uri, "image/*");
            intent.putExtra("mimeType", "image/*");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(intent, "Set as");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error opening Set as chooser: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = hasMediaPermission();
        result.put("granted", granted);
        result.put("permissionState", granted ? "granted" : "prompt");
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (hasMediaPermission()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("permissionState", "granted");
            call.resolve(result);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("media", call, "permissionsCallback");
        } else {
            requestPermissionForAlias("storage", call, "permissionsCallback");
        }
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = hasMediaPermission();
        result.put("granted", granted);
        result.put("permissionState", granted ? "granted" : "denied");
        call.resolve(result);
    }

    private boolean hasMediaPermission() {
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ctx.checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) == android.content.pm.PackageManager.PERMISSION_GRANTED
                && ctx.checkSelfPermission(Manifest.permission.READ_MEDIA_VIDEO) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } else {
            return ctx.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
    }

    // ------------------------------------------------------------------
    // Internal row model shared by the images & video queries
    // ------------------------------------------------------------------
    private static class Row {
        long id;
        boolean isVideo;
        String name;
        String mimeType;
        long sizeBytes;
        long dateModifiedSec;
        String bucketId;
        String bucketName;
        int width;
        int height;
        long durationMs;
        String data;
        Uri contentUri;
    }

    private List<Row> queryImages(String bucketId) {
        List<Row> rows = new ArrayList<>();
        Uri uri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        String[] projection = new String[] {
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.MIME_TYPE,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.DATE_MODIFIED,
            MediaStore.Images.Media.BUCKET_ID,
            MediaStore.Images.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Images.Media.WIDTH,
            MediaStore.Images.Media.HEIGHT,
            MediaStore.Images.Media.DATA,
        };
        String selection = null;
        String[] args = null;
        if (bucketId != null && !bucketId.isEmpty()) {
            selection = MediaStore.Images.Media.BUCKET_ID + "=?";
            args = new String[] { bucketId };
        }
        String sortOrder = MediaStore.Images.Media.DATE_MODIFIED + " DESC";

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, args, sortOrder)) {
            if (cursor != null) {
                int idIdx = cursor.getColumnIndex(MediaStore.Images.Media._ID);
                int nameIdx = cursor.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME);
                int mimeIdx = cursor.getColumnIndex(MediaStore.Images.Media.MIME_TYPE);
                int sizeIdx = cursor.getColumnIndex(MediaStore.Images.Media.SIZE);
                int dateIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATE_MODIFIED);
                int bucketIdIdx = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_ID);
                int bucketNameIdx = cursor.getColumnIndex(MediaStore.Images.Media.BUCKET_DISPLAY_NAME);
                int widthIdx = cursor.getColumnIndex(MediaStore.Images.Media.WIDTH);
                int heightIdx = cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT);
                int dataIdx = cursor.getColumnIndex(MediaStore.Images.Media.DATA);

                while (cursor.moveToNext()) {
                    Row r = new Row();
                    r.id = cursor.getLong(idIdx);
                    r.isVideo = false;
                    r.name = nameIdx != -1 ? cursor.getString(nameIdx) : null;
                    r.mimeType = mimeIdx != -1 ? cursor.getString(mimeIdx) : null;
                    r.sizeBytes = sizeIdx != -1 ? cursor.getLong(sizeIdx) : 0;
                    r.dateModifiedSec = dateIdx != -1 ? cursor.getLong(dateIdx) : 0;
                    r.bucketId = bucketIdIdx != -1 ? cursor.getString(bucketIdIdx) : null;
                    r.bucketName = bucketNameIdx != -1 ? cursor.getString(bucketNameIdx) : null;
                    r.width = widthIdx != -1 ? cursor.getInt(widthIdx) : 0;
                    r.height = heightIdx != -1 ? cursor.getInt(heightIdx) : 0;
                    r.data = dataIdx != -1 ? cursor.getString(dataIdx) : null;
                    r.contentUri = ContentUris.withAppendedId(uri, r.id);
                    rows.add(r);
                }
            }
        } catch (Exception ignored) {
        }
        return rows;
    }

    private List<Row> queryVideos(String bucketId) {
        List<Row> rows = new ArrayList<>();
        Uri uri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        String[] projection = new String[] {
            MediaStore.Video.Media._ID,
            MediaStore.Video.Media.DISPLAY_NAME,
            MediaStore.Video.Media.MIME_TYPE,
            MediaStore.Video.Media.SIZE,
            MediaStore.Video.Media.DATE_MODIFIED,
            MediaStore.Video.Media.BUCKET_ID,
            MediaStore.Video.Media.BUCKET_DISPLAY_NAME,
            MediaStore.Video.Media.WIDTH,
            MediaStore.Video.Media.HEIGHT,
            MediaStore.Video.Media.DURATION,
            MediaStore.Video.Media.DATA,
        };
        String selection = null;
        String[] args = null;
        if (bucketId != null && !bucketId.isEmpty()) {
            selection = MediaStore.Video.Media.BUCKET_ID + "=?";
            args = new String[] { bucketId };
        }
        String sortOrder = MediaStore.Video.Media.DATE_MODIFIED + " DESC";

        try (Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, args, sortOrder)) {
            if (cursor != null) {
                int idIdx = cursor.getColumnIndex(MediaStore.Video.Media._ID);
                int nameIdx = cursor.getColumnIndex(MediaStore.Video.Media.DISPLAY_NAME);
                int mimeIdx = cursor.getColumnIndex(MediaStore.Video.Media.MIME_TYPE);
                int sizeIdx = cursor.getColumnIndex(MediaStore.Video.Media.SIZE);
                int dateIdx = cursor.getColumnIndex(MediaStore.Video.Media.DATE_MODIFIED);
                int bucketIdIdx = cursor.getColumnIndex(MediaStore.Video.Media.BUCKET_ID);
                int bucketNameIdx = cursor.getColumnIndex(MediaStore.Video.Media.BUCKET_DISPLAY_NAME);
                int widthIdx = cursor.getColumnIndex(MediaStore.Video.Media.WIDTH);
                int heightIdx = cursor.getColumnIndex(MediaStore.Video.Media.HEIGHT);
                int durationIdx = cursor.getColumnIndex(MediaStore.Video.Media.DURATION);
                int dataIdx = cursor.getColumnIndex(MediaStore.Video.Media.DATA);

                while (cursor.moveToNext()) {
                    Row r = new Row();
                    r.id = cursor.getLong(idIdx);
                    r.isVideo = true;
                    r.name = nameIdx != -1 ? cursor.getString(nameIdx) : null;
                    r.mimeType = mimeIdx != -1 ? cursor.getString(mimeIdx) : null;
                    r.sizeBytes = sizeIdx != -1 ? cursor.getLong(sizeIdx) : 0;
                    r.dateModifiedSec = dateIdx != -1 ? cursor.getLong(dateIdx) : 0;
                    r.bucketId = bucketIdIdx != -1 ? cursor.getString(bucketIdIdx) : null;
                    r.bucketName = bucketNameIdx != -1 ? cursor.getString(bucketNameIdx) : null;
                    r.width = widthIdx != -1 ? cursor.getInt(widthIdx) : 0;
                    r.height = heightIdx != -1 ? cursor.getInt(heightIdx) : 0;
                    r.durationMs = durationIdx != -1 ? cursor.getLong(durationIdx) : 0;
                    r.data = dataIdx != -1 ? cursor.getString(dataIdx) : null;
                    r.contentUri = ContentUris.withAppendedId(uri, r.id);
                    rows.add(r);
                }
            }
        } catch (Exception ignored) {
        }
        return rows;
    }

    // ------------------------------------------------------------------
    // ALBUMS
    // ------------------------------------------------------------------

    @PluginMethod
    public void getAlbums(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }

        try {
            List<Row> all = new ArrayList<>();
            all.addAll(queryImages(null));
            all.addAll(queryVideos(null));
            // Newest first, so each bucket's "cover" ends up being its most recent item.
            Collections.sort(all, (a, b) -> Long.compare(b.dateModifiedSec, a.dateModifiedSec));

            Map<String, JSObject> albumMap = new HashMap<>();
            Map<String, Integer> counts = new HashMap<>();

            for (Row r : all) {
                String bucketId = r.bucketId != null ? r.bucketId : "default";
                String bucketName = r.bucketName != null ? r.bucketName : "Camera";

                counts.put(bucketId, (counts.containsKey(bucketId) ? counts.get(bucketId) : 0) + 1);

                if (!albumMap.containsKey(bucketId)) {
                    String coverThumbPath;
                    try {
                        coverThumbPath = getOrCreateThumbnailPath(r.id, r.contentUri, r.isVideo);
                    } catch (Exception e) {
                        // One bad cover photo shouldn't take down the whole
                        // album list -- just leave this album's cover empty,
                        // the frontend already handles a missing cover.
                        coverThumbPath = "";
                    }
                    JSObject alb = new JSObject();
                    alb.put("id", bucketId);
                    alb.put("name", bucketName);
                    alb.put("coverUri", coverThumbPath);
                    albumMap.put(bucketId, alb);
                }
            }

            JSArray albumsArray = new JSArray();
            for (Map.Entry<String, JSObject> entry : albumMap.entrySet()) {
                JSObject alb = entry.getValue();
                alb.put("count", counts.get(entry.getKey()));
                albumsArray.put(alb);
            }

            JSObject res = new JSObject();
            res.put("albums", albumsArray);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error querying albums: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------------
    // MEDIA
    // ------------------------------------------------------------------

    @PluginMethod
    public void getMedia(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }

        String targetBucketId = call.getString("bucketId", null);
        int offset = call.getInt("offset", 0);
        int limit = call.getInt("limit", 1000);

        try {
            List<Row> all = new ArrayList<>();
            all.addAll(queryImages(targetBucketId));
            all.addAll(queryVideos(targetBucketId));
            Collections.sort(all, (a, b) -> Long.compare(b.dateModifiedSec, a.dateModifiedSec));

            int from = Math.max(0, Math.min(offset, all.size()));
            int to = Math.max(from, Math.min(offset + limit, all.size()));
            List<Row> page = all.subList(from, to);

            JSArray itemsArray = new JSArray();
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.US);

            for (Row r : page) {
                String finalUrl = (r.data != null && !r.data.isEmpty()) ? r.data : r.contentUri.toString();
                // Thumbnails are NOT generated here anymore -- generating a JPEG
                // for every single item during a full-library scan is what made
                // scanning slow (and, since it ran synchronously per item, also
                // what made the very first scroll feel laggy). The frontend now
                // requests each thumbnail lazily via getThumbnail() only for
                // items actually visible on screen, and the native side caches
                // each one to disk after the first request so repeat scrolls
                // are instant.

                long timestamp = r.dateModifiedSec > 0 ? r.dateModifiedSec * 1000 : System.currentTimeMillis();
                Date itemDate = new Date(timestamp);
                String dateStr = dateFormat.format(itemDate);
                String timeStr = timeFormat.format(itemDate);

                double sizeMb = Math.round((r.sizeBytes / (1024.0 * 1024.0)) * 10.0) / 10.0;
                if (sizeMb <= 0) sizeMb = 0.1;

                String name = r.name;
                if (name == null || name.isEmpty()) {
                    name = (r.isVideo ? "Video_" : "Photo_") + r.id;
                }
                String bucketName = r.bucketName;
                if (bucketName == null || bucketName.isEmpty()) {
                    bucketName = "Camera";
                }

                JSObject itemObj = new JSObject();
                itemObj.put("id", "media-" + (r.isVideo ? "v" : "p") + r.id);
                itemObj.put("mediaId", r.id);
                itemObj.put("title", name);
                itemObj.put("type", r.isVideo ? "video" : "photo");
                itemObj.put("url", finalUrl);
                itemObj.put("thumbnailUrl", "");
                itemObj.put("date", dateStr);
                itemObj.put("time", timeStr);
                itemObj.put("timestamp", timestamp);
                itemObj.put("sizeMb", sizeMb);
                itemObj.put("sizeBytes", r.sizeBytes);
                itemObj.put("album", bucketName);
                itemObj.put("mimeType", r.mimeType != null ? r.mimeType : (r.isVideo ? "video/mp4" : "image/jpeg"));
                if (r.isVideo) {
                    long durationMs = r.durationMs;
                    if (durationMs <= 0) {
                        // MediaStore hasn't indexed a duration for this file yet
                        // (common right after a file is created/received, before
                        // the system's background media scanner reprocesses it).
                        // Read it directly from the file instead of guessing --
                        // only for this rare case, since MediaMetadataRetriever
                        // is too slow to run on every video during a full scan.
                        durationMs = readVideoDurationMs(r.contentUri);
                    }
                    itemObj.put("durationSec", Math.max(1, (int) (durationMs / 1000)));
                }
                if (r.width > 0) itemObj.put("width", r.width);
                if (r.height > 0) itemObj.put("height", r.height);

                itemsArray.put(itemObj);
            }

            JSObject res = new JSObject();
            res.put("items", itemsArray);
            res.put("total", all.size());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error querying media: " + e.getMessage());
        }
    }

    // Reads a video's real duration directly from the file when MediaStore's
    // own DURATION column comes back 0 (unindexed file). Only called for
    // that rare case -- see call site above.
    private long readVideoDurationMs(Uri contentUri) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(getContext(), contentUri);
            String val = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            return val != null ? Long.parseLong(val) : 0;
        } catch (Exception ignored) {
            return 0;
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {
            }
        }
    }

    // Generates (or returns the already-cached) thumbnail for a single item.
    // Called lazily by the frontend as each grid cell scrolls into view.
    @PluginMethod
    public void getThumbnail(PluginCall call) {
        if (!hasMediaPermission()) {
            call.reject("Permission not granted");
            return;
        }
        Long mediaId = call.getLong("mediaId");
        boolean isVideo = Boolean.TRUE.equals(call.getBoolean("isVideo", false));
        if (mediaId == null) {
            call.reject("mediaId is required");
            return;
        }

        try {
            Uri collection = isVideo ? MediaStore.Video.Media.EXTERNAL_CONTENT_URI : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            Uri contentUri = ContentUris.withAppendedId(collection, mediaId);
            // Throws if a real on-disk thumbnail file couldn't be produced --
            // see getOrCreateThumbnailPath for why this must be a hard
            // failure rather than a silent fallback.
            String path = getOrCreateThumbnailPath(mediaId, contentUri, isVideo);

            JSObject res = new JSObject();
            res.put("path", path);
            call.resolve(res);
        } catch (Exception e) {
            android.util.Log.w("MediaStorePlugin", "getThumbnail failed for id=" + mediaId + " isVideo=" + isVideo, e);
            call.reject("Error generating thumbnail: " + e.getMessage());
        }
    }

    // Computes a real content hash (SHA-256) of a file, used to confirm exact
    // duplicates. Only called for files that already share the exact same
    // byte size (a cheap pre-filter done in JS first), so this runs on a
    // small subset of the library, not the whole thing -- keeping duplicate
    // scanning fast even though it reads real file content, not just guessed
    // metadata like size/name.
    @PluginMethod
    public void computeFileHash(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path is required");
            return;
        }
        try {
            File file = new File(path);
            if (!file.exists()) {
                call.reject("File not found");
                return;
            }
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            try (java.io.FileInputStream fis = new java.io.FileInputStream(file)) {
                byte[] buffer = new byte[65536];
                int read;
                while ((read = fis.read(buffer)) != -1) {
                    digest.update(buffer, 0, read);
                }
            }
            byte[] hashBytes = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            JSObject res = new JSObject();
            res.put("hash", sb.toString());
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error hashing file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getStorageStats(PluginCall call) {
        try {
            File path = Environment.getExternalStorageDirectory();
            StatFs stat = new StatFs(path.getPath());
            long blockSize = stat.getBlockSizeLong();
            long totalBlocks = stat.getBlockCountLong();
            long availableBlocks = stat.getAvailableBlocksLong();

            long totalBytes = totalBlocks * blockSize;
            long freeBytes = availableBlocks * blockSize;
            long usedBytes = Math.max(0, totalBytes - freeBytes);

            // Reuse the same reliable per-type queries used elsewhere (not the
            // generic MediaStore.Files collection, which under-reports files
            // created by other apps -- see the note at the top of this file).
            long photosBytes = 0;
            for (Row r : queryImages(null)) {
                photosBytes += r.sizeBytes;
            }
            long videosBytes = 0;
            for (Row r : queryVideos(null)) {
                videosBytes += r.sizeBytes;
            }

            long knownBytes = photosBytes + videosBytes;
            long otherBytes = Math.max(0, usedBytes - knownBytes);

            JSObject res = new JSObject();
            res.put("totalBytes", totalBytes);
            res.put("freeBytes", freeBytes);
            res.put("usedBytes", usedBytes);
            res.put("photosBytes", photosBytes);
            res.put("videosBytes", videosBytes);
            // Apps/documents aren't reliably attributable from MediaStore alone
            // without extra permissions, so everything not photos/videos is
            // reported together as "other" rather than a guessed split.
            res.put("appsBytes", 0);
            res.put("documentsBytes", 0);
            res.put("otherBytes", otherBytes);

            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error calculating storage stats: " + e.getMessage());
        }
    }

    // Returns an absolute on-disk file path to a cached JPEG thumbnail, or
    // throws if one genuinely can't be produced.
    //
    // IMPORTANT: this must never fall back to returning `contentUri.toString()`
    // (a "content://..." URI). The frontend feeds whatever this returns
    // through Capacitor.convertFileSrc(), which only knows how to serve real
    // filesystem paths -- handing it a content:// URI produces a broken,
    // un-loadable <img> src.
    //
    // Three layers, from cheapest to most robust -- the same general
    // strategy real gallery apps use, since no single Android thumbnail API
    // reliably works across every OEM/format:
    //   1. MediaStore's own cached/generated thumbnail (fast, but the
    //      legacy Thumbnails API in particular is unreliable on modern
    //      scoped-storage devices and often just returns null).
    //   2. For photos: decode the actual image file ourselves, downsampled
    //      to a small size. This doesn't depend on any MediaStore-side
    //      thumbnail cache at all, so it succeeds far more often.
    //   3. For videos: extract a real frame from the video file with
    //      MediaMetadataRetriever, which is the standard reliable way to
    //      get a video thumbnail (rather than relying on a pre-generated
    //      one that may not exist).
    private String getOrCreateThumbnailPath(long id, Uri contentUri, boolean isVideo) throws Exception {
        Context context = getContext();
        File cacheDir = new File(context.getCacheDir(), "thumbnails");
        if (!cacheDir.exists()) {
            cacheDir.mkdirs();
        }

        File thumbFile = new File(cacheDir, "thumb_" + (isVideo ? "v" : "p") + id + ".jpg");
        if (thumbFile.exists() && thumbFile.length() > 0) {
            return thumbFile.getAbsolutePath();
        }

        Bitmap bitmap = tryMediaStoreThumbnail(context, contentUri, id, isVideo);

        if (bitmap == null) {
            bitmap = isVideo
                ? tryVideoFrameThumbnail(context, contentUri)
                : tryManualImageDecode(context, contentUri);
        }

        if (bitmap == null) {
            throw new Exception("No bitmap could be decoded for id=" + id + " isVideo=" + isVideo);
        }

        try (FileOutputStream fos = new FileOutputStream(thumbFile)) {
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, fos);
            fos.flush();
        } finally {
            bitmap.recycle();
        }

        if (!thumbFile.exists() || thumbFile.length() == 0) {
            throw new Exception("Thumbnail file was not written for id=" + id);
        }

        return thumbFile.getAbsolutePath();
    }

    // Layer 1: MediaStore's own thumbnail machinery.
    private Bitmap tryMediaStoreThumbnail(Context context, Uri contentUri, long id, boolean isVideo) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                return context.getContentResolver().loadThumbnail(contentUri, new Size(240, 240), null);
            } catch (Exception ignored) {
                // fall through
            }
        }
        try {
            if (isVideo) {
                return MediaStore.Video.Thumbnails.getThumbnail(
                    context.getContentResolver(), id, MediaStore.Video.Thumbnails.MINI_KIND, null
                );
            } else {
                return MediaStore.Images.Thumbnails.getThumbnail(
                    context.getContentResolver(), id, MediaStore.Images.Thumbnails.MINI_KIND, null
                );
            }
        } catch (Exception ignored) {
            return null;
        }
    }

    // Layer 2 (photos): decode the real file ourselves, downsampled. Doesn't
    // depend on any MediaStore-side cache existing, so it's the most
    // reliable option -- if the app can read the file at all, this works.
    private Bitmap tryManualImageDecode(Context context, Uri contentUri) {
        try {
            // First pass: read just the dimensions (no pixel data) so we can
            // pick a downsample factor instead of decoding the full-size
            // image into memory just to throw most of it away.
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (InputStream boundsStream = context.getContentResolver().openInputStream(contentUri)) {
                if (boundsStream == null) return null;
                BitmapFactory.decodeStream(boundsStream, null, bounds);
            }

            int targetSize = 240;
            int sample = 1;
            int w = bounds.outWidth;
            int h = bounds.outHeight;
            while (w > 0 && h > 0 && (w / (sample * 2) >= targetSize || h / (sample * 2) >= targetSize)) {
                sample *= 2;
            }

            BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
            decodeOpts.inSampleSize = sample;
            try (InputStream stream = context.getContentResolver().openInputStream(contentUri)) {
                if (stream == null) return null;
                return BitmapFactory.decodeStream(stream, null, decodeOpts);
            }
        } catch (Exception ignored) {
            return null;
        }
    }

    // Layer 2 (videos): pull an actual frame out of the video file.
    private Bitmap tryVideoFrameThumbnail(Context context, Uri contentUri) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(context, contentUri);
            Bitmap frame = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                try {
                    frame = retriever.getScaledFrameAtTime(
                        0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, 240, 240
                    );
                } catch (Exception ignored) {
                    // fall through to the unscaled call below
                }
            }
            if (frame == null) {
                frame = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
            }
            return frame;
        } catch (Exception ignored) {
            return null;
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {
            }
        }
    }
}
