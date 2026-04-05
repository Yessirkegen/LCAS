import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  healthIndex: number;
  category: string;
  voltage: number | null;
  transformerTemp: number | null;
  tedTemp: number | null;
  tractionCurrent: number | null;
  groundFault: boolean;
  pantographUp: boolean;
  regenPower: number | null;
}

const C = {
  normal: "#75ff9e", attention: "#fdd400", critical: "#ffb4ab",
  body: "#3a3d42", bodyDark: "#2a2d32", bodyAccent: "#4a4d52",
  cab: "#4a4d52", cabWindow: "#0a2535",
  transformer: "#666", transformerFin: "#555",
  inverter: "#3a4a5a",
  compressor: "#4a5560",
  roof: "#555",
  pantograph: "#888", pantographUp: "#cc8800",
  hvBus: "#cc6600", hvInsulator: "#ddd",
  gv: "#eee",
  resistor: "#5a4a3a",
  ventGrille: "#555",
  wheel: "#3a3a3a", rail: "#888", sleeper: "#3d2b1f",
  frame: "#2a2d30",
  airTank: "#4a5a5a",
  snowplow: "#333",
};

function zone(v: number | null, w: number, c: number) {
  if (v === null) return C.body;
  return v > c ? C.critical : v > w ? C.attention : C.normal;
}

function Glow({ color, active, position, size }: { color: string; active: boolean; position: [number, number, number]; size: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      const m = ref.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = active ? 0.2 + Math.sin(s.clock.elapsedTime * 3) * 0.12 : 0.02;
    }
  });
  return <mesh ref={ref} position={position}><boxGeometry args={size} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.02} roughness={0.5} metalness={0.45} /></mesh>;
}

