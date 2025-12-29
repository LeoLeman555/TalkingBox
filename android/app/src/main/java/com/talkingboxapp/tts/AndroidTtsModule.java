package com.talkingboxapp.tts;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;

import com.facebook.react.bridge.*;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.UUID;

/**
 * Android native TTS module for React Native.
 *
 * Responsibilities (prototype scope):
 * - Initialize Google TextToSpeech engine (FR-FR).
 * - Generate a local WAV file from input text.
 * - Optionally export generated file to public Music directory.
 * - Optionally play a local audio file.
 *
 * Limitations (known and accepted for prototype):
 * - Single active generation at a time (non-reentrant).
 * - Global state stored in module instance.
 */
public class AndroidTtsModule extends ReactContextBaseJavaModule {

  private static final String TAG = "TTS";

  private TextToSpeech tts;
  private boolean isReady = false;
  private boolean isGenerating = false;

  private String currentUtteranceId;
  private String currentFilename;
  private Promise currentPromise;

  public AndroidTtsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    initTts(reactContext);
  }

  @Override
  public String getName() {
    return "AndroidTts";
  }

  /**
   * Initialize Google TTS engine and configure language + listeners.
   */
  private void initTts(ReactApplicationContext context) {
    Log.i(TAG, "[INIT][START]");

    tts = new TextToSpeech(
      context,
      status -> {
        if (status != TextToSpeech.SUCCESS) {
          Log.e(TAG, "[INIT][FAILED]");
          return;
        }

        int langResult = tts.setLanguage(Locale.FRANCE);
        if (langResult == TextToSpeech.LANG_MISSING_DATA ||
            langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
          Log.e(TAG, "[INIT][LANG_NOT_SUPPORTED][fr-FR]");
          return;
        }

        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {

          @Override
          public void onStart(String utteranceId) {
            if (!utteranceId.equals(currentUtteranceId)) return;
            Log.i(TAG, "[SYNTH][START][id=" + utteranceId + "]");
          }

          @Override
          public void onDone(String utteranceId) {
            if (!utteranceId.equals(currentUtteranceId)) return;

            Log.i(TAG, "[SYNTH][DONE][id=" + utteranceId + "]");
            isGenerating = false;

            File file = new File(
              getReactApplicationContext().getFilesDir(),
              "tts/" + currentFilename
            );

            // WAV header is 44 bytes minimum
            if (!file.exists() || file.length() < 44) {
              reject("TTS_INVALID_FILE", "Generated WAV file is invalid");
              return;
            }

            WritableMap result = Arguments.createMap();
            result.putString("path", file.getAbsolutePath());
            result.putString("filename", file.getName());
            result.putDouble("size", (double) file.length());

            Log.i(TAG, "[SYNTH][FILE_READY][name=" + file.getName() + "][size=" + file.length() + "]");

            currentPromise.resolve(result);
            clearState();
          }

          @Override
          public void onError(String utteranceId) {
            handleError(utteranceId, "UNKNOWN");
          }

          @Override
          public void onError(String utteranceId, int errorCode) {
            handleError(utteranceId, String.valueOf(errorCode));
          }

          private void handleError(String utteranceId, String errorCode) {
            if (!utteranceId.equals(currentUtteranceId)) return;
            Log.e(TAG, "[SYNTH][ERROR][code=" + errorCode + "]");
            reject("TTS_FAILED", "TTS synthesis failed (code=" + errorCode + ")");
          }
        });

        isReady = true;
        Log.i(TAG, "[INIT][READY][lang=fr-FR]");
      },
      "com.google.android.tts"
    );
  }

  /**
   * Generate a WAV file from input text.
   *
   * @param text Input text to synthesize.
   * @param filename Output filename (must end with .wav).
   * @param promise React Native promise resolved with file info.
   */
  @ReactMethod
  public void generate(String text, String filename, Promise promise) {
    Log.i(TAG, "[GENERATE][REQUEST][filename=" + filename + "]");

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

      Log.i(TAG, "[GENERATE][START][id=" + currentUtteranceId + "]");

      Bundle params = new Bundle();
      tts.synthesizeToFile(text, params, outFile, currentUtteranceId);

    } catch (Exception e) {
      Log.e(TAG, "[GENERATE][EXCEPTION]", e);
      reject("TTS_EXCEPTION", e.getMessage());
    }
  }

  /**
   * Export a generated WAV file to public Music directory (MediaStore).
   */
  @ReactMethod
  public void exportToMusic(String internalPath, String publicName, Promise promise) {
    Log.i(TAG, "[EXPORT][START][name=" + publicName + "]");

    try {
      File sourceFile = new File(internalPath);
      if (!sourceFile.exists()) {
        promise.reject("FILE_NOT_FOUND", "Source file does not exist");
        return;
      }

      ContentValues values = new ContentValues();
      values.put(MediaStore.Audio.Media.DISPLAY_NAME, publicName);
      values.put(MediaStore.Audio.Media.MIME_TYPE, "audio/wav");
      values.put(
        MediaStore.Audio.Media.RELATIVE_PATH,
        Environment.DIRECTORY_MUSIC + "/TalkingBox/TTS"
      );

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

      Log.i(TAG, "[EXPORT][DONE][uri=" + uri + "]");
      promise.resolve(uri.toString());

    } catch (Exception e) {
      Log.e(TAG, "[EXPORT][FAILED]", e);
      promise.reject("EXPORT_FAILED", e.getMessage());
    }
  }

  /**
   * Play a local audio file (debug / prototype only).
   */
  @ReactMethod
  public void play(String internalPath, Promise promise) {
    Log.i(TAG, "[PLAY][START][path=" + internalPath + "]");

    MediaPlayer player = new MediaPlayer();
    try {
      player.setDataSource(internalPath);
      player.prepare();
      player.start();
      promise.resolve(null);
    } catch (Exception e) {
      Log.e(TAG, "[PLAY][ERROR]", e);
      promise.reject("PLAYBACK_ERROR", e.getMessage());
    }
  }

  /**
   * Reject current promise and reset generation state.
   */
  private void reject(String code, String message) {
    Log.e(TAG, "[ERROR][" + code + "] " + message);
    isGenerating = false;
    if (currentPromise != null) {
      currentPromise.reject(code, message);
    }
    clearState();
  }

  /**
   * Clear internal generation state.
   */
  private void clearState() {
    currentPromise = null;
    currentUtteranceId = null;
    currentFilename = null;
  }

  @Override
  public void onCatalystInstanceDestroy() {
    Log.i(TAG, "[DESTROY]");
    if (tts != null) {
      tts.shutdown();
    }
  }
}
