import { useState, useEffect } from "react";

const STEPS = [
  { target: ".hi-gauge-container", title: "Индекс здоровья", desc: "Главный показатель состояния локомотива (0–100). Цвет: зелёный = норма, жёлтый = внимание, красный = критично." },
  { target: ".speed-widget", title: "Скорость", desc: "Текущая скорость локомотива. При боксовании появляется красный индикатор." },
  { target: ".master-alerts", title: "LCAS Алерты", desc: "Master Warning (красная) и Master Caution (жёлтая) — как в авиации. Нажмите для подтверждения." },
  { target: ".alerts-widget", title: "Список алертов", desc: "Активные предупреждения с голосовым оповещением. WARNING повторяется каждые 5 сек." },
  { target: ".chart-widget", title: "Тренды", desc: "Графики параметров в реальном времени. Пунктир — прогноз Health Index." },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const done = localStorage.getItem("onboarding_done");
    if (done) setVisible(false);
  }, []);

  if (!visible || step >= STEPS.length) return null;

  const current = STEPS[step];

  const handleNext = () => {
    if (step >= STEPS.length - 1) {
      localStorage.setItem("onboarding_done", "1");
      setVisible(false);
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="tour-overlay">
      <div className="tour-card">
        <div className="tour-step">{step + 1} / {STEPS.length}</div>
        <h4 className="tour-title">{current.title}</h4>
        <p className="tour-desc">{current.desc}</p>
        <div className="tour-actions">
          <button className="tour-skip" onClick={() => { localStorage.setItem("onboarding_done", "1"); setVisible(false); }}>Пропустить</button>
          <button className="tour-next" onClick={handleNext}>{step >= STEPS.length - 1 ? "Готово" : "Далее →"}</button>
        </div>
      </div>
    </div>
  );
}
