import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, ReferenceLine
} from "recharts";
import { FOODS } from "./foods.js";

// ─── CONSTANTS ───────────────────────────────────────────────
const DEFAULT_GOALS = { calories: 1900, protein: 175, carbs: 180, fat: 60, fiber: 30, water: 2500 };
const COLORS = { calories: "#facc15", protein: "#4ade80", carbs: "#60a5fa", fat: "#f87171", fiber: "#c084fc", water: "#38bdf8" };
const STORAGE_KEY = "bitetrack_v2";

// ─── HELPERS ─────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().slice(0, 10);
const emptyDay = () => ({ meals: [], water: 0 });
const sumMeals = meals => meals.reduce((a, m) => ({
  calories: a.calories + (m.calories || 0), protein: a.protein + (m.protein || 0),
  carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0), fiber: a.fiber + (m.fiber || 0),
}), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

function loadAll() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { days: {}, goals: DEFAULT_GOALS }; } catch { return { days: {}, goals: DEFAULT_GOALS }; } }
function saveAll(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }

// ─── RING COMPONENT ──────────────────────────────────────────
function Ring({ label, value, goal, color }) {
  const pct = Math.min((value / goal) * 100, 100);
  const r = 26, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ position: "relative", width: 66, height: 66 }}>
        <svg width={66} height={66} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={33} cy={33} r={r} fill="none" stroke="#1e293b" strokeWidth={5} />
          <circle cx={33} cy={33} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1 }}>{Math.round(value)}</span>
          <span style={{ fontSize: 8, color: "#475569", fontFamily: "monospace" }}>g</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "monospace" }}>{label}</span>
    </div>
  );
}

// ─── WATER BOTTLE ────────────────────────────────────────────
function WaterBottle({ amount, goal }) {
  const pct = Math.min(amount / goal, 1);
  const h = 80, w = 36;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={w + 12} height={h + 20} viewBox={`0 0 ${w + 12} ${h + 20}`}>
        {/* Cap */}
        <rect x={10} y={0} width={w - 8} height={8} rx={3} fill="#0369a1" />
        {/* Body outline */}
        <rect x={6} y={8} width={w} height={h} rx={8} fill="#0c1628" stroke="#0369a1" strokeWidth={1.5} />
        {/* Water fill */}
        <clipPath id="bottle-clip">
          <rect x={6} y={8} width={w} height={h} rx={8} />
        </clipPath>
        <rect x={6} y={8 + h * (1 - pct)} width={w} height={h * pct} fill="url(#waterGrad)" clipPath="url(#bottle-clip)" style={{ transition: "y 0.6s ease, height 0.6s ease" }} />
        {/* Gradient */}
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Wave line */}
        {pct > 0.02 && <line x1={6} y1={8 + h * (1 - pct)} x2={w + 6} y2={8 + h * (1 - pct)} stroke="#7dd3fc" strokeWidth={1} strokeOpacity={0.5} />}
        {/* % text */}
        <text x={(w + 12) / 2} y={8 + h / 2 + 4} textAnchor="middle" fill={pct > 0.4 ? "#fff" : "#38bdf8"} fontSize={11} fontFamily="monospace" fontWeight="bold">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span style={{ fontSize: 10, color: "#38bdf8", fontFamily: "monospace" }}>{amount}ml</span>
    </div>
  );
}

