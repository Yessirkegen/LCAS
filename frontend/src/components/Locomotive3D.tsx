import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  healthIndex: number;
  category: string;
  waterTemp: number | null;
  oilTemp: number | null;
  tractionCurrent: number | null;
  groundFault: boolean;
  fuelLevel: number | null;
}

const C = {
  normal: "#75ff9e", attention: "#fdd400", critical: "#ffb4ab",
  cab: "#2d9e42", cabDark: "#238636",
  diesel: "#1a3fa0", dieselAccent: "#2850c0",
  gen: "#1e3890",
  cooling: "#44667a", coolingFan: "#556677",
  inverter: "#2244aa", compressor: "#557799",
  frame: "#222528",
  tank: "#1c1e20",
  wheel: "#3a3a3a",
};

function zone(v: number | null, w: number, c: number) {
  if (v === null) return C.diesel;
  return v > c ? C.critical : v > w ? C.attention : C.normal;
}

function Glow({ color, active, position, size }: { color: string; active: boolean; position: [number, number, number]; size: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) {
      const m = ref.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = active ? 0.25 + Math.sin(s.clock.elapsedTime * 3) * 0.15 : 0.05;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.05} roughness={0.5} metalness={0.4} />
    </mesh>
  );
}

function LocoBody(props: Props) {
  const eCol = zone(props.waterTemp, 91, 115);
  const tCol = zone(props.tractionCurrent, 800, 1000);
  const fCol = props.groundFault ? C.critical : C.cab;
  const fp = Math.max(0.05, (props.fuelLevel ?? 80) / 100);

  return (
    <group>
      {/* Frame */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[10.8, 0.2, 1.7]} /><meshStandardMaterial color={C.frame} metalness={0.7} roughness={0.3} /></mesh>

      {/* Cab 1 */}
      <Glow color={fCol} active={props.groundFault} position={[-4.35, 1.05, 0]} size={[1.7, 1.85, 1.6]} />
      <mesh position={[-4.35, 2.02, 0]}><boxGeometry args={[1.8, 0.1, 1.7]} /><meshStandardMaterial color={C.cabDark} /></mesh>
      <mesh position={[-5.22, 1.3, 0]}><boxGeometry args={[0.04, 0.7, 1.3]} /><meshStandardMaterial color="#0a2535" emissive="#1a4565" emissiveIntensity={0.12} metalness={0.95} roughness={0.02} /></mesh>
      <mesh position={[-4.35, 1.35, 0.82]}><boxGeometry args={[1.1, 0.5, 0.04]} /><meshStandardMaterial color="#0a2535" emissive="#1a4565" emissiveIntensity={0.08} /></mesh>
      <mesh position={[-5.0, 0.5, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#ffeeaa" emissive="#ffeeaa" emissiveIntensity={0.6} /></mesh>
      <Text position={[-4.35, 2.2, 0]} fontSize={0.18} color="#bacbb9" anchorX="center">КАБИНА 1</Text>

      {/* Inverter */}
      <mesh position={[-2.95, 0.85, 0]}><boxGeometry args={[0.9, 1.4, 1.5]} /><meshStandardMaterial color={C.inverter} metalness={0.55} roughness={0.45} /></mesh>
      <Text position={[-2.95, 1.7, 0]} fontSize={0.12} color="#7788aa" anchorX="center">IGBT AC/AC</Text>

      {/* Generator */}
      <Glow color={tCol} active={(props.tractionCurrent ?? 0) > 800} position={[-1.75, 0.95, 0]} size={[1.3, 1.6, 1.45]} />
      <mesh position={[-1.75, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.5, 0.5, 1.1, 16]} /><meshStandardMaterial color={C.gen} metalness={0.6} roughness={0.4} transparent opacity={0.4} /></mesh>
      <mesh position={[-1.75, 1.82, 0]}><cylinderGeometry args={[0.4, 0.4, 0.12, 16]} /><meshStandardMaterial color={C.coolingFan} metalness={0.55} /></mesh>
      <Text position={[-1.75, 2.1, 0]} fontSize={0.13} color="#7788aa" anchorX="center">ГЕН GMG205 {props.tractionCurrent?.toFixed(0) ?? "—"}А</Text>

      {/* Diesel EVO12 */}
      <Glow color={eCol} active={(props.waterTemp ?? 0) > 91} position={[0.15, 1.15, 0]} size={[2.5, 2.0, 1.5]} />
      {[-0.7, -0.35, 0, 0.35, 0.7].map((x, i) => (
        <mesh key={i} position={[0.15 + x, 1.15, 0.77]}><boxGeometry args={[0.03, 1.8, 0.04]} /><meshStandardMaterial color={C.dieselAccent} metalness={0.6} /></mesh>
      ))}
      <mesh position={[-0.25, 2.2, 0.25]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.28, 0.3, 12]} /><meshStandardMaterial color="#243e8a" metalness={0.7} /></mesh>
      <mesh position={[0.5, 2.35, 0]}><cylinderGeometry args={[0.07, 0.09, 0.5, 8]} /><meshStandardMaterial color="#333" metalness={0.5} /></mesh>
      <Text position={[0.15, 2.35, 0.82]} fontSize={0.16} color="#bacbb9" anchorX="center" rotation={[0, Math.PI / 2, 0]}>ДИЗЕЛЬ EVO12</Text>
      <Text position={[0.15, 2.1, 0.82]} fontSize={0.14} color={eCol} anchorX="center" rotation={[0, Math.PI / 2, 0]}>{props.waterTemp?.toFixed(0) ?? "—"}°C</Text>

      {/* Cooling */}
      <mesh position={[2.3, 1.25, 0]}><boxGeometry args={[1.9, 2.15, 1.6]} /><meshStandardMaterial color={C.cooling} metalness={0.4} roughness={0.55} /></mesh>
      <mesh position={[2.3, 2.4, 0]}><cylinderGeometry args={[0.6, 0.6, 0.12, 20]} /><meshStandardMaterial color={C.coolingFan} metalness={0.5} /></mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[3.27, 0.5 + i * 0.22, 0]}><boxGeometry args={[0.03, 0.04, 1.45]} /><meshStandardMaterial color="#334455" /></mesh>
      ))}
      <Text position={[2.3, 2.65, 0]} fontSize={0.14} color="#bacbb9" anchorX="center">РАДИАТОР</Text>

      {/* Compressor */}
      <mesh position={[3.55, 0.72, 0.35]}><cylinderGeometry args={[0.28, 0.3, 0.8, 10]} /><meshStandardMaterial color={C.compressor} metalness={0.55} /></mesh>
      <Text position={[3.55, 1.2, 0.35]} fontSize={0.1} color="#7788aa" anchorX="center">КОМПР.</Text>

      {/* Cab 2 */}
      <Glow color={fCol} active={props.groundFault} position={[4.35, 1.05, 0]} size={[1.7, 1.85, 1.6]} />
      <mesh position={[4.35, 2.02, 0]}><boxGeometry args={[1.8, 0.1, 1.7]} /><meshStandardMaterial color={C.cabDark} /></mesh>
      <mesh position={[5.22, 1.3, 0]}><boxGeometry args={[0.04, 0.7, 1.3]} /><meshStandardMaterial color="#0a2535" emissive="#1a4565" emissiveIntensity={0.12} metalness={0.95} roughness={0.02} /></mesh>
      <Text position={[4.35, 2.2, 0]} fontSize={0.18} color="#bacbb9" anchorX="center">КАБИНА 2</Text>

      {/* Fuel tank */}
      <mesh position={[-0.3, -0.42, 0]}><boxGeometry args={[5.8, 0.42, 1.35]} /><meshStandardMaterial color={C.tank} metalness={0.3} /></mesh>
      <mesh position={[-0.3 - (1 - fp) * 2.9, -0.42, 0.72]}>
        <boxGeometry args={[5.8 * fp, 0.38, 0.03]} />
        <meshStandardMaterial color={(props.fuelLevel ?? 80) < 20 ? C.attention : C.normal} emissive={(props.fuelLevel ?? 80) < 20 ? C.attention : C.normal} emissiveIntensity={0.3} transparent opacity={0.65} />
      </mesh>
      <Text position={[2.6, -0.42, 0.82]} fontSize={0.12} color={(props.fuelLevel ?? 80) < 20 ? C.attention : "#bacbb9"} anchorX="center">ТОПЛИВО {props.fuelLevel?.toFixed(0) ?? "—"}%</Text>

      {/* Bogies */}
      {[-3.3, 3.3].map((bx) => (
        <group key={bx} position={[bx, -0.5, 0]}>
          <mesh><boxGeometry args={[2.4, 0.12, 0.9]} /><meshStandardMaterial color={C.frame} metalness={0.6} /></mesh>
          {[-0.8, 0, 0.8].map((wx, i) => (
            <group key={i}>
              <mesh position={[wx, -0.25, 0.5]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.36, 0.05, 8, 16]} /><meshStandardMaterial color={C.wheel} metalness={0.85} roughness={0.15} /></mesh>
              <mesh position={[wx, -0.25, -0.5]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.36, 0.05, 8, 16]} /><meshStandardMaterial color={C.wheel} metalness={0.85} roughness={0.15} /></mesh>
              <mesh position={[wx, -0.25, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 1.1, 6]} /><meshStandardMaterial color="#555" metalness={0.9} /></mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Couplers */}
      <mesh position={[-5.5, 0.05, 0]}><boxGeometry args={[0.5, 0.15, 0.15]} /><meshStandardMaterial color="#555" metalness={0.8} /></mesh>
      <mesh position={[5.5, 0.05, 0]}><boxGeometry args={[0.5, 0.15, 0.15]} /><meshStandardMaterial color="#555" metalness={0.8} /></mesh>

      {/* Rails */}
      <mesh position={[0, -0.92, 0.55]}><boxGeometry args={[14, 0.04, 0.05]} /><meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} /></mesh>
      <mesh position={[0, -0.92, -0.55]}><boxGeometry args={[14, 0.04, 0.05]} /><meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} /></mesh>
      {Array.from({ length: 28 }, (_, i) => (
        <mesh key={i} position={[-7 + i * 0.52, -0.96, 0]}><boxGeometry args={[0.12, 0.04, 1.4]} /><meshStandardMaterial color="#3d2b1f" /></mesh>
      ))}

      <Text position={[0, -1.1, 1.05]} fontSize={0.12} color="#555" anchorX="center">КОЛЕЯ 1520 ММ</Text>
    </group>
  );
}

