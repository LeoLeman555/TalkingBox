package com.talkingboxapp.tts;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Environment;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.provider.MediaStore;
import android.util.Log;

import com.facebook.react.bridge.*;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.UUID;

public class AndroidTtsModule extends ReactContextBaseJavaModule {

  private static final String TAG = "AndroidTtsModule";

  private TextToSpeech tts;
  private boolean isReady = false;
  private boolean isGenerating = false;
  private String currentUtteranceId;
  private Promise currentPromise;
  private String currentFilename;

  public AndroidTtsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    initTts(reactContext);
  }

  @Override
  public String getName() {
    return "AndroidTts";
  }

  private void initTts(ReactApplicationContext context) {
    tts = new TextToSpeech(
      context,
      status -> {
        if (status != TextToSpeech.SUCCESS) {
          Log.e(TAG, "TTS init failed");
          return;
        }

        int lang = tts.setLanguage(Locale.FRANCE);
        if (lang == TextToSpeech.LANG_MISSING_DATA ||
            lang == TextToSpeech.LANG_NOT_SUPPORTED) {
          Log.e(TAG, "French language not supported");
          return;
        }

        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
          @Override
          public void onStart(String utteranceId) {}

          @Override
          public void onDone(String utteranceId) {
            if (!utteranceId.equals(currentUtteranceId)) return;
            isGenerating = false;

            File file = new File(
              getReactApplicationContext().getFilesDir(),
              "tts/" + currentFilename
            );

            if (!file.exists() || file.length() < 44) {
              reject("TTS_INVALID_FILE", "Generated WAV file is invalid");
              return;
            }

            WritableMap result = Arguments.createMap();
            result.putString("path", file.getAbsolutePath());
            result.putString("filename", file.getName());
            result.putInt("size", (int) file.length());

            currentPromise.resolve(result);
            clearState();
          }

          @Override
          public void onError(String utteranceId) {
            handleError(utteranceId);
          }

          @Override
          public void onError(String utteranceId, int errorCode) {
            handleError(utteranceId);
          }

          private void handleError(String utteranceId) {
            if (!utteranceId.equals(currentUtteranceId)) return;
            reject("TTS_FAILED", "TTS synthesis failed");
          }
        });

        isReady = true;
      },
      "com.google.android.tts"
    );
  }

  @ReactMethod
  public void generate(String text, String filename, Promise promise) {
    if (!isReady) {
      promise.reject("TTS_NOT_READY", "TTS engine not ready");
      return;
    }
    if (isGenerating) {
      promise.reject("TTS_BUSY", "TTS already generating");
      return;
    }
    if (!filename.endsWith(".wav")) {
      promise.reject("TTS_INVALID_FILENAME", "Filename must end with .wav");
      return;
    }

    try {
      File dir = new File(getReactApplicationContext().getFilesDir(), "tts");
      if (!dir.exists() && !dir.mkdirs()) {
        promise.reject("TTS_DIR_ERROR", "Unable to create tts directory");
        return;
      }

      File outFile = new File(dir, filename);

      currentUtteranceId = UUID.randomUUID().toString();
      currentFilename = filename;
      currentPromise = promise;
      isGenerating = true;

      Bundle params = new Bundle();
      tts.synthesizeToFile(text, params, outFile, currentUtteranceId);

    } catch (Exception e) {
      reject("TTS_EXCEPTION", e.getMessage());
    }
  }

  @ReactMethod
  public void exportToMusic(String internalPath, String publicName, Promise promise) {
    try {
      File sourceFile = new File(internalPath);
      if (!sourceFile.exists()) {
        promise.reject("FILE_NOT_FOUND", "Source file does not exist");
        return;
      }

      ContentValues values = new ContentValues();
      values.put(MediaStore.Audio.Media.DISPLAY_NAME, publicName);
      values.put(MediaStore.Audio.Media.MIME_TYPE, "audio/wav");
      values.put(MediaStore.Audio.Media.RELATIVE_PATH, Environment.DIRECTORY_MUSIC + "/TalkingBox/Prototype_1");

      ContentResolver resolver = getReactApplicationContext().getContentResolver();
      Uri uri = resolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values);
      if (uri == null) {
        promise.reject("MEDIASTORE_ERROR", "Failed to create MediaStore entry");
        return;
      }

      try (InputStream in = new FileInputStream(sourceFile);
           OutputStream out = resolver.openOutputStream(uri)) {
        byte[] buffer = new byte[4096];
        int len;
        while ((len = in.read(buffer)) > 0) {
          out.write(buffer, 0, len);
        }
      }

      promise.resolve(uri.toString());

    } catch (Exception e) {
      promise.reject("EXPORT_FAILED", e.getMessage());
    }
  }

  @ReactMethod
  public void play(String internalPath, Promise promise) {
    try {
      MediaPlayer player = new MediaPlayer();
      player.setDataSource(internalPath);
      player.prepare();
      player.start();
      promise.resolve(null);
    } catch (Exception e) {
      promise.reject("PLAYBACK_ERROR", e.getMessage());
    }
  }

  private void reject(String code, String message) {
    isGenerating = false;
    if (currentPromise != null) {
      currentPromise.reject(code, message);
    }
    clearState();
  }

  private void clearState() {
    currentPromise = null;
    currentUtteranceId = null;
    currentFilename = null;
  }

  @Override
  public void onCatalystInstanceDestroy() {
    if (tts != null) {
      tts.shutdown();
    }
  }
}
