import { useRef, useCallback, useEffect, useState } from "react";

interface Alert {
  id: string;
  level: string;
  param: string;
  message: string;
  voice_text?: string;
  timestamp: string;
  status: string;
}

interface LCASState {
  masterWarning: boolean;
  masterCaution: boolean;
  soundEnabled: boolean;
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playWarningTone() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = "square";
    gain.gain.value = 0.25;
    osc.start();
    setTimeout(() => { gain.gain.value = 0; }, 150);
    setTimeout(() => { gain.gain.value = 0.25; }, 250);
    setTimeout(() => { gain.gain.value = 0; }, 400);
    setTimeout(() => { gain.gain.value = 0.25; }, 500);
    setTimeout(() => { gain.gain.value = 0; }, 650);
    setTimeout(() => osc.stop(), 700);
  } catch {}
}

function playCautionTone() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.value = 0.2;
    osc.start();
    setTimeout(() => osc.stop(), 300);
  } catch {}
}

function playResolvedTone() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = "sine";
    gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => { osc.frequency.value = 800; }, 150);
    setTimeout(() => osc.stop(), 300);
  } catch {}
}

function speakRussian(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.rate = 1.1;
  utterance.pitch = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const ruVoice = voices.find((v) => v.lang.startsWith("ru"));
  if (ruVoice) utterance.voice = ruVoice;
  window.speechSynthesis.speak(utterance);
}

export function useLCAS() {
  const [state, setState] = useState<LCASState>({
    masterWarning: false,
    masterCaution: false,
    soundEnabled: true,
  });

  const processedAlerts = useRef<Set<string>>(new Set());
  const warningRepeatRef = useRef<number>(0);
  const lastWarningText = useRef<string>("");

  const processAlerts = useCallback((alerts: Alert[]) => {
    if (!alerts || alerts.length === 0) {
      if (state.masterWarning || state.masterCaution) {
        setState((s) => ({ ...s, masterWarning: false, masterCaution: false }));
        clearInterval(warningRepeatRef.current);
      }
      return;
    }

    const hasWarning = alerts.some((a) => a.level === "WARNING" && a.status === "active");
    const hasCaution = alerts.some((a) => a.level === "CAUTION" && a.status === "active");

    setState((s) => ({
      ...s,
      masterWarning: hasWarning,
      masterCaution: hasCaution,
    }));

    const warningAlerts = alerts
      .filter((a) => a.level === "WARNING" && a.status === "active")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const cautionAlerts = alerts
      .filter((a) => a.level === "CAUTION" && a.status === "active")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    for (const alert of [...warningAlerts, ...cautionAlerts]) {
      const key = `${alert.id}:${alert.param}`;
      if (processedAlerts.current.has(key)) continue;
      processedAlerts.current.add(key);

      if (!state.soundEnabled) continue;

      if (alert.level === "WARNING") {
        playWarningTone();
        setTimeout(() => {
          if (alert.voice_text) speakRussian(alert.voice_text);
        }, 800);

        lastWarningText.current = alert.voice_text || "";
        clearInterval(warningRepeatRef.current);
        warningRepeatRef.current = window.setInterval(() => {
          if (state.soundEnabled && lastWarningText.current) {
            playWarningTone();
            setTimeout(() => speakRussian(lastWarningText.current), 800);
          }
        }, 5000);
      } else if (alert.level === "CAUTION") {
        playCautionTone();
        setTimeout(() => {
          if (alert.voice_text) speakRussian(alert.voice_text);
        }, 400);
      }
    }
  }, [state.soundEnabled, state.masterWarning, state.masterCaution]);

  const acknowledgeWarning = useCallback(() => {
    clearInterval(warningRepeatRef.current);
    lastWarningText.current = "";
    window.speechSynthesis?.cancel();
    setState((s) => ({ ...s, masterWarning: false }));
    playResolvedTone();
  }, []);

  const acknowledgeCaution = useCallback(() => {
    setState((s) => ({ ...s, masterCaution: false }));
    playResolvedTone();
  }, []);

  const toggleSound = useCallback(() => {
    setState((s) => {
      if (s.soundEnabled) {
        window.speechSynthesis?.cancel();
        clearInterval(warningRepeatRef.current);
      }
      return { ...s, soundEnabled: !s.soundEnabled };
    });
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(warningRepeatRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    ...state,
    processAlerts,
    acknowledgeWarning,
    acknowledgeCaution,
    toggleSound,
  };
}
