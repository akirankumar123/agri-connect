import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sprout,
  Thermometer,
  Droplets,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Play,
  Square,
  Navigation,
} from "lucide-react";

// ---------------------------------------------------------------------------
// This is a self-contained simulation so the UI is fully interactive on its
// own. To wire it to a real rover:
//  - Replace the sensor drift in `useSensors` with values pushed from your
//    soil/temperature sensors (e.g. over a WebSocket).
//  - Replace the movement loop with a call to your rover's control API
//    (REST endpoint, MQTT topic, ROS service, serial command, etc) when a
//    direction is held, instead of updating local x/y/heading directly.
//  - Keep broadcasting rover x/y/heading back from the rover so the land
//    visual reflects its *actual* position rather than the local simulation.
// ---------------------------------------------------------------------------

const MOVE_STEP = 2.2; // units per tick while a direction is held
const TURN_STEP = 5; // degrees per tick while turning
const TICK_MS = 80;

// Field is modeled as a bounded ~90m x 90m plot (8,100 m² ≈ 2 acres),
// centered on the rover's starting point. Swap BASE_LAT/BASE_LNG for the
// real GPS fix from your rover's receiver — these are placeholder origin
// coordinates only, used to derive a live lat/long from local x/y meters.
const FIELD_HALF = 45;
const ROVER_MARGIN = 5;
const BASE_LAT = 41.8781;
const BASE_LNG = -93.0977;
const METERS_PER_DEG_LAT = 111320;

function toLatLng(x, y) {
  const lat = BASE_LAT - y / METERS_PER_DEG_LAT;
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((BASE_LAT * Math.PI) / 180);
  const lng = BASE_LNG + x / metersPerDegLng;
  return { lat, lng };
}

function formatCoord(v, posLabel, negLabel) {
  return `${Math.abs(v).toFixed(6)}° ${v >= 0 ? posLabel : negLabel}`;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function useSensors(posRef) {
  const [soil, setSoil] = useState({ moisture: 34, ph: 6.6, conductivity: 1.2 });
  const [temp, setTemp] = useState({ ambient: 24.8, ground: 19.3 });

  useEffect(() => {
    const id = setInterval(() => {
      // soil readings drift slowly and shift a little with position, so
      // moving across "terrain" feels like it changes what's underfoot
      const patch = Math.sin(posRef.current.x / 18) + Math.cos(posRef.current.y / 22);
      setSoil((s) => ({
        moisture: clamp(s.moisture + (Math.random() - 0.5) * 0.8 + patch * 0.15, 8, 92),
        ph: clamp(s.ph + (Math.random() - 0.5) * 0.03, 4.5, 8.5),
        conductivity: clamp(s.conductivity + (Math.random() - 0.5) * 0.03, 0.2, 3.5),
      }));
      setTemp((t) => ({
        ambient: clamp(t.ambient + (Math.random() - 0.5) * 0.15, -10, 45),
        ground: clamp(t.ground + (Math.random() - 0.5) * 0.12, -10, 45),
      }));
    }, 1400);
    return () => clearInterval(id);
  }, [posRef]);

  return { soil, temp };
}

function StatCard({ icon: Icon, label, value, unit, accent }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 3,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 11 }}>
        <Icon size={13} style={{ color: accent }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, fontWeight: 500, color: "var(--text)", lineHeight: 1 }}>
          {value}
        </span>
        {unit && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--muted)" }}>{unit}</span>}
      </div>
    </div>
  );
}

function RoverBadge({ size = 40 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <polygon
        points="50,4 96,90 4,90"
        fill="none"
        stroke="var(--rust)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* top-down rover glyph: chassis, four wheels, solar deck, antenna */}
      <g transform="translate(50,52)">
        <line x1="0" y1="-26" x2="0" y2="-16" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="0" cy="-27" r="2.4" fill="var(--ok)" />
        <rect x="-17" y="-15" width="34" height="24" rx="3" fill="var(--rust)" />
        <rect x="-12" y="-10" width="24" height="14" rx="1.5" fill="var(--bg)" opacity="0.85" />
        <circle cx="-20" cy="-11" r="4" fill="var(--text)" />
        <circle cx="20" cy="-11" r="4" fill="var(--text)" />
        <circle cx="-20" cy="11" r="4" fill="var(--text)" />
        <circle cx="20" cy="11" r="4" fill="var(--text)" />
      </g>
    </svg>
  );
}