function Section({ xOff, props, isFirst }: { xOff: number; props: Props; isFirst: boolean }) {
  const dir = isFirst ? -1 : 1;
  const tCol = zone(props.transformerTemp, 80, 100);
  const iCol = zone(props.tractionCurrent, 800, 1200);
  const tedCol = zone(props.tedTemp, 120, 150);
  const fCol = props.groundFault ? C.critical : C.normal;

  return (
    <group position={[xOff, 0, 0]}>
      {/* === MAIN BODY (smooth with ribs) === */}
      <mesh position={[0, 1.4, 0]}><boxGeometry args={[8.75, 2.5, 1.55]} /><meshStandardMaterial color={C.body} metalness={0.5} roughness={0.4} /></mesh>
      {/* Body lower ribs (гофры) */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-3.8 + i * 0.55, 0.35, 0.79]}><boxGeometry args={[0.4, 0.12, 0.02]} /><meshStandardMaterial color={C.bodyAccent} metalness={0.4} /></mesh>
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={`r${i}`} position={[-3.8 + i * 0.55, 0.35, -0.79]}><boxGeometry args={[0.4, 0.12, 0.02]} /><meshStandardMaterial color={C.bodyAccent} metalness={0.4} /></mesh>
      ))}

      {/* Side ventilation grilles (жалюзи) */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 1.8, 0.79]}><boxGeometry args={[0.8, 0.6, 0.03]} /><meshStandardMaterial color={C.ventGrille} metalness={0.6} /></mesh>
          {Array.from({ length: 6 }, (_, j) => (
            <mesh key={j} position={[x, 1.55 + j * 0.1, 0.8]}><boxGeometry args={[0.75, 0.015, 0.02]} /><meshStandardMaterial color={C.bodyDark} /></mesh>
          ))}
        </group>
      ))}

      {/* === ROOF === */}
      <mesh position={[0, 2.7, 0]}><boxGeometry args={[8.8, 0.08, 1.6]} /><meshStandardMaterial color={C.roof} metalness={0.4} roughness={0.6} /></mesh>
      {/* Roof edge rounding */}
      <mesh position={[0, 2.68, 0.8]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 8.8, 8]} /><meshStandardMaterial color={C.roof} /></mesh>
      <mesh position={[0, 2.68, -0.8]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 8.8, 8]} /><meshStandardMaterial color={C.roof} /></mesh>

      {/* Roof ventilator grilles (диффузоры) */}
      {[-2, 0, 2].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 2.78, 0]}><cylinderGeometry args={[0.3, 0.3, 0.06, 16]} /><meshStandardMaterial color={C.ventGrille} metalness={0.5} /></mesh>
          <mesh position={[x, 2.8, 0]}><cylinderGeometry args={[0.28, 0.28, 0.02, 16]} /><meshStandardMaterial color={C.bodyDark} wireframe /></mesh>
        </group>
      ))}

      {/* === PANTOGRAPHS (2 per section) === */}
      {[-2.5, 2.5].map((px, pi) => {
        const isUp = pi === 0 && props.pantographUp;
        const pHeight = isUp ? 1.2 : 0.15;
        return (
          <group key={pi} position={[px, 2.78, 0]}>
            {/* Base */}
            <mesh><boxGeometry args={[0.5, 0.06, 0.4]} /><meshStandardMaterial color={C.pantograph} metalness={0.7} /></mesh>
            {/* Arms */}
            <mesh position={[0, pHeight / 2, 0.1]} rotation={[0, 0, isUp ? 0 : 0.5]}>
              <boxGeometry args={[0.04, pHeight, 0.04]} />
              <meshStandardMaterial color={isUp ? C.pantographUp : C.pantograph} metalness={0.7} />
            </mesh>
            <mesh position={[0, pHeight / 2, -0.1]} rotation={[0, 0, isUp ? 0 : -0.5]}>
              <boxGeometry args={[0.04, pHeight, 0.04]} />
              <meshStandardMaterial color={isUp ? C.pantographUp : C.pantograph} metalness={0.7} />
            </mesh>
            {/* Contact strip */}
            {isUp && (
              <mesh position={[0, pHeight + 0.05, 0]}>
                <boxGeometry args={[0.6, 0.03, 0.06]} />
                <meshStandardMaterial color="#cc6600" emissive="#ff8800" emissiveIntensity={0.5} />
              </mesh>
            )}
            <Text position={[0, pHeight + 0.2, 0]} fontSize={0.08} color={isUp ? C.pantographUp : "#666"} anchorX="center">
              {isUp ? "▲ ПОДНЯТ" : "▼ СЛОЖЕН"}
            </Text>
          </group>
        );
      })}

      {/* HV Bus (высоковольтная шина) */}
      <mesh position={[0, 2.9, 0.3]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 5.5, 4]} /><meshStandardMaterial color={C.hvBus} emissive={C.hvBus} emissiveIntensity={0.3} /></mesh>
      {/* HV insulators */}
      {[-2.5, -1.2, 0, 1.2, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 2.82, 0.3]}><cylinderGeometry args={[0.04, 0.04, 0.08, 8]} /><meshStandardMaterial color={C.hvInsulator} /></mesh>
      ))}

      {/* GV (главный выключатель) */}
      <mesh position={[-1.5, 2.82, -0.3]}><cylinderGeometry args={[0.08, 0.08, 0.12, 8]} /><meshStandardMaterial color={C.gv} metalness={0.3} /></mesh>
      <Text position={[-1.5, 2.98, -0.3]} fontSize={0.06} color="#888" anchorX="center">ГВ</Text>

      {/* Resistors on roof */}
      <mesh position={[1, 2.78, -0.4]}><boxGeometry args={[0.6, 0.1, 0.35]} /><meshStandardMaterial color={C.resistor} metalness={0.4} /></mesh>
      <mesh position={[1, 2.84, -0.4]}><boxGeometry args={[0.55, 0.01, 0.3]} /><meshStandardMaterial color="#666" wireframe /></mesh>

      {/* === CAB (с наклоном и метельником) === */}
      <Glow color={fCol} active={props.groundFault} position={[dir * 3.8, 1.5, 0]} size={[1.2, 2.7, 1.55]} />
      {/* Cab roof */}
      <mesh position={[dir * 3.8, 2.88, 0]}><boxGeometry args={[1.25, 0.08, 1.6]} /><meshStandardMaterial color={C.cab} metalness={0.3} /></mesh>
      {/* Windshield (наклон) */}
      <mesh position={[dir * 4.35, 1.8, 0]} rotation={[0, 0, dir * -0.12]}>
        <boxGeometry args={[0.04, 1.2, 1.3]} />
        <meshStandardMaterial color={C.cabWindow} emissive="#1a4565" emissiveIntensity={0.15} metalness={0.95} roughness={0.02} />
      </mesh>
      {/* Side windows */}
      <mesh position={[dir * 3.5, 2.0, 0.79]}><boxGeometry args={[0.8, 0.5, 0.04]} /><meshStandardMaterial color={C.cabWindow} emissive="#1a4565" emissiveIntensity={0.08} /></mesh>
      <mesh position={[dir * 3.5, 2.0, -0.79]}><boxGeometry args={[0.8, 0.5, 0.04]} /><meshStandardMaterial color={C.cabWindow} emissive="#1a4565" emissiveIntensity={0.08} /></mesh>
      {/* Headlights */}
      <mesh position={[dir * 4.4, 1.0, 0.3]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#ffeeaa" emissive="#ffeeaa" emissiveIntensity={isFirst ? 0.8 : 0.1} /></mesh>
      <mesh position={[dir * 4.4, 1.0, -0.3]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#ffeeaa" emissive="#ffeeaa" emissiveIntensity={isFirst ? 0.8 : 0.1} /></mesh>
      {/* Snowplow (метельник/юбка) */}
      <mesh position={[dir * 4.3, 0.08, 0]}><boxGeometry args={[0.15, 0.25, 1.6]} /><meshStandardMaterial color={C.snowplow} metalness={0.6} /></mesh>
      <Text position={[dir * 3.8, 2.55, 0.82]} fontSize={0.12} color="#bacbb9" anchorX="center" rotation={[0, Math.PI / 2, 0]}>{isFirst ? "КАБИНА" : "КАБИНА 2"}</Text>

      {/* === INVERTER (behind cab) === */}
      <Glow color={iCol} active={(props.tractionCurrent ?? 0) > 800} position={[dir * 2.5, 1.4, 0]} size={[1.0, 2.2, 1.3]} />
      <Text position={[dir * 2.5, 2.65, 0]} fontSize={0.1} color="#7788aa" anchorX="center">ИНВЕРТОР</Text>
      <Text position={[dir * 2.5, 2.5, 0]} fontSize={0.08} color={iCol} anchorX="center">{props.tractionCurrent?.toFixed(0) ?? "—"}А</Text>

      {/* === COMPRESSOR (tail) === */}
      <mesh position={[dir * -3.0, 0.7, 0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.22, 0.5, 8]} /><meshStandardMaterial color={C.compressor} metalness={0.55} /></mesh>
      <mesh position={[dir * -3.0, 0.7, -0.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.15, 0.17, 0.4, 8]} /><meshStandardMaterial color={C.compressor} metalness={0.55} /></mesh>
      <Text position={[dir * -3.0, 1.1, 0.5]} fontSize={0.07} color="#7788aa" anchorX="center">КОМПР.</Text>

      {/* === TRANSFORMER (under frame, center, big grey tank) === */}
      <mesh position={[0, -0.35, 0]}><boxGeometry args={[2.5, 0.6, 1.2]} /><meshStandardMaterial color={C.transformer} metalness={0.45} roughness={0.55} /></mesh>
      {/* Transformer cooling radiator fins */}
      {[-1.3, 1.3].map((x, i) => (
        <group key={i}>
          {Array.from({ length: 6 }, (_, j) => (
            <mesh key={j} position={[x, -0.35, -0.5 + j * 0.2]}><boxGeometry args={[0.04, 0.5, 0.12]} /><meshStandardMaterial color={C.transformerFin} metalness={0.5} /></mesh>
          ))}
        </group>
      ))}
      <Text position={[0, -0.05, 0.65]} fontSize={0.1} color={tCol} anchorX="center">ТРАНСФОРМАТОР {props.transformerTemp?.toFixed(0) ?? "—"}°C</Text>

      {/* === AIR TANKS (under frame, sides) === */}
      {[-0.5, 0.5].map((z) => [-2.5, 2.0].map((x, i) => (
        <mesh key={`${z}-${i}`} position={[x, -0.55, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 1.0, 8]} />
          <meshStandardMaterial color={C.airTank} metalness={0.5} />
        </mesh>
      )))}

      {/* === BOGIES (2 per section, 2 axles each = Bo'Bo') === */}
      {[-2.5, 2.5].map((bx) => (
        <group key={bx} position={[bx, -0.55, 0]}>
          <mesh><boxGeometry args={[1.8, 0.1, 0.9]} /><meshStandardMaterial color={C.frame} metalness={0.6} /></mesh>
          {[-0.7, 0.7].map((wx, i) => (
            <group key={i}>
              {/* Wheels */}
              <mesh position={[wx, -0.2, 0.5]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.34, 0.05, 8, 16]} /><meshStandardMaterial color={C.wheel} metalness={0.85} roughness={0.15} /></mesh>
              <mesh position={[wx, -0.2, -0.5]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.34, 0.05, 8, 16]} /><meshStandardMaterial color={C.wheel} metalness={0.85} roughness={0.15} /></mesh>
              {/* Axle */}
              <mesh position={[wx, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 1.1, 6]} /><meshStandardMaterial color="#555" metalness={0.9} /></mesh>
              {/* TED on axle */}
              <mesh position={[wx, -0.05, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.18, 8]} />
                <meshStandardMaterial color={tedCol} emissive={tedCol} emissiveIntensity={(props.tedTemp ?? 0) > 120 ? 0.2 : 0.02} metalness={0.5} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Coupler */}
      <mesh position={[dir * 4.5, 0.05, 0]}><boxGeometry args={[0.4, 0.15, 0.15]} /><meshStandardMaterial color="#555" metalness={0.8} /></mesh>
    </group>
  );
}

function TwoSections(props: Props) {
  return (
    <group>
      <Section xOff={-4.6} props={props} isFirst={true} />
      <Section xOff={4.6} props={props} isFirst={false} />

      {/* Inter-section coupling */}
      <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.6, 0.2, 0.2]} /><meshStandardMaterial color="#555" metalness={0.7} /></mesh>
      <mesh position={[0, 0.5, 0.05]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.4, 4]} /><meshStandardMaterial color="#666" metalness={0.8} /></mesh>

      {/* Rails */}
      {[0.57, -0.57].map((z, i) => (
        <mesh key={i} position={[0, -0.95, z]}><boxGeometry args={[22, 0.04, 0.05]} /><meshStandardMaterial color={C.rail} metalness={0.9} roughness={0.1} /></mesh>
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} position={[-10 + i * 0.52, -0.99, 0]}><boxGeometry args={[0.12, 0.04, 1.4]} /><meshStandardMaterial color={C.sleeper} /></mesh>
      ))}

      {/* Contact wire */}
      {props.pantographUp && (
        <mesh position={[0, 4.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, 22, 4]} />
          <meshStandardMaterial color="#cc6600" emissive="#ff8800" emissiveIntensity={0.6} />
        </mesh>
      )}

      <Text position={[0, -1.15, 1.1]} fontSize={0.14} color="#555" anchorX="center">KZ8A • 2×(2₀-2₀) • 25 кВ 50 Гц • 8800 кВт</Text>
    </group>
  );
}

