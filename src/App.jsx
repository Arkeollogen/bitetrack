import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

const DAILY_GOALS = { calories: 1900, protein: 175, carbs: 180, fat: 60, fiber: 30, water: 2500 };
const COLORS = { protein: "#4ade80", carbs: "#facc15", fat: "#f87171", fiber: "#60a5fa" };
const STORAGE_KEY = "bitetrack_v1";

function todayKey() { return new Date().toISOString().slice(0, 10); }
function emptyDay() { return { meals: [], water: 0 }; }
function sumMeals(meals) {
  return meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0),
    fat: acc.fat + (m.fat || 0),
    fiber: acc.fiber + (m.fiber || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function Ring({ label, value, goal, color }) {
  const pct = Math.min((value / goal) * 100, 100);
  const r = 28, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }} />
      </svg>
      <div style={{ marginTop: -54, marginBottom: 30, textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>{Math.round(value)}</div>
        <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>g</div>
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>{label}</div>
    </div>
  );
}

function WaterBar({ amount, goal }) {
  const pct = Math.min(amount / goal, 1);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#38bdf8", fontFamily: "monospace" }}>💧 {amount}ml</span>
        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{goal}ml</span>
      </div>
      <div style={{ height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct * 100}%`,
          background: "linear-gradient(90deg,#0ea5e9,#38bdf8)",
          borderRadius: 4, transition: "width 0.5s ease"
        }} />
      </div>
    </div>
  );
}

export default function App() {
  const [allData, setAllData] = useState(load);
  const [tab, setTab] = useState("azi");
  const [customWater, setCustomWater] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCal, setManualCal] = useState("");
  const [manualProt, setManualProt] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualFiber, setManualFiber] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const today = todayKey();
  const dayData = allData[today] || emptyDay();
  const totals = sumMeals(dayData.meals);
  const calPct = Math.round((totals.calories / DAILY_GOALS.calories) * 100);

  function persist(updated) { setAllData(updated); save(updated); }
  function addWater(ml) { persist({ ...allData, [today]: { ...dayData, water: (dayData.water || 0) + ml } }); }
  function removeWater(ml) { persist({ ...allData, [today]: { ...dayData, water: Math.max(0, (dayData.water || 0) - ml) } }); }
  function deleteMeal(i) { persist({ ...allData, [today]: { ...dayData, meals: dayData.meals.filter((_, idx) => idx !== i) } }); }

  function handleManualAdd() {
    if (!manualName.trim() || !manualCal) { setAddError("Nume și calorii sunt obligatorii."); return; }
    const meal = {
      name: manualName.trim(),
      calories: Number(manualCal) || 0, protein: Number(manualProt) || 0,
      carbs: Number(manualCarbs) || 0, fat: Number(manualFat) || 0, fiber: Number(manualFiber) || 0,
      time: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
    };
    persist({ ...allData, [today]: { ...dayData, meals: [...dayData.meals, meal] } });
    setManualName(""); setManualCal(""); setManualProt(""); setManualCarbs(""); setManualFat(""); setManualFiber("");
    setAddError(""); setAddSuccess("✓ Masă adăugată!");
    setTimeout(() => setAddSuccess(""), 2500);
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const s = sumMeals((allData[key] || emptyDay()).meals);
    return { label: d.toLocaleDateString("ro-RO", { weekday: "short" }), ...s, water: (allData[key] || emptyDay()).water || 0 };
  });

  const C = {
    card: { background: "#0f172a", borderRadius: 16, padding: 16, border: "1px solid #1e293b", marginBottom: 0 },
    label: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 10, display: "block" },
    input: { width: "100%", background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", outline: "none" },
    btn: { cursor: "pointer" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080f1a", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; font-family: inherit; }
        input, textarea { outline: none; font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>
            BITE<span style={{ color: "#4ade80" }}>TRACK</span>
          </div>
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", marginTop: 2 }}>
            {new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <div style={{
          background: calPct >= 100 ? "#7f1d1d" : calPct > 85 ? "#78350f" : "#14532d",
          border: `1px solid ${calPct >= 100 ? "#dc2626" : calPct > 85 ? "#f59e0b" : "#16a34a"}`,
          borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, fontFamily: "monospace",
          color: calPct >= 100 ? "#fca5a5" : calPct > 85 ? "#fde68a" : "#86efac"
        }}>
          {totals.calories} / {DAILY_GOALS.calories} kcal
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "16px 20px 0", borderBottom: "1px solid #1e293b" }}>
        {["azi", "adaugă", "istoric"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "6px 18px", borderRadius: "8px 8px 0 0", border: "none", fontSize: 12,
            fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace",
            background: tab === t ? "#0f172a" : "transparent",
            color: tab === t ? "#4ade80" : "#475569",
            borderBottom: tab === t ? "2px solid #4ade80" : "2px solid transparent",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "16px 20px 100px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── AZI ── */}
        {tab === "azi" && <>
          <div style={C.card}>
            <span style={C.label}>Macronutrienți</span>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <Ring label="Proteine" value={totals.protein} goal={DAILY_GOALS.protein} color={COLORS.protein} />
              <Ring label="Carbs" value={totals.carbs} goal={DAILY_GOALS.carbs} color={COLORS.carbs} />
              <Ring label="Grăsimi" value={totals.fat} goal={DAILY_GOALS.fat} color={COLORS.fat} />
              <Ring label="Fibre" value={totals.fiber} goal={DAILY_GOALS.fiber} color={COLORS.fiber} />
            </div>
          </div>

          <div style={C.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ ...C.label, marginBottom: 0 }}>Calorii</span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: calPct >= 100 ? "#f87171" : "#64748b" }}>{calPct}%</span>
            </div>
            <div style={{ height: 10, background: "#1e293b", borderRadius: 5, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 5, width: `${Math.min(calPct, 100)}%`,
                background: calPct >= 100 ? "#ef4444" : calPct > 85 ? "#f59e0b" : "linear-gradient(90deg,#16a34a,#4ade80)",
                transition: "width 0.5s ease"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "#4ade80", fontFamily: "monospace" }}>Consumat: {totals.calories} kcal</span>
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>Rămas: {Math.max(0, DAILY_GOALS.calories - totals.calories)} kcal</span>
            </div>
          </div>

          <div style={C.card}>
            <span style={C.label}>Hidratare</span>
            <WaterBar amount={dayData.water || 0} goal={DAILY_GOALS.water} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {[150, 250, 330, 500].map(ml => (
                <button key={ml} onClick={() => addWater(ml)} style={{
                  background: "#0c4a6e", border: "1px solid #0369a1", color: "#38bdf8",
                  borderRadius: 8, padding: "5px 10px", fontSize: 11, fontFamily: "monospace"
                }}>+{ml}ml</button>
              ))}
              <button onClick={() => removeWater(250)} style={{
                background: "#1e293b", border: "1px solid #334155", color: "#64748b",
                borderRadius: 8, padding: "5px 10px", fontSize: 11, fontFamily: "monospace"
              }}>−250ml</button>
            </div>
          </div>

          <div style={C.card}>
            <span style={C.label}>Mese azi ({dayData.meals.length})</span>
            {dayData.meals.length === 0
              ? <div style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Nicio masă înregistrată</div>
              : dayData.meals.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0c1628", borderRadius: 10, padding: "10px 12px", marginBottom: 6, border: "1px solid #1e293b" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginTop: 2 }}>
                      {m.time} · P:{m.protein}g C:{m.carbs}g G:{m.fat}g F:{m.fiber}g
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", fontFamily: "monospace" }}>{m.calories}</span>
                    <button onClick={() => deleteMeal(i)} style={{ background: "#1e293b", border: "none", color: "#64748b", borderRadius: 6, width: 24, height: 24, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                </div>
              ))
            }
          </div>
        </>}

        {/* ── ADAUGĂ ── */}
        {tab === "adaugă" && <>
          <div style={{ ...C.card, border: "1px solid #1e3a5f", background: "#0c1a2e" }}>
            <span style={{ ...C.label, color: "#38bdf8" }}>🤖 Cum funcționează</span>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              Scrie-mi sau trimite-mi o poză <strong style={{ color: "#e2e8f0" }}>direct în chat</strong> cu ce ai mâncat — îți calculez instant caloriile și macros, și le bagi mai jos.
            </div>
          </div>

          <div style={C.card}>
            <span style={C.label}>Adaugă masă</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={manualName} onChange={e => setManualName(e.target.value)}
                placeholder="Nume masă / aliment *" style={C.input} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Calorii (kcal) *", manualCal, setManualCal],
                  ["Proteine (g)", manualProt, setManualProt],
                  ["Carbohidrați (g)", manualCarbs, setManualCarbs],
                  ["Grăsimi (g)", manualFat, setManualFat],
                  ["Fibre (g)", manualFiber, setManualFiber],
                ].map(([ph, val, set]) => (
                  <input key={ph} type="number" min="0" placeholder={ph} value={val}
                    onChange={e => set(e.target.value)}
                    style={{ ...C.input, fontSize: 12 }} />
                ))}
              </div>
              {addError && <div style={{ color: "#f87171", fontSize: 12, fontFamily: "monospace" }}>{addError}</div>}
              {addSuccess && <div style={{ color: "#4ade80", fontSize: 12, fontFamily: "monospace" }}>{addSuccess}</div>}
              <button onClick={handleManualAdd} style={{
                padding: "12px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#16a34a,#4ade80)",
                color: "#052e16", fontSize: 14, fontWeight: 700
              }}>+ Adaugă masa</button>
            </div>
          </div>

          <div style={C.card}>
            <span style={C.label}>Adaugă apă</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {[150, 250, 330, 500, 750].map(ml => (
                <button key={ml} onClick={() => { addWater(ml); setTab("azi"); }} style={{
                  background: "#0c4a6e", border: "1px solid #0369a1", color: "#38bdf8",
                  borderRadius: 8, padding: "7px 12px", fontSize: 12, fontFamily: "monospace"
                }}>+{ml}ml</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" min="1" placeholder="Altă cantitate (ml)" value={customWater}
                onChange={e => setCustomWater(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && customWater > 0) { addWater(Number(customWater)); setCustomWater(""); setTab("azi"); } }}
                style={{ ...C.input, flex: 1 }} />
              <button
                onClick={() => { if (customWater > 0) { addWater(Number(customWater)); setCustomWater(""); setTab("azi"); } }}
                disabled={!customWater || customWater <= 0}
                style={{
                  background: customWater > 0 ? "#0c4a6e" : "#1e293b",
                  border: `1px solid ${customWater > 0 ? "#0369a1" : "#334155"}`,
                  color: customWater > 0 ? "#38bdf8" : "#475569",
                  borderRadius: 8, padding: "8px 14px", fontSize: 12, fontFamily: "monospace",
                  fontWeight: 600, whiteSpace: "nowrap"
                }}>+ Adaugă</button>
            </div>
          </div>
        </>}

        {/* ── ISTORIC ── */}
        {tab === "istoric" && <>
          <div style={C.card}>
            <span style={C.label}>Calorii — 7 zile</span>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={last7} barSize={22}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#475569", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#4ade80" }} />
                <Bar dataKey="calories" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={C.card}>
            <span style={C.label}>Proteine — 7 zile</span>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={last7}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#475569", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }} itemStyle={{ color: COLORS.protein }} />
                <Line type="monotone" dataKey="protein" stroke={COLORS.protein} strokeWidth={2} dot={{ fill: COLORS.protein, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={C.card}>
            <span style={C.label}>Rezumat pe zile</span>
            {last7.slice().reverse().map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0c1628", borderRadius: 8, padding: "8px 12px", marginBottom: 5, border: "1px solid #1e293b" }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace", width: 34 }}>{d.label}</span>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["calories","kcal","#f59e0b"],["protein","P","#4ade80"],["carbs","C","#facc15"],["fat","G","#f87171"]].map(([k,u,c]) => (
                    <span key={k} style={{ fontSize: 11, fontFamily: "monospace", color: c }}>{d[k]}{u}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
}