// ─── FOOD SEARCH MODAL ───────────────────────────────────────
function FoodModal({ onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [grams, setGrams] = useState("100");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });

  const results = query.length > 1
    ? FOODS.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  function calcNutrients(food, g) {
    const ratio = g / 100;
    return {
      name: `${food.name} (${g}g)`,
      calories: Math.round(food.cal * ratio),
      protein: Math.round(food.p * ratio * 10) / 10,
      carbs: Math.round(food.c * ratio * 10) / 10,
      fat: Math.round(food.f * ratio * 10) / 10,
      fiber: Math.round(food.fi * ratio * 10) / 10,
    };
  }

  function handleAdd() {
    if (!selected || !grams || grams <= 0) return;
    onAdd(calcNutrients(selected, Number(grams)));
  }

  function handleManualAdd() {
    if (!manual.name || !manual.calories) return;
    onAdd({
      name: manual.name,
      calories: Number(manual.calories) || 0,
      protein: Number(manual.protein) || 0,
      carbs: Number(manual.carbs) || 0,
      fat: Number(manual.fat) || 0,
      fiber: Number(manual.fiber) || 0,
    });
  }

  const inp = { background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0f172a", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "90vh", overflow: "auto", padding: 20, border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Adaugă aliment</span>
          <button onClick={onClose} style={{ background: "#1e293b", border: "none", color: "#64748b", borderRadius: 8, width: 30, height: 30, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {!showManual ? <>
          <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
            placeholder="🔍 Caută aliment... (ex: pui, orez, iaurt)"
            style={{ ...inp, marginBottom: 10 }} autoFocus />

          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              {results.map(f => (
                <button key={f.id} onClick={() => setSelected(f)} style={{
                  background: selected?.id === f.id ? "#1e3a5f" : "#0c1628",
                  border: `1px solid ${selected?.id === f.id ? "#0369a1" : "#1e293b"}`,
                  borderRadius: 8, padding: "10px 12px", textAlign: "left", color: "#e2e8f0",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{f.cat}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#facc15", fontFamily: "monospace" }}>{f.cal} kcal/100g</div>
                </button>
              ))}
            </div>
          )}

          {query.length > 1 && results.length === 0 && (
            <div style={{ background: "#0c1628", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid #1e293b", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>❌ Nu am găsit "{query}" în baza de date</div>
              <button onClick={() => setShowManual(true)} style={{
                background: "#1e293b", border: "1px solid #334155", color: "#94a3b8",
                borderRadius: 8, padding: "7px 14px", fontSize: 12, fontFamily: "monospace"
              }}>+ Adaugă manual</button>
            </div>
          )}

          {selected && (
            <div style={{ background: "#0c1628", borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid #16a34a" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{selected.name}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <input type="number" min="1" max="2000" value={grams} onChange={e => setGrams(e.target.value)}
                  style={{ ...inp, width: 100 }} placeholder="Grame" />
                <span style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>grame</span>
              </div>
              {grams > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {[
                    ["Cal", Math.round(selected.cal * grams / 100), "#facc15"],
                    ["P", Math.round(selected.p * grams / 100), COLORS.protein],
                    ["C", Math.round(selected.c * grams / 100), COLORS.carbs],
                    ["G", Math.round(selected.f * grams / 100), COLORS.fat],
                    ["F", Math.round(selected.fi * grams / 100), COLORS.fiber],
                  ].map(([l, v, c]) => (
                    <span key={l} style={{ background: "#0f172a", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontFamily: "monospace", color: c }}>{l}: {v}</span>
                  ))}
                </div>
              )}
              <button onClick={handleAdd} style={{
                width: "100%", padding: "10px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#16a34a,#4ade80)",
                color: "#052e16", fontWeight: 700, fontSize: 13
              }}>✓ Adaugă</button>
            </div>
          )}

          <button onClick={() => setShowManual(true)} style={{
            width: "100%", padding: "9px", borderRadius: 8, border: "1px solid #334155",
            background: "transparent", color: "#64748b", fontSize: 12, fontFamily: "monospace"
          }}>Nu găsesc alimentul → Adaugă manual</button>
        </> : <>
          <button onClick={() => setShowManual(false)} style={{ background: "none", border: "none", color: "#38bdf8", fontSize: 12, fontFamily: "monospace", marginBottom: 12, padding: 0 }}>← Înapoi la căutare</button>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={manual.name} onChange={e => setManual({ ...manual, name: e.target.value })} placeholder="Nume aliment *" style={inp} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Calorii (kcal) *","calories"],["Proteine (g)","protein"],["Carbohidrați (g)","carbs"],["Grăsimi (g)","fat"],["Fibre (g)","fiber"]].map(([ph, key]) => (
                <input key={key} type="number" min="0" placeholder={ph} value={manual[key]}
                  onChange={e => setManual({ ...manual, [key]: e.target.value })}
                  style={{ ...inp, fontSize: 12 }} />
              ))}
            </div>
            <button onClick={handleManualAdd} style={{
              padding: "11px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg,#16a34a,#4ade80)",
              color: "#052e16", fontWeight: 700, fontSize: 13
            }}>+ Adaugă</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── GOALS MODAL ─────────────────────────────────────────────
function GoalsModal({ goals, onSave, onClose }) {
  const [g, setG] = useState({ ...goals });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0f172a", borderRadius: 16, width: "100%", maxWidth: 400, padding: 20, border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Obiective zilnice</span>
          <button onClick={onClose} style={{ background: "#1e293b", border: "none", color: "#64748b", borderRadius: 8, width: 30, height: 30, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[["Calorii (kcal)","calories"],["Proteine (g)","protein"],["Carbohidrați (g)","carbs"],["Grăsimi (g)","fat"],["Fibre (g)","fiber"],["Apă (ml)","water"]].map(([label, key]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0c1628", borderRadius: 8, padding: "8px 12px", border: "1px solid #1e293b" }}>
              <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{label}</span>
              <input type="number" min="0" value={g[key]} onChange={e => setG({ ...g, [key]: Number(e.target.value) })}
                style={{ background: "transparent", border: "none", color: "#e2e8f0", fontSize: 13, fontWeight: 700, fontFamily: "monospace", width: 70, textAlign: "right", outline: "none" }} />
            </div>
          ))}
        </div>
        <button onClick={() => { onSave(g); onClose(); }} style={{
          marginTop: 14, width: "100%", padding: "11px", borderRadius: 8, border: "none",
          background: "linear-gradient(135deg,#16a34a,#4ade80)", color: "#052e16", fontWeight: 700, fontSize: 13
        }}>Salvează obiectivele</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [store, setStore] = useState(loadAll);
  const [tab, setTab] = useState("azi");
  const [showFood, setShowFood] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [customWater, setCustomWater] = useState("");
  const [chartMetric, setChartMetric] = useState("calories");

  const goals = store.goals || DEFAULT_GOALS;
  const today = todayKey();
  const dayData = store.days[today] || emptyDay();
  const totals = sumMeals(dayData.meals);
  const calPct = Math.round((totals.calories / goals.calories) * 100);

  function persist(updated) { setStore(updated); saveAll(updated); }
  function updateDay(newDay) { persist({ ...store, days: { ...store.days, [today]: newDay } }); }
  function addWater(ml) { updateDay({ ...dayData, water: (dayData.water || 0) + ml }); }
  function removeWater(ml) { updateDay({ ...dayData, water: Math.max(0, (dayData.water || 0) - ml) }); }
  function deleteMeal(i) { updateDay({ ...dayData, meals: dayData.meals.filter((_, idx) => idx !== i) }); }
  function addMeal(meal) {
    const m = { ...meal, time: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) };
    updateDay({ ...dayData, meals: [...dayData.meals, m] });
    setShowFood(false);
  }

  // Last 30 days for chart
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    const s = sumMeals((store.days[key] || emptyDay()).meals);
    return {
      label: d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" }),
      shortLabel: d.toLocaleDateString("ro-RO", { weekday: "short" }),
      ...s, water: (store.days[key] || emptyDay()).water || 0, key
    };
  }).filter(d => d.calories > 0 || d.water > 0);

  const chartOptions = [
    { key: "calories", label: "Calorii", unit: "kcal" },
    { key: "protein", label: "Proteine", unit: "g" },
    { key: "carbs", label: "Carbs", unit: "g" },
    { key: "fat", label: "Grăsimi", unit: "g" },
    { key: "fiber", label: "Fibre", unit: "g" },
  ];

  const C = {
    card: { background: "#0f172a", borderRadius: 16, padding: 16, border: "1px solid #1e293b" },
    label: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "monospace", display: "block", marginBottom: 10 },
    inp: { background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "monospace", outline: "none" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080f1a", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; font-family: inherit; }
        input { outline: none; font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
      `}</style>

      {showFood && <FoodModal onAdd={addMeal} onClose={() => setShowFood(false)} />}
      {showGoals && <GoalsModal goals={goals} onSave={g => persist({ ...store, goals: g })} onClose={() => setShowGoals(false)} />}

      {/* Header */}
      <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>BITE<span style={{ color: "#4ade80" }}>TRACK</span></div>
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", marginTop: 1 }}>
            {new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowGoals(true)} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "5px 10px", fontSize: 11 }}>⚙️ Obiective</button>
          <div style={{
            background: calPct >= 100 ? "#7f1d1d" : calPct > 85 ? "#78350f" : "#14532d",
            border: `1px solid ${calPct >= 100 ? "#dc2626" : calPct > 85 ? "#f59e0b" : "#16a34a"}`,
            borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 700, fontFamily: "monospace",
            color: calPct >= 100 ? "#fca5a5" : calPct > 85 ? "#fde68a" : "#86efac"
          }}>{totals.calories} / {goals.calories}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "14px 20px 0", borderBottom: "1px solid #1e293b" }}>
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

      <div style={{ padding: "14px 20px 100px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ══════════ AZI ══════════ */}
        {tab === "azi" && <>

          {/* Macro rings */}
          <div style={C.card}>
            <span style={C.label}>Macronutrienți</span>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <Ring label="Proteine" value={totals.protein} goal={goals.protein} color={COLORS.protein} />
              <Ring label="Carbs" value={totals.carbs} goal={goals.carbs} color={COLORS.carbs} />
              <Ring label="Grăsimi" value={totals.fat} goal={goals.fat} color={COLORS.fat} />
              <Ring label="Fibre" value={totals.fiber} goal={goals.fiber} color={COLORS.fiber} />
            </div>
          </div>

          {/* Calorii bar */}
          <div style={C.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ ...C.label, marginBottom: 0 }}>Calorii</span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: calPct >= 100 ? "#f87171" : "#64748b" }}>{calPct}%</span>
            </div>
            <div style={{ height: 10, background: "#1e293b", borderRadius: 5, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${Math.min(calPct, 100)}%`, borderRadius: 5,
                background: calPct >= 100 ? "#ef4444" : calPct > 85 ? "#f59e0b" : "linear-gradient(90deg,#16a34a,#4ade80)",
                transition: "width 0.5s ease"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 10, color: "#4ade80", fontFamily: "monospace" }}>Consumat: {totals.calories} kcal</span>
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>Rămas: {Math.max(0, goals.calories - totals.calories)} kcal</span>
            </div>
          </div>

          {/* Hidratare */}
          <div style={C.card}>
            <span style={C.label}>Hidratare</span>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <WaterBottle amount={dayData.water || 0} goal={goals.water} />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#38bdf8", fontFamily: "monospace" }}>{dayData.water || 0} ml</span>
                    <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{goals.water} ml</span>
                  </div>
                  <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min((dayData.water || 0) / goals.water * 100, 100)}%`, background: "linear-gradient(90deg,#0ea5e9,#38bdf8)", borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                  {[150, 250, 330, 500].map(ml => (
                    <button key={ml} onClick={() => addWater(ml)} style={{
                      background: "#0c4a6e", border: "1px solid #0369a1", color: "#38bdf8",
                      borderRadius: 7, padding: "5px 9px", fontSize: 11, fontFamily: "monospace"
                    }}>+{ml}</button>
                  ))}
                  <button onClick={() => removeWater(250)} style={{
                    background: "#1e293b", border: "1px solid #334155", color: "#64748b",
                    borderRadius: 7, padding: "5px 9px", fontSize: 11, fontFamily: "monospace"
                  }}>−250</button>
                </div>
                {/* Custom water */}
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" min="1" placeholder="Altă cantitate (ml)" value={customWater}
                    onChange={e => setCustomWater(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && customWater > 0) { addWater(Number(customWater)); setCustomWater(""); } }}
                    style={{ ...C.inp, flex: 1, fontSize: 12, padding: "6px 10px" }} />
                  <button onClick={() => { if (customWater > 0) { addWater(Number(customWater)); setCustomWater(""); } }}
                    disabled={!customWater || customWater <= 0}
                    style={{
                      background: customWater > 0 ? "#0c4a6e" : "#1e293b",
                      border: `1px solid ${customWater > 0 ? "#0369a1" : "#334155"}`,
                      color: customWater > 0 ? "#38bdf8" : "#475569",
                      borderRadius: 7, padding: "6px 10px", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap"
                    }}>+ ml</button>
                </div>
              </div>
            </div>
          </div>

          {/* Line chart cu switch */}
          <div style={C.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ ...C.label, marginBottom: 0 }}>Evoluție</span>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {chartOptions.map(o => (
                  <button key={o.key} onClick={() => setChartMetric(o.key)} style={{
                    padding: "3px 8px", borderRadius: 6, border: "none", fontSize: 10,
                    fontFamily: "monospace", fontWeight: 600,
                    background: chartMetric === o.key ? COLORS[o.key] : "#1e293b",
                    color: chartMetric === o.key ? "#000" : "#475569",
                  }}>{o.label}</button>
                ))}
              </div>
            </div>
            {last30.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={last30}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, fontSize: 10, fontFamily: "monospace" }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: COLORS[chartMetric] }}
                    formatter={(v) => [`${v} ${chartOptions.find(o => o.key === chartMetric)?.unit}`, chartOptions.find(o => o.key === chartMetric)?.label]}
                  />
                  <ReferenceLine y={goals[chartMetric]} stroke={COLORS[chartMetric]} strokeDasharray="4 4" strokeOpacity={0.4} />
                  <Line type="monotone" dataKey={chartMetric} stroke={COLORS[chartMetric]} strokeWidth={2} dot={{ fill: COLORS[chartMetric], r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontSize: 12 }}>
                Adaugă mese pentru a vedea evoluția
              </div>
            )}
          </div>

          {/* Mese */}
          <div style={C.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ ...C.label, marginBottom: 0 }}>Mese azi ({dayData.meals.length})</span>
              <button onClick={() => setShowFood(true)} style={{
                background: "linear-gradient(135deg,#16a34a,#4ade80)", border: "none",
                color: "#052e16", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700
              }}>+ Adaugă</button>
            </div>
            {dayData.meals.length === 0
              ? <div style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "14px 0" }}>Nicio masă înregistrată</div>
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

        {/* ══════════ ADAUGĂ ══════════ */}
        {tab === "adaugă" && <>
          <div style={{ ...C.card, border: "1px solid #1e3a5f", background: "#0c1a2e" }}>
            <span style={{ ...C.label, color: "#38bdf8" }}>🤖 Cum funcționează</span>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              Caută alimentul în baza de date de <strong style={{ color: "#e2e8f0" }}>~270 alimente românești</strong>. Dacă nu îl găsești, poți adăuga manual sau să îmi trimiți mie în chat ce ai mâncat și calculez eu.
            </div>
          </div>
          <button onClick={() => setShowFood(true)} style={{
            padding: "16px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg,#16a34a,#4ade80)",
            color: "#052e16", fontSize: 16, fontWeight: 700, letterSpacing: "0.02em"
          }}>🔍 Caută aliment și adaugă</button>

          {/* Apă */}
          <div style={C.card}>
            <span style={C.label}>Adaugă apă</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {[150, 250, 330, 500, 750].map(ml => (
                <button key={ml} onClick={() => { addWater(ml); setTab("azi"); }} style={{
                  background: "#0c4a6e", border: "1px solid #0369a1", color: "#38bdf8",
                  borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "monospace"
                }}>+{ml}ml</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" min="1" placeholder="Altă cantitate (ml)" value={customWater}
                onChange={e => setCustomWater(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && customWater > 0) { addWater(Number(customWater)); setCustomWater(""); setTab("azi"); } }}
                style={{ ...C.inp, flex: 1 }} />
              <button onClick={() => { if (customWater > 0) { addWater(Number(customWater)); setCustomWater(""); setTab("azi"); } }}
                disabled={!customWater || customWater <= 0}
                style={{
                  background: customWater > 0 ? "#0c4a6e" : "#1e293b",
                  border: `1px solid ${customWater > 0 ? "#0369a1" : "#334155"}`,
                  color: customWater > 0 ? "#38bdf8" : "#475569",
                  borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: "monospace", fontWeight: 600
                }}>+ Adaugă</button>
            </div>
          </div>
        </>}

        {/* ══════════ ISTORIC ══════════ */}
        {tab === "istoric" && <>
          <div style={C.card}>
            <span style={C.label}>Calorii — istoric</span>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={last30.slice(-14)} barSize={16}>
                <XAxis dataKey="shortLabel" tick={{ fontSize: 9, fill: "#475569", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11, fontFamily: "monospace" }} itemStyle={{ color: "#facc15" }} />
                <ReferenceLine y={goals.calories} stroke="#facc15" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Bar dataKey="calories" fill="#facc15" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={C.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ ...C.label, marginBottom: 0 }}>Evoluție nutrienți</span>
              <div style={{ display: "flex", gap: 3 }}>
                {chartOptions.map(o => (
                  <button key={o.key} onClick={() => setChartMetric(o.key)} style={{
                    padding: "3px 7px", borderRadius: 5, border: "none", fontSize: 9,
                    fontFamily: "monospace", fontWeight: 700,
                    background: chartMetric === o.key ? COLORS[o.key] : "#1e293b",
                    color: chartMetric === o.key ? "#000" : "#475569",
                  }}>{o.label}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={last30}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="shortLabel" tick={{ fontSize: 9, fill: "#475569" }} axisLine={false} tickLine={false} interval={Math.floor(last30.length / 6)} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "#0c1628", border: "1px solid #1e293b", borderRadius: 8, fontSize: 10 }} itemStyle={{ color: COLORS[chartMetric] }} />
                <ReferenceLine y={goals[chartMetric]} stroke={COLORS[chartMetric]} strokeDasharray="4 4" strokeOpacity={0.4} />
                <Line type="monotone" dataKey={chartMetric} stroke={COLORS[chartMetric]} strokeWidth={2} dot={{ fill: COLORS[chartMetric], r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={C.card}>
            <span style={C.label}>Rezumat zile recente</span>
            {last30.slice().reverse().slice(0, 14).map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0c1628", borderRadius: 8, padding: "8px 12px", marginBottom: 5, border: "1px solid #1e293b" }}>
                <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", width: 80 }}>{d.label}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["calories","kcal","#facc15"],["protein","P","#4ade80"],["carbs","C","#60a5fa"],["fat","G","#f87171"]].map(([k,u,c]) => (
                    <span key={k} style={{ fontSize: 10, fontFamily: "monospace", color: c }}>{d[k]}{u}</span>
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