export default function LocomotiveKZ8A(props: Props) {
  const [visible, setVisible] = useState(false);
  const hi = props.category === "critical" ? C.critical : props.category === "attention" ? C.attention : C.normal;

  if (!visible) {
    return (
      <div onClick={() => setVisible(true)} style={{ width: "100%", height: "340px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-container)", borderRadius: "var(--radius)", cursor: "pointer" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚃</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Нажмите для 3D-модели</div>
          <div style={{ fontSize: "0.6rem", color: "var(--outline)", marginTop: "0.25rem" }}>KZ8A Alstom • Электровоз • 2 секции</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "340px", position: "relative" }}>
      <Canvas camera={{ position: [12, 6, 12], fov: 38 }} style={{ background: "transparent" }} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} dpr={1}
        onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault()); }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 14, 8]} intensity={0.9} />
        <directionalLight position={[-6, 7, -6]} intensity={0.2} color="#3355aa" />
        <pointLight position={[0, 5, 0]} intensity={0.3} color={hi} />
        <TwoSections {...props} />
        <OrbitControls enablePan={false} enableZoom minDistance={6} maxDistance={25} maxPolarAngle={Math.PI / 2.1} autoRotate autoRotateSpeed={0.6} />
        <gridHelper args={[36, 72, "#151a22", "#0c0f14"]} position={[0, -1.02, 0]} />
      </Canvas>
      <div style={{ position: "absolute", bottom: "0.5rem", left: "0.75rem", fontFamily: "var(--font-display)", fontSize: "0.55rem", color: "var(--outline)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        KZ8A Alstom • 25 кВ • 8800 кВт • 200 т • Drag: orbit | Scroll: zoom
      </div>
    </div>
  );
}