function CtrlButton({ onDown, onUp, children, disabled }) {
  return (
    <button
      disabled={disabled}
      onMouseDown={disabled ? undefined : onDown}
      onMouseUp={disabled ? undefined : onUp}
      onMouseLeave={disabled ? undefined : onUp}
      onTouchStart={(e) => {
        if (disabled) return;
        e.preventDefault();
        onDown();
      }}
      onTouchEnd={(e) => {
        if (disabled) return;
        e.preventDefault();
        onUp();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: "var(--track)",
        border: "1px solid var(--line)",
        color: disabled ? "var(--muted)" : "var(--text)",
        opacity: disabled ? 0.4 : 1,
        borderRadius: 3,
        padding: "12px 0",
        fontSize: 12,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {children}
    </button>
  );
}

function StartStopButton({ running, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: running ? "rgba(214,82,74,0.14)" : "rgba(90,196,120,0.16)",
        border: `1px solid ${running ? "var(--crit)" : "var(--ok)"}`,
        color: running ? "var(--crit)" : "var(--ok)",
        borderRadius: 3,
        padding: "12px 0",
        fontSize: 12,
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        touchAction: "none",
        transition: "background .2s ease, color .2s ease",
      }}
    >
      {running ? <Square size={14} /> : <Play size={14} />}
      {running ? "Stop" : "Start"}
    </button>
  );
}