export default function Locomotive3D(props: Props) {
  const [visible, setVisible] = useState(false);
  const hi = props.category === "critical" ? C.critical : props.category === "attention" ? C.attention : C.normal;

  if (!visible) {
    return (
      <div onClick={() => setVisible(true)} style={{ width: "100%", height: "340px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-container)", borderRadius: "var(--radius)", cursor: "pointer" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🚂</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Нажмите для 3D-модели</div>
          <div style={{ fontSize: "0.6rem", color: "var(--outline)", marginTop: "0.25rem" }}>ТЭ33А Evolution • Three.js</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "340px", position: "relative" }}>
      <Canvas camera={{ position: [8, 5, 8], fov: 38 }} style={{ background: "transparent" }} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }} dpr={1}
        onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault()); }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 12, 6]} intensity={0.9} />
        <directionalLight position={[-5, 6, -5]} intensity={0.2} color="#3355aa" />
        <pointLight position={[0, 4, 0]} intensity={0.3} color={hi} />
        <LocoBody {...props} />
        <OrbitControls enablePan={false} enableZoom minDistance={5} maxDistance={20} maxPolarAngle={Math.PI / 2.1} autoRotate autoRotateSpeed={0.8} />
        <gridHelper args={[28, 56, "#151a22", "#0c0f14"]} position={[0, -1.0, 0]} />
      </Canvas>
      <div style={{ position: "absolute", bottom: "0.5rem", left: "0.75rem", fontFamily: "var(--font-display)", fontSize: "0.55rem", color: "var(--outline)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        ТЭ33А Evolution • GEVO12 • 4500 л.с. • Drag: orbit | Scroll: zoom
      </div>
    </div>
  );
}
