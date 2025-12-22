package com.talkingboxapp.tts;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;

import com.facebook.react.bridge.*;

import java.io.File;
import java.util.HashMap;
import java.util.Locale;
import java.util.UUID;

public class AndroidTtsModule extends ReactContextBaseJavaModule {

  private static final String TAG = "AndroidTtsModule";
  private TextToSpeech tts;
  private boolean isReady = false;
  private boolean isGenerating = false;
  private String currentUtteranceId = null;
  private Promise currentPromise = null;

  public AndroidTtsModule(ReactApplicationContext reactContext) {
    super(reactContext);
    initTts(reactContext);
  }

  @Override
  public String getName() {
    return "AndroidTts";
  }

  private void initTts(ReactApplicationContext context) {
    tts = new TextToSpeech(context, status -> {
      if (status != TextToSpeech.SUCCESS) {
        Log.e(TAG, "TTS init failed");
        return;
      }

      int langResult = tts.setLanguage(Locale.FRANCE);
      if (langResult == TextToSpeech.LANG_MISSING_DATA ||
          langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
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

          File file = new File(getReactApplicationContext().getFilesDir(), "tts/" + utteranceId);
          if (currentPromise != null) {
            WritableMap result = Arguments.createMap();
            result.putString("path", file.getAbsolutePath());
            result.putString("filename", file.getName());
            result.putInt("size", (int) file.length());
            currentPromise.resolve(result);
          }
          currentPromise = null;
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

          isGenerating = false;
          if (currentPromise != null) {
            currentPromise.reject("TTS_FAILED", "TTS synthesis failed");
            currentPromise = null;
          }
        }
      });

      isReady = true;
    });
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

    isGenerating = true;
    currentPromise = promise;

    try {
      File dir = new File(getReactApplicationContext().getFilesDir(), "tts");
      if (!dir.exists()) dir.mkdirs();

      File outFile = new File(dir, filename);
      currentUtteranceId = UUID.randomUUID().toString();

      Bundle params = new Bundle();
      params.putString(
        TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID,
        currentUtteranceId
      );

      tts.synthesizeToFile(text, params, outFile, currentUtteranceId);


    } catch (Exception e) {
      isGenerating = false;
      currentPromise = null;
      promise.reject("TTS_EXCEPTION", e.getMessage());
    }
  }

  @Override
  public void onCatalystInstanceDestroy() {
    if (tts != null) {
      tts.shutdown();
    }
  }
}
