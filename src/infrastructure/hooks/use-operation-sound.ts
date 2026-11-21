import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type SoundState = "off" | "testing" | "on" | "blocked";
type SoundControls = { state: SoundState; toggle: () => void };
const soundPreferenceKey = "food-truck:operation-sound";

function readSoundPreference(): SoundState {
  try {
    return localStorage.getItem(soundPreferenceKey) === "on" ? "on" : "off";
  } catch {
    return "off";
  }
}

function saveSoundPreference(value: "on" | "off") {
  try {
    localStorage.setItem(soundPreferenceKey, value);
  } catch {
    // The sound control also works when the browser restricts storage.
  }
}

export const OperationSoundContext = createContext<SoundControls | null>(null);
export const useOperationSoundControls = () => useContext(OperationSoundContext);

export function useOperationSound() {
  const [state, setState] = useState<SoundState>(readSoundPreference);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabled = useRef(state === "on");
  const playing = useRef(false);
  const pending = useRef(0);

  const blocked = useCallback(() => {
    enabled.current = false;
    playing.current = false;
    pending.current = 0;
    setState("blocked");
  }, []);

  const playNext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !enabled.current || playing.current || !pending.current) return;
    pending.current--;
    playing.current = true;
    void audio.play().catch(() => {
      if (audioRef.current === audio && enabled.current) blocked();
    });
  }, [blocked]);

  const ended = useCallback(() => {
    playing.current = false;
    playNext();
  }, [playNext]);

  const prepareAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(`${import.meta.env.BASE_URL}alerta.mp3`);
    audio.addEventListener("ended", ended);
    audio.addEventListener("error", blocked);
    audioRef.current = audio;
    return audio;
  }, [blocked, ended]);

  const notify = useCallback(() => {
    if (!enabled.current) return;
    prepareAudio();
    pending.current++;
    playNext();
  }, [playNext, prepareAudio]);

  const toggle = useCallback(() => {
    if (enabled.current) {
      enabled.current = false;
      pending.current = 0;
      playing.current = false;
      audioRef.current?.pause();
      saveSoundPreference("off");
      setState("off");
      return;
    }

    const audio = prepareAudio();
    if (audio.error || (audio.currentTime > 0 && !audio.ended)) audio.load();
    setState("testing");
    playing.current = true;
    // Call play on the same element, directly in the click handler.
    void audio.play().then(() => {
      if (audioRef.current !== audio) return;
      enabled.current = true;
      saveSoundPreference("on");
      setState("on");
    }).catch(() => {
      if (audioRef.current === audio) blocked();
    });
  }, [blocked, prepareAudio]);

  useEffect(() => () => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("error", blocked);
      audio.pause();
    }
  }, [blocked, ended]);

  return { state, toggle, notify };
}