export default function RoverMonitor() {
  const posRef = useRef({ x: 0, y: 0, heading: 0 });
  const [pose, setPose] = useState({ x: 0, y: 0, heading: 0 });
  const [trail, setTrail] = useState([{ x: 0, y: 0 }]);
  const heldRef = useRef({ fwd: false, rev: false, left: false, right: false });
  const [activeCmd, setActiveCmd] = useState(null);
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);

  const { soil, temp } = useSensors(posRef);

  // movement loop: applies whatever direction is currently held, every tick,
  // so it behaves like a live remote-control link rather than one-shot steps.
  // Gated on `running` — the rover only responds to input once started.
  useEffect(() => {
    const id = setInterval(() => {
      if (!runningRef.current) return;
      const held = heldRef.current;
      if (!held.fwd && !held.rev && !held.left && !held.right) return;
      const p = posRef.current;
      let heading = p.heading;
      if (held.left) heading -= TURN_STEP;
      if (held.right) heading += TURN_STEP;
      heading = ((heading % 360) + 360) % 360;

      let x = p.x;
      let y = p.y;
      if (held.fwd || held.rev) {
        const dir = held.fwd ? 1 : -1;
        const rad = (heading * Math.PI) / 180;
        x += Math.sin(rad) * MOVE_STEP * dir;
        y -= Math.cos(rad) * MOVE_STEP * dir;
      }
      x = clamp(x, -FIELD_HALF + ROVER_MARGIN, FIELD_HALF - ROVER_MARGIN);
      y = clamp(y, -FIELD_HALF + ROVER_MARGIN, FIELD_HALF - ROVER_MARGIN);

      posRef.current = { x, y, heading };
      setPose({ x, y, heading });
      if (held.fwd || held.rev) {
        setTrail((t) => [...t.slice(-80), { x, y }]);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const setHeld = useCallback((key, val) => {
    if (val && !runningRef.current) return; // ignore drive input while stopped
    heldRef.current[key] = val;
    const label =
      key === "fwd" ? "Forward" : key === "rev" ? "Reverse" : key === "left" ? "Turning left" : "Turning right";
    const anyHeld = Object.values(heldRef.current).some(Boolean);
    setActiveCmd(anyHeld ? label : null);
  }, []);

  const stopAll = useCallback(() => {
    heldRef.current = { fwd: false, rev: false, left: false, right: false };
    setActiveCmd(null);
  }, []);

  const toggleRunning = useCallback(() => {
    setRunning((r) => {
      const next = !r;
      runningRef.current = next;
      if (!next) stopAll(); // stopping the rover also releases any held direction
      return next;
    });
  }, [stopAll]);

  // keyboard support: arrow keys mirror the on-screen d-pad
  useEffect(() => {
    const keyMap = { ArrowUp: "fwd", ArrowDown: "rev", ArrowLeft: "left", ArrowRight: "right" };
    const onDown = (e) => {
      const k = keyMap[e.key];
      if (k) {
        e.preventDefault();
        setHeld(k, true);
      }
      if (e.key === " ") stopAll();
    };
    const onUp = (e) => {
      const k = keyMap[e.key];
      if (k) setHeld(k, false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [setHeld, stopAll]);

  // camera-follow viewbox centered on the rover, so the land visual reads as
  // a live feed of the ground moving beneath/around it
  const cx = pose.x;
  const cy = pose.y;
  const view = 90;
  const toLocal = (p) => ({ x: p.x - cx, y: p.y - cy });
  const trailPts = trail.map(toLocal);
  const pathStr = trailPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const moistureColor = soil.moisture > 55 ? "var(--ok)" : soil.moisture > 25 ? "var(--warn)" : "var(--crit)";

  // field boundary in local (camera-relative) coordinates, plus live GPS
  const fieldLeft = -FIELD_HALF - cx;
  const fieldTop = -FIELD_HALF - cy;
  const fieldSize = FIELD_HALF * 2;
  const { lat, lng } = toLatLng(pose.x, pose.y);

  return (
    <div
      style={{
        "--bg": "#F7FBF7",
        "--panel": "#FFFFFF",
        "--line": "#D9E6DA",
        "--track": "#EDF5EE",
        "--text": "#16241A",
        "--muted": "#5F7864",
        "--rust": "#B85A22",
        "--ok": "#2F9E52",
        "--warn": "#C98A1D",
        "--crit": "#C23B33",
        background: "radial-gradient(circle at 18% -10%, #E3F3E6 0%, transparent 55%), var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: 20,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap');
        button { font-family: inherit; }
      `}</style>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RoverBadge />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 22, lineHeight: 1 }}>Rover Monitor</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)" }}>field unit</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ width: 6, height: 6, borderRadius: 1, background: "var(--ok)", display: "inline-block" }} />
          Live
        </div>
      </div>

      {/* sensors */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 10 }}>
        <StatCard icon={Droplets} label="Soil moisture" value={soil.moisture.toFixed(0)} unit="%" accent={moistureColor} />
        <StatCard icon={Sprout} label="Soil pH" value={soil.ph.toFixed(1)} accent="var(--ok)" />
        <StatCard icon={Sprout} label="Conductivity" value={soil.conductivity.toFixed(2)} unit="mS/cm" accent="var(--ok)" />
        <StatCard icon={Thermometer} label="Ambient temp" value={temp.ambient.toFixed(1)} unit="°C" accent="var(--warn)" />
        <StatCard icon={Thermometer} label="Ground temp" value={temp.ground.toFixed(1)} unit="°C" accent="var(--warn)" />
      </div>

      {/* land visual + controls */}
      <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1fr", gap: 10 }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 3, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 11, color: "var(--muted)" }}>
              Land view — live position
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--muted)" }}>
              <Navigation size={12} style={{ transform: `rotate(${pose.heading}deg)`, color: "var(--rust)" }} />
              {pose.heading.toFixed(0)}°
            </div>
          </div>

          <div
            style={{
              perspective: "1300px",
              height: 420,
              overflow: "hidden",
              borderRadius: 4,
              position: "relative",
              background: "#6E7A4A",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "rotateX(44deg) scale(2.05)",
                transformOrigin: "50% 50%",
              }}
            >
              <svg viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`} width="100%" height="100%" style={{ display: "block" }}>
                <defs>
                  {/* top-down furrowed field: alternating soil ridges, like the rows
                      a rover drives between. Offset by +3 so the rover always sits
                      centered in the gap between two ridges, panning as it moves. */}
                  <pattern
                    id="rows"
                    width="13"
                    height="13"
                    patternUnits="userSpaceOnUse"
                    patternTransform={`translate(${-cx + 3} 0)`}
                  >
                    <rect width="13" height="13" fill="#4E3D28" />
                    <rect x="0" width="7" height="13" fill="#5E4A30" />
                    <rect x="7" width="2" height="13" fill="#372A1B" opacity="0.6" />
                  </pattern>
                  <pattern
                    id="plants"
                    width="13"
                    height="11"
                    patternUnits="userSpaceOnUse"
                    patternTransform={`translate(${-cx + 3} ${-cy})`}
                  >
                    <circle cx="3.5" cy="2.5" r="1" fill="#5FAE5C" />
                    <circle cx="3.5" cy="8" r="1" fill="#5FAE5C" />
                  </pattern>
                  <pattern id="fleck" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform={`translate(${-cx % 9} ${-cy % 9})`}>
                    <circle cx="2" cy="2" r="0.5" fill="#6B5638" opacity="0.4" />
                    <circle cx="6" cy="6" r="0.4" fill="#2E2418" opacity="0.5" />
                  </pattern>
                </defs>
                <rect x={-view} y={-view} width={view * 2} height={view * 2} fill="#8A9463" />
                <rect x={-view} y={-view} width={view * 2} height={view * 2} fill="url(#fleck)" opacity="0.5" />

                {/* the bounded plot itself — roughly 90m x 90m, ~2 acres */}
                <rect x={fieldLeft} y={fieldTop} width={fieldSize} height={fieldSize} fill="url(#rows)" />
                <rect x={fieldLeft} y={fieldTop} width={fieldSize} height={fieldSize} fill="url(#plants)" />
                <rect x={fieldLeft} y={fieldTop} width={fieldSize} height={fieldSize} fill="url(#fleck)" />

                {/* traversed trail */}
                <path d={pathStr} fill="none" stroke="var(--ok)" strokeWidth="1" opacity="0.7" />

                {/* fence line marking the 4 edges of the plot */}
                <rect
                  x={fieldLeft}
                  y={fieldTop}
                  width={fieldSize}
                  height={fieldSize}
                  fill="none"
                  stroke="#3B2A18"
                  strokeWidth="2.2"
                />
                <rect
                  x={fieldLeft}
                  y={fieldTop}
                  width={fieldSize}
                  height={fieldSize}
                  fill="none"
                  stroke="#D8C48A"
                  strokeWidth="0.6"
                  strokeDasharray="3 2"
                />
                {/* corner posts */}
                {[
                  [fieldLeft, fieldTop],
                  [fieldLeft + fieldSize, fieldTop],
                  [fieldLeft, fieldTop + fieldSize],
                  [fieldLeft + fieldSize, fieldTop + fieldSize],
                ].map(([px, py], i) => (
                  <rect key={i} x={px - 1.4} y={py - 1.4} width="2.8" height="2.8" fill="#3B2A18" />
                ))}

                {/* rover, always centered; rotates with heading — drawn as a small
                    top-down rover instead of a directional arrow */}
                <g transform={`rotate(${pose.heading})`}>
                  <circle r="11" fill="none" stroke="var(--rust)" strokeWidth="0.6" opacity="0.4" />
                  <line x1="0" y1="-9" x2="0" y2="-6" stroke="var(--ok)" strokeWidth="1" strokeLinecap="round" />
                  <circle cx="0" cy="-9.5" r="0.9" fill="var(--ok)" />
                  <rect x="-6" y="-5.5" width="12" height="9" rx="1.2" fill="var(--rust)" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.4" />
                  <rect x="-4" y="-3.5" width="8" height="5" rx="0.6" fill="var(--bg)" opacity="0.85" />
                  <circle cx="-7" cy="-4" r="1.5" fill="#111" />
                  <circle cx="7" cy="-4" r="1.5" fill="#111" />
                  <circle cx="-7" cy="4" r="1.5" fill="#111" />
                  <circle cx="7" cy="4" r="1.5" fill="#111" />
                </g>
              </svg>
            </div>

            {/* sky-ish fade at the top edge to sell the tilt as depth, not just a skewed image */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "26%",
                background: "linear-gradient(to bottom, rgba(150,168,188,0.4), rgba(150,168,188,0))",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                boxShadow: "inset 0 0 60px 20px rgba(0,0,0,0.55)",
                pointerEvents: "none",
              }}
            />
          </div>

          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>
              {formatCoord(lat, "N", "S")}, {formatCoord(lng, "E", "W")}
            </span>
            <span>{running ? activeCmd || "Holding position" : "Rover stopped"}</span>
          </div>
          <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>x {pose.x.toFixed(1)}m  y {pose.y.toFixed(1)}m</span>
            <span>plot ~2 acres</span>
          </div>
        </div>

        {/* controls */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 3, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 500, fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
            Controls — press and hold, or use arrow keys
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, flex: 1, alignContent: "start" }}>
            <div />
            <CtrlButton disabled={!running} onDown={() => setHeld("fwd", true)} onUp={() => setHeld("fwd", false)}>
              <ArrowUp size={16} />
            </CtrlButton>
            <div />

            <CtrlButton disabled={!running} onDown={() => setHeld("left", true)} onUp={() => setHeld("left", false)}>
              <ArrowLeft size={16} />
            </CtrlButton>
            <StartStopButton running={running} onToggle={toggleRunning} />
            <CtrlButton disabled={!running} onDown={() => setHeld("right", true)} onUp={() => setHeld("right", false)}>
              <ArrowRight size={16} />
            </CtrlButton>

            <div />
            <CtrlButton disabled={!running} onDown={() => setHeld("rev", true)} onUp={() => setHeld("rev", false)}>
              <ArrowDown size={16} />
            </CtrlButton>
            <div />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: running ? "var(--ok)" : "var(--muted)",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 1,
                background: running ? "var(--ok)" : "var(--muted)",
                display: "inline-block",
              }}
            />
            {running ? "Rover started" : "Rover stopped"}
          </div>
        </div>
      </div>
    </div>
  );
}
