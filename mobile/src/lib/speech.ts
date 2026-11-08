import * as Speech from "expo-speech";

/** Reads English aloud with the phone's voice (same role as the web's src/lib/tts.ts). */
export function speak(text: string, rate = 0.9) {
  Speech.stop();
  Speech.speak(text, { language: "en-US", rate });
}
