interface Props {
  masterWarning: boolean;
  masterCaution: boolean;
  soundEnabled: boolean;
  onAckWarning: () => void;
  onAckCaution: () => void;
  onToggleSound: () => void;
}

export default function MasterAlerts({
  masterWarning,
  masterCaution,
  soundEnabled,
  onAckWarning,
  onAckCaution,
  onToggleSound,
}: Props) {
  return (
    <div className="master-alerts">
      <button
        className={`master-btn master-warning ${masterWarning ? "active" : ""}`}
        onClick={onAckWarning}
        disabled={!masterWarning}
      >
        MASTER WARNING
      </button>

      <button
        className={`master-btn master-caution ${masterCaution ? "active" : ""}`}
        onClick={onAckCaution}
        disabled={!masterCaution}
      >
        MASTER CAUTION
      </button>

      <button className={`sound-toggle ${soundEnabled ? "on" : "off"}`} onClick={onToggleSound}>
        {soundEnabled ? "🔊" : "🔇"}
      </button>
    </div>
  );
}
