import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

const KEYS = {
  products: "biz_products", inventory: "biz_inventory", sales: "biz_sales",
  expenses: "biz_expenses", deposits: "biz_deposits",
  purchaseOrders: "biz_purchase_orders", refunds: "biz_refunds", theme: "biz_theme",
};
const load = (key, fb = []) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const SEED_PRODUCTS = [
  { id: "p1", sku: "CONJ-001", name: "CONJUGAR Flashcards Vol.1", brand: "CONJUGAR", category: "digital", cost: 2.50 },
  { id: "p2", sku: "SAVO-001", name: "SAVIO Wooden Sorting Toy", brand: "SAVIO TOYS", category: "physical", cost: 8.50 },
  { id: "p3", sku: "SAVO-002", name: "SAVIO Wooden Puzzle Set", brand: "SAVIO TOYS", category: "physical", cost: 11.00 },
];
const SEED_INVENTORY = { p2: 50, p3: 30 };
const PLATFORMS = ["Amazon", "Shopify", "Vinted", "Wayfair", "B&Q", "eBay", "Etsy", "Direct", "Other"];
const EXPENSE_CATEGORIES = ["Advertising", "Software/Tools", "Shipping Supplies", "Storage/Warehouse", "Canton Fair", "Content Creation", "Professional Services", "Office Supplies", "Travel", "Other"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt  = n => (typeof n === "number" ? n.toFixed(2) : "0.00");
const fmtC = n => "€" + fmt(n);
const todayStr = () => new Date().toISOString().split("T")[0];

// ─── Colours ──────────────────────────────────────────────────────────────────
const DARK = {
  bg: "#0d0f14", surface: "#161a24", surfaceAlt: "#1e2330", border: "#2a2f3e",
  accent: "#4fffb0", accentGlow: "rgba(79,255,176,0.15)", accentText: "#000",
  red: "#ff5c7a", yellow: "#ffd166", blue: "#5ba4ff", purple: "#b48fff",
  text: "#e8ecf4", textMuted: "#6b7590", textDim: "#3d4459",
  navBg: "#161a24", modalBg: "#161a24", inputBg: "#1e2330",
};
const LIGHT = {
  bg: "#f0f2f7", surface: "#ffffff", surfaceAlt: "#f5f6fa", border: "#dde1ee",
  accent: "#0a8c5c", accentGlow: "rgba(10,140,92,0.12)", accentText: "#fff",
  red: "#d93a55", yellow: "#c48a00", blue: "#2563eb", purple: "#7c3aed",
  text: "#1a1f2e", textMuted: "#6b7590", textDim: "#b0b8cc",
  navBg: "#ffffff", modalBg: "#ffffff", inputBg: "#f0f2f7",
};

const makeStyles = C => `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${C.bg};color:${C.text};font-family:'Syne',sans-serif;min-height:100vh;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:${C.surface};}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
  input,select,textarea{background:${C.inputBg};border:1px solid ${C.border};color:${C.text};padding:8px 12px;border-radius:6px;font-family:'Syne',sans-serif;font-size:13px;width:100%;outline:none;transition:border-color .2s;}
  input:focus,select:focus,textarea:focus{border-color:${C.accent};}
  select option{background:${C.surface};color:${C.text};}
  button{font-family:'Syne',sans-serif;cursor:pointer;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;transition:all .2s;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;padding:10px 12px;background:${C.surfaceAlt};color:${C.textMuted};font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid ${C.border};}
  td{padding:10px 12px;border-bottom:1px solid ${C.border};color:${C.text};font-family:'DM Mono',monospace;font-size:12px;}
  tr:hover td{background:${C.surfaceAlt};}
  .mono{font-family:'DM Mono',monospace;}
  .tag{display:inline-block;padding:2px 8px;border-radius:100px;font-size:11px;font-weight:600;}
  .tag-green{background:rgba(79,255,176,.15);color:${C.accent};}
  .tag-red{background:rgba(255,92,122,.15);color:${C.red};}
  .tag-yellow{background:rgba(255,209,102,.15);color:${C.yellow};}
  .tag-blue{background:rgba(91,164,255,.15);color:${C.blue};}
  .tag-purple{background:rgba(180,143,255,.15);color:${C.purple};}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn .3s ease forwards;}
  input[type=checkbox]{width:15px;height:15px;cursor:pointer;accent-color:${C.accent};}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseDate(val) {
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const p = val.split("-").map(Number);
    return { year: p[0], month: p[1] - 1 };
  }
  const d = new Date(val);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function matchesMonth(item, monthStr) {
  if (!monthStr) return true;
  const [y, m] = monthStr.split("-").map(Number);
  const pd = parseDate(item.date || item.createdAt);
  return pd.year === y && pd.month === m - 1;
}

// Build list of "YYYY-MM" strings from an array of items
function getMonthOptions(items) {
  const set = new Set();
  items.forEach(i => {
    const pd = parseDate(i.date || i.createdAt);
    set.add(pd.year + "-" + String(pd.month + 1).padStart(2, "0"));
  });
  return [...set].sort().reverse();
}

function monthLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return MONTHS[m - 1] + " " + y;
}

function getYearOptions(items) {
  const set = new Set();
  items.forEach(i => {
    const pd = parseDate(i.date || i.createdAt);
    set.add(String(pd.year));
  });
  return [...set].sort().reverse();
}

function matchesYear(item, year) {
  if (!year) return true;
  const pd = parseDate(item.date || item.createdAt);
  return String(pd.year) === year;
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Card({ children, style = {}, C }) {
  return <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: 20, ...style }}>{children}</div>;
}
function Btn({ children, onClick, variant = "primary", style = {}, disabled = false, C }) {
  const vs = {
    primary: { background: C.accent, color: C.accentText, boxShadow: "0 0 16px " + C.accentGlow },
    ghost:   { background: "transparent", color: C.textMuted, border: "1px solid " + C.border },
    danger:  { background: "rgba(220,50,80,.1)", color: C.red, border: "1px solid rgba(220,50,80,.25)" },
    subtle:  { background: C.surfaceAlt, color: C.text, border: "1px solid " + C.border },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...vs[variant], opacity: disabled ? .5 : 1, ...style }}>{children}</button>;
}
function MetricCard({ label, value, sub, color, icon, C }) {
  return (
    <Card C={C} style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -10, right: -10, fontSize: 56, opacity: .05 }}>{icon}</div>
      <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || C.accent, fontFamily: "'DM Mono',monospace" }}>{value}</div>
      {sub && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}
function SectionHeader({ title, action, C }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{title}</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{action}</div>
    </div>
  );
}
function Modal({ title, children, onClose, C }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: C.modalBg, border: "1px solid " + C.border, borderRadius: 16, width: "100%", maxWidth: 660, maxHeight: "92vh", overflow: "auto", padding: 24 }} onClick={e => e.stopPropagation()} className="fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FormGrid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
}
function Field({ label, children, full = false, C }) {
  return (
    <div style={{ gridColumn: full ? "span 2" : "span 1" }}>
      <label style={{ display: "block", color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

// Filter bar — a row of compact dropdowns/inputs
function FilterBar({ filters, C }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {filters.map((f, i) => (
        <div key={i} style={{ minWidth: f.wide ? 200 : 150 }}>
          {f.type === "search"
            ? <input placeholder={f.placeholder || "Search…"} value={f.value} onChange={e => f.onChange(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }} />
            : (
              <select value={f.value} onChange={e => f.onChange(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                <option value="">{f.label}</option>
                {f.options.map(o => (
                  <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
                ))}
              </select>
            )
          }
        </div>
      ))}
      {filters.some(f => f.value) && (
        <Btn C={C} variant="ghost" onClick={() => filters.forEach(f => f.onChange(""))} style={{ padding: "6px 12px", fontSize: 12 }}>Clear</Btn>
      )}
    </div>
  );
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i <= line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if ((ch === "," || i === line.length) && !inQ) { vals.push(cur.trim()); cur = ""; }
      else if (ch !== undefined) cur += ch;
    }
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ""; });
    return obj;
  });
}
function CSVImportBtn({ onData, getTemplate, label = "Import CSV", C }) {
  const ref = useRef();
  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onData(parseCSV(ev.target.result));
    reader.readAsText(file); e.target.value = "";
  };
  const dl = () => {
    const content = typeof getTemplate === "function" ? getTemplate() : getTemplate;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/csv" }));
    a.download = "template.csv"; a.click();
  };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input type="file" accept=".csv" ref={ref} style={{ display: "none" }} onChange={handleFile} />
      <Btn C={C} variant="subtle" onClick={() => ref.current.click()}>{label}</Btn>
      <Btn C={C} variant="ghost" onClick={dl}>↓ Template</Btn>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview",  label: "Overview",    icon: "◈" },
  { id: "sales",     label: "Sales",       icon: "↗" },
  { id: "profit",    label: "Profit",      icon: "◎" },
  { id: "products",  label: "Products",    icon: "⊞" },
  { id: "inventory", label: "Inventory",   icon: "▦" },
  { id: "expenses",  label: "Expenses",    icon: "↙" },
  { id: "deposits",  label: "Deposits",    icon: "⊕" },
  { id: "orders",    label: "PO / Refunds",icon: "↺" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useState(() => load(KEYS.theme, "dark"));
  const C = theme === "dark" ? DARK : LIGHT;
  const [tab, setTab] = useState("overview");
  const [products,       setProducts]       = useState(() => load(KEYS.products, SEED_PRODUCTS));
  const [inventory,      setInventory]      = useState(() => load(KEYS.inventory, SEED_INVENTORY));
  const [sales,          setSales]          = useState(() => load(KEYS.sales, []));
  const [expenses,       setExpenses]       = useState(() => load(KEYS.expenses, []));
  const [deposits,       setDeposits]       = useState(() => load(KEYS.deposits, []));
  const [purchaseOrders, setPurchaseOrders] = useState(() => load(KEYS.purchaseOrders, []));
  const [refunds,        setRefunds]        = useState(() => load(KEYS.refunds, []));

  useEffect(() => { save(KEYS.theme, theme); }, [theme]);
  useEffect(() => { save(KEYS.products, products); }, [products]);
  useEffect(() => { save(KEYS.inventory, inventory); }, [inventory]);
  useEffect(() => { save(KEYS.sales, sales); }, [sales]);
  useEffect(() => { save(KEYS.expenses, expenses); }, [expenses]);
  useEffect(() => { save(KEYS.deposits, deposits); }, [deposits]);
  useEffect(() => { save(KEYS.purchaseOrders, purchaseOrders); }, [purchaseOrders]);
  useEffect(() => { save(KEYS.refunds, refunds); }, [refunds]);

  const productMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);

  const addSale = useCallback((sale) => {
    const prod = productMap[sale.productId];
    if (prod && prod.category === "physical")
      setInventory(inv => ({ ...inv, [sale.productId]: Math.max(0, (inv[sale.productId] || 0) - sale.qty) }));
    setSales(s => [{ id: uid(), ...sale, createdAt: Date.now() }, ...s]);
  }, [productMap]);

  const updateSale = useCallback((id, updates) => setSales(s => s.map(x => x.id === id ? { ...x, ...updates } : x)), []);

  const addRefund = useCallback((refund) => {
    const prod = productMap[refund.productId];
    if (prod && prod.category === "physical")
      setInventory(inv => ({ ...inv, [refund.productId]: (inv[refund.productId] || 0) + refund.qty }));
    if (refund.saleId) setSales(s => s.map(sale => sale.id === refund.saleId ? { ...sale, refunded: true } : sale));
    setRefunds(r => [{ id: uid(), ...refund, createdAt: Date.now() }, ...r]);
  }, [productMap]);

  const addPurchaseOrder = useCallback((po) => {
    const prod = productMap[po.productId];
    if (prod && prod.category === "physical")
      setInventory(inv => ({ ...inv, [po.productId]: (inv[po.productId] || 0) + po.qty }));
    setPurchaseOrders(p => [{ id: uid(), ...po, createdAt: Date.now() }, ...p]);
  }, [productMap]);

  const shared = {
    products, setProducts, inventory, setInventory,
    sales, setSales, expenses, setExpenses,
    deposits, setDeposits, purchaseOrders, setPurchaseOrders,
    refunds, setRefunds, addSale, updateSale, addRefund, addPurchaseOrder,
    productMap, C,
  };

  return (
    <>
      <style>{makeStyles(C)}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
        <nav style={{ width: 228, background: C.navBg, borderRight: "1px solid " + C.border, padding: "24px 0", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
          <div style={{ padding: "0 20px 24px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".2em", color: C.accent, textTransform: "uppercase" }}>BRANDTREE</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: ".05em" }}>DASHBOARD</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>Maria · E-Commerce</div>
          </div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
              background: tab === n.id ? C.accentGlow : "transparent",
              borderLeft: "3px solid " + (tab === n.id ? C.accent : "transparent"),
              color: tab === n.id ? C.accent : C.textMuted,
              border: "none", cursor: "pointer", width: "100%", textAlign: "left",
              fontSize: 13, fontWeight: tab === n.id ? 700 : 500, fontFamily: "'Syne',sans-serif", transition: "all .15s",
            }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
            </button>
          ))}
          <div style={{ marginTop: "auto", padding: "0 16px 12px" }}>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: C.surfaceAlt, border: "1px solid " + C.border, borderRadius: 8,
              padding: "8px 12px", color: C.textMuted, cursor: "pointer",
              fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 600,
            }}>
              <span>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
              <span style={{ fontSize: 10, opacity: .6 }}>toggle</span>
            </button>
          </div>
        </nav>
        <main style={{ flex: 1, padding: 28, overflowX: "hidden", background: C.bg, minWidth: 0 }} className="fade-in" key={tab}>
          {tab === "overview"  && <OverviewTab  {...shared} />}
          {tab === "sales"     && <SalesTab     {...shared} />}
          {tab === "profit"    && <ProfitTab    {...shared} />}
          {tab === "products"  && <ProductsTab  {...shared} />}
          {tab === "inventory" && <InventoryTab {...shared} />}
          {tab === "expenses"  && <ExpensesTab  {...shared} />}
          {tab === "deposits"  && <DepositsTab  {...shared} />}
          {tab === "orders"    && <OrdersTab    {...shared} />}
        </main>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ sales, expenses, refunds, deposits, productMap, C }) {
  const [month, setMonth] = useState("");
  const [year,  setYear]  = useState("");
  const allItems = useMemo(() => [...sales, ...expenses, ...deposits, ...refunds], [sales, expenses, deposits, refunds]);
  const monthOpts = useMemo(() => getMonthOptions(allItems), [allItems]);
  const yearOpts  = useMemo(() => getYearOptions(allItems),  [allItems]);

  const fSales    = sales.filter(s => !s.refunded && matchesMonth(s, month) && matchesYear(s, year));
  const fExp      = expenses.filter(e => matchesMonth(e, month) && matchesYear(e, year));
  const fRef      = refunds.filter(r => matchesMonth(r, month) && matchesYear(r, year));
  const fDep      = deposits.filter(d => matchesMonth(d, month) && matchesYear(d, year));

  const totalRevenue    = fSales.reduce((a,s) => a + s.salesPrice * s.qty, 0);
  const totalCOGS       = fSales.reduce((a,s) => a + ((productMap[s.productId] ? productMap[s.productId].cost : 0) * s.qty), 0);
  const totalVAT        = fSales.reduce((a,s) => a + (s.vatAmount || 0), 0);
  const totalCommission = fSales.reduce((a,s) => a + (s.commissionAmt || 0), 0);
  const totalMisc       = fSales.reduce((a,s) => a + (s.miscCost || 0) * s.qty, 0);
  const shippingPL      = fSales.reduce((a,s) => a + ((s.shippingCharged||0)-(s.shippingCost||0))*s.qty, 0);
  const totalExpenses   = fExp.reduce((a,e) => a + e.amount, 0);
  const totalRefunds    = fRef.reduce((a,r) => a + r.amount, 0);
  const totalDeposits   = fDep.reduce((a,d) => a + d.amount, 0);
  const netProfit       = totalRevenue - totalCOGS - totalVAT - totalCommission - totalMisc + shippingPL - totalExpenses - totalRefunds;

  const byPlatform = {};
  fSales.forEach(s => { byPlatform[s.platform] = (byPlatform[s.platform] || 0) + s.salesPrice * s.qty; });

  const byProduct = {};
  fSales.forEach(s => {
    if (!byProduct[s.productId]) byProduct[s.productId] = { revenue: 0, qty: 0 };
    byProduct[s.productId].revenue += s.salesPrice * s.qty;
    byProduct[s.productId].qty += s.qty;
  });
  const topProducts = Object.entries(byProduct).sort((a,b) => b[1].revenue - a[1].revenue).slice(0,5);

  const monthOptsFmt = monthOpts.map(m => ({ value: m, label: monthLabel(m) }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text }}>Overview</h1>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>Business performance at a glance</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ minWidth: 110 }}>
            <select value={year} onChange={e => { setYear(e.target.value); setMonth(""); }} style={{ padding: "7px 10px", fontSize: 12 }}>
              <option value="">All Years</option>
              {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: "7px 10px", fontSize: 12 }}>
              <option value="">All Months</option>
              {monthOptsFmt.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {(year || month) && (
            <button onClick={() => { setYear(""); setMonth(""); }} style={{ background: "transparent", border: "1px solid " + C.border, color: C.textMuted, borderRadius: 6, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>Clear</button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <MetricCard C={C} label="Total Revenue"   value={fmtC(totalRevenue)}  icon="€" />
        <MetricCard C={C} label="Net Profit"       value={fmtC(netProfit)}     color={netProfit >= 0 ? C.accent : C.red} icon="◎" />
        <MetricCard C={C} label="Total Deposits"  value={fmtC(totalDeposits)} color={C.blue} icon="⊕" sub={fDep.length + " payouts"} />
        <MetricCard C={C} label="Refunds Issued"  value={fmtC(totalRefunds)}  color={C.red} icon="↺" sub={fRef.length + " refunds"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Card C={C}>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>Platform Revenue</div>
          {Object.entries(byPlatform).sort((a,b) => b[1]-a[1]).length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet</p>}
          {Object.entries(byPlatform).sort((a,b) => b[1]-a[1]).map(([plat,rev],i) => (
            <div key={plat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + C.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: 11, width: 18 }}>{"#"+(i+1)}</span>
                <span style={{ fontSize: 13, color: C.text }}>{plat}</span>
              </div>
              <span style={{ fontFamily: "'DM Mono',monospace", color: C.accent, fontSize: 13 }}>{fmtC(rev)}</span>
            </div>
          ))}
        </Card>

        <Card C={C}>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>Top Products</div>
          {topProducts.length === 0 && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet</p>}
          {topProducts.map(([pid, data], i) => {
            const p = productMap[pid];
            return (
              <div key={pid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + C.border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.textDim, fontFamily: "'DM Mono',monospace", fontSize: 11, width: 18 }}>{"#"+(i+1)}</span>
                  <div>
                    <div style={{ fontSize: 12, color: C.text }}>{p ? p.name : "Unknown"}</div>
                    <div style={{ color: C.textMuted, fontSize: 11 }}>{data.qty} units</div>
                  </div>
                </div>
                <span style={{ fontFamily: "'DM Mono',monospace", color: C.yellow, fontSize: 13 }}>{fmtC(data.revenue)}</span>
              </div>
            );
          })}
        </Card>

        <Card C={C}>
          <div style={{ color: C.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>P&L Summary</div>
          {[
            ["Revenue",         totalRevenue,    C.accent],
            ["COGS",           -totalCOGS,        C.red],
            ["VAT Collected",  -totalVAT,         C.yellow],
            ["Marketplace Fees",-totalCommission, C.red],
            ["Shipping P&L",    shippingPL,       shippingPL >= 0 ? C.blue : C.red],
            ["Misc Costs",     -totalMisc,        C.red],
            ["Expenses",       -totalExpenses,    C.red],
            ["Refunds",        -totalRefunds,     C.red],
            ["Deposits In",     totalDeposits,    C.blue],
          ].map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid " + C.border }}>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{label}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", color, fontSize: 12 }}>{val >= 0 ? "+" : ""}{fmtC(val)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0" }}>
            <span style={{ fontWeight: 700, color: C.text }}>Net Profit</span>
            <span style={{ fontFamily: "'DM Mono',monospace", color: netProfit >= 0 ? C.accent : C.red, fontSize: 15, fontWeight: 700 }}>{fmtC(netProfit)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES
// ═══════════════════════════════════════════════════════════════════════════════
function SalesTab({ sales, setSales, addSale, updateSale, products, productMap, C }) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(new Set());

  // Filters
  const [fBrand,    setFBrand]    = useState("");
  const [fPlatform, setFPlatform] = useState("");
  const [fStatus,   setFStatus]   = useState("");
  const [fMonth,    setFMonth]    = useState("");
  const [fYear,     setFYear]     = useState("");

  const emptyForm = { date: todayStr(), productId: "", qty: 1, salesPrice: "", shippingCharged: 0, shippingCost: 0, vatRate: 21, commissionPct: 0, miscCost: 0, platform: "Amazon", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const qty     = parseInt(form.qty) || 1;
  const sp      = parseFloat(form.salesPrice) || 0;
  const sc      = parseFloat(form.shippingCharged) || 0;
  const shCost  = parseFloat(form.shippingCost) || 0;
  const vatAmt  = sp * qty * ((parseFloat(form.vatRate) || 0) / 100);
  const commAmt = (sp * qty + sc * qty) * ((parseFloat(form.commissionPct) || 0) / 100);
  const cogs    = ((productMap[form.productId] && productMap[form.productId].cost) || 0) * qty;
  const estProfit = sp * qty - vatAmt - commAmt + (sc - shCost) * qty - (parseFloat(form.miscCost) || 0) * qty - cogs;

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = s => {
    setForm({ date: s.date, productId: s.productId, qty: s.qty, salesPrice: s.salesPrice, shippingCharged: s.shippingCharged||0, shippingCost: s.shippingCost||0, vatRate: s.vatRate||21, commissionPct: s.commissionPct||0, miscCost: s.miscCost||0, platform: s.platform, notes: s.notes||"" });
    setEditId(s.id); setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.productId || !form.salesPrice) return alert("Product and sales price required");
    const data = { ...form, qty, salesPrice: sp, shippingCharged: sc, shippingCost: shCost, vatRate: parseFloat(form.vatRate)||21, vatAmount: vatAmt, commissionPct: parseFloat(form.commissionPct)||0, commissionAmt: commAmt, miscCost: parseFloat(form.miscCost)||0, profit: estProfit };
    if (editId) updateSale(editId, data); else addSale(data);
    setShowModal(false);
  };

  // derive filter option lists
  const brands    = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  const monthOpts = getMonthOptions(sales).map(m => ({ value: m, label: monthLabel(m) }));
  const yearOpts  = getYearOptions(sales);

  const filtered = sales.filter(s => {
    const p = productMap[s.productId];
    if (fBrand    && p?.brand !== fBrand)      return false;
    if (fPlatform && s.platform !== fPlatform) return false;
    if (fStatus === "sold"     && s.refunded)  return false;
    if (fStatus === "refunded" && !s.refunded) return false;
    if (!matchesMonth(s, fMonth))              return false;
    if (!matchesYear(s, fYear))                return false;
    return true;
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleSelect = id => setSelected(sel => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(allSelected ? new Set() : new Set(filtered.map(s => s.id)));
  const bulkDelete   = () => { if (!window.confirm("Delete " + selected.size + " sale(s)?")) return; setSales(s => s.filter(x => !selected.has(x.id))); setSelected(new Set()); };

  const handleCSV = rows => {
    rows.forEach(r => {
      const prod = products.find(p => p.sku && p.sku.toLowerCase() === (r.sku||"").toLowerCase())
                || products.find(p => p.name && p.name.toLowerCase() === (r["product name"]||r.product||"").toLowerCase());
      if (!prod) return;
      const _sp = parseFloat(r["sales price"]||r.salesprice||r.price)||0;
      const _sc = parseFloat(r["shipping charged"]||r.shippingcharged)||0;
      const _qty= parseInt(r.qty||r.quantity)||1;
      const _vR = parseFloat(r["vat rate"]||r.vatrate)||21;
      const _cP = parseFloat(r["commission %"]||r.commission)||0;
      const _cA = (_sp*_qty+_sc*_qty)*(_cP/100);
      const _vA = _sp*_qty*(_vR/100);
      const _shC= parseFloat(r["shipping cost"]||r.shippingcost)||0;
      const _mi = parseFloat(r["misc cost"]||r.misccost)||0;
      const _cogs=(prod.cost||0)*_qty;
      addSale({ date: r.date||todayStr(), productId: prod.id, qty:_qty, salesPrice:_sp, shippingCharged:_sc, shippingCost:_shC, vatRate:_vR, vatAmount:_vA, commissionPct:_cP, commissionAmt:_cA, miscCost:_mi, platform:r.platform||"Amazon", notes:r.notes||"", profit:_sp*_qty-_vA-_cA+(_sc-_shC)*_qty-_mi*_qty-_cogs });
    });
  };

  const ts = { background: C.surfaceAlt, fontWeight: 800 };

  return (
    <div>
      <SectionHeader C={C} title="Sales Records" action={
        <>
          {selected.size > 0 && <Btn C={C} variant="danger" onClick={bulkDelete}>Delete {selected.size}</Btn>}
          <CSVImportBtn C={C} onData={handleCSV} label="Import CSV"
            getTemplate={() => "date,sku,product name,qty,sales price,shipping charged,shipping cost,vat rate,commission %,misc cost,platform,notes\n2025-01-01,SAVO-001,SAVIO Wooden Sorting Toy,2,29.99,5.99,4.50,21,8,0,Amazon,"} />
          <Btn C={C} onClick={openAdd}>+ Add Sale</Btn>
        </>
      } />
      <FilterBar C={C} filters={[
        { label: "All Brands",    value: fBrand,    onChange: setFBrand,    options: brands },
        { label: "All Platforms", value: fPlatform, onChange: setFPlatform, options: PLATFORMS },
        { label: "All Statuses",  value: fStatus,   onChange: setFStatus,   options: [{ value:"sold", label:"Sold" }, { value:"refunded", label:"Refunded" }] },
        { label: "All Years",     value: fYear,     onChange: v => { setFYear(v); setFMonth(""); }, options: yearOpts },
        { label: "All Months",    value: fMonth,    onChange: setFMonth,    options: monthOpts },
      ]} />
      <Card C={C} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th>Date</th><th>Brand</th><th>SKU</th><th>Product</th><th>Platform</th>
                <th>Qty</th><th>Sale €</th><th>Ship Chg</th><th>Ship Cost</th>
                <th>VAT</th><th>Comm%</th><th>Comm€</th><th>Misc</th>
                <th>Profit</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={17} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No sales match filters</td></tr>}
              {filtered.map(s => {
                const p = productMap[s.productId];
                return (
                  <tr key={s.id}>
                    <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} /></td>
                    <td>{s.date}</td>
                    <td style={{ color: C.textMuted }}>{p ? p.brand : "–"}</td>
                    <td className="mono" style={{ color: C.textMuted }}>{p ? p.sku : "–"}</td>
                    <td style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, color:C.text, maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p ? p.name : "–"}</td>
                    <td><span className="tag tag-blue">{s.platform}</span></td>
                    <td>{s.qty}</td>
                    <td>{fmtC(s.salesPrice)}</td>
                    <td>{fmtC(s.shippingCharged||0)}</td>
                    <td>{fmtC(s.shippingCost||0)}</td>
                    <td>{fmtC(s.vatAmount||0)}</td>
                    <td>{fmt(s.commissionPct||0)}%</td>
                    <td>{fmtC(s.commissionAmt||0)}</td>
                    <td>{fmtC((s.miscCost||0)*s.qty)}</td>
                    <td style={{ color:(s.profit||0)>=0?C.accent:C.red, fontWeight:700 }}>{fmtC(s.profit||0)}</td>
                    <td>{s.refunded ? <span className="tag tag-red">REFUNDED</span> : <span className="tag tag-green">SOLD</span>}</td>
                    <td><Btn C={C} variant="subtle" onClick={() => openEdit(s)} style={{ padding:"3px 10px", fontSize:11 }}>Edit</Btn></td>
                  </tr>
                );
              })}
              {filtered.length > 0 && (() => {
                const tQty  = filtered.reduce((a,s)=>a+s.qty,0);
                const tRev  = filtered.reduce((a,s)=>a+s.salesPrice*s.qty,0);
                const tShC  = filtered.reduce((a,s)=>a+(s.shippingCharged||0)*s.qty,0);
                const tShCo = filtered.reduce((a,s)=>a+(s.shippingCost||0)*s.qty,0);
                const tVAT  = filtered.reduce((a,s)=>a+(s.vatAmount||0),0);
                const tComm = filtered.reduce((a,s)=>a+(s.commissionAmt||0),0);
                const tMisc = filtered.reduce((a,s)=>a+(s.miscCost||0)*s.qty,0);
                const tProf = filtered.reduce((a,s)=>a+(s.profit||0),0);
                return (
                  <tr>
                    <td style={ts}></td>
                    <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>TOTAL</td>
                    <td style={ts}></td><td style={ts}></td><td style={ts}></td><td style={ts}></td>
                    <td style={{ ...ts, color:C.text }}>{tQty}</td>
                    <td style={{ ...ts, color:C.text }}>{fmtC(tRev)}</td>
                    <td style={{ ...ts, color:C.text }}>{fmtC(tShC)}</td>
                    <td style={{ ...ts, color:C.text }}>{fmtC(tShCo)}</td>
                    <td style={{ ...ts, color:C.yellow }}>{fmtC(tVAT)}</td>
                    <td style={ts}></td>
                    <td style={{ ...ts, color:C.red }}>{fmtC(tComm)}</td>
                    <td style={{ ...ts, color:C.red }}>{fmtC(tMisc)}</td>
                    <td style={{ ...ts, color:tProf>=0?C.accent:C.red }}>{fmtC(tProf)}</td>
                    <td style={ts}></td><td style={ts}></td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <Modal C={C} title={editId ? "Edit Sale" : "Record Sale"} onClose={() => setShowModal(false)}>
          <FormGrid>
            <Field C={C} label="Date"><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} /></Field>
            <Field C={C} label="Platform">
              <select value={form.platform} onChange={e => setForm(f=>({...f,platform:e.target.value}))}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field C={C} label="Product" full>
              <select value={form.productId} onChange={e => setForm(f=>({...f,productId:e.target.value}))}>
                <option value="">— Select product —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </Field>
            <Field C={C} label="Qty"><input type="number" min="1" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} /></Field>
            <Field C={C} label="Sales Price (€)"><input type="number" step="0.01" value={form.salesPrice} onChange={e=>setForm(f=>({...f,salesPrice:e.target.value}))} /></Field>
            <Field C={C} label="Shipping Charged (€)"><input type="number" step="0.01" value={form.shippingCharged} onChange={e=>setForm(f=>({...f,shippingCharged:e.target.value}))} /></Field>
            <Field C={C} label="Actual Shipping Cost (€)"><input type="number" step="0.01" value={form.shippingCost} onChange={e=>setForm(f=>({...f,shippingCost:e.target.value}))} /></Field>
            <Field C={C} label="VAT Rate (%)"><input type="number" step="0.1" value={form.vatRate} onChange={e=>setForm(f=>({...f,vatRate:e.target.value}))} /></Field>
            <Field C={C} label="Commission % (of sale + ship)"><input type="number" step="0.1" value={form.commissionPct} onChange={e=>setForm(f=>({...f,commissionPct:e.target.value}))} /></Field>
            <Field C={C} label="Misc Cost (€ per unit)"><input type="number" step="0.01" value={form.miscCost} onChange={e=>setForm(f=>({...f,miscCost:e.target.value}))} /></Field>
            <Field C={C} label="Notes" full><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional…" /></Field>
          </FormGrid>
          <div style={{ marginTop:14, padding:12, background:C.surfaceAlt, borderRadius:8, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <div><div style={{ color:C.textMuted, fontSize:10, textTransform:"uppercase", marginBottom:2 }}>VAT Amount</div><div style={{ color:C.yellow, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmtC(vatAmt)}</div></div>
            <div><div style={{ color:C.textMuted, fontSize:10, textTransform:"uppercase", marginBottom:2 }}>Commission €</div><div style={{ color:C.red, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmtC(commAmt)}</div></div>
            <div><div style={{ color:C.textMuted, fontSize:10, textTransform:"uppercase", marginBottom:2 }}>Est. Profit</div><div style={{ color:estProfit>=0?C.accent:C.red, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmtC(estProfit)}</div></div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn C={C} onClick={handleSubmit}>{editId ? "Update Sale" : "Save Sale"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIT
// ═══════════════════════════════════════════════════════════════════════════════
function ProfitTab({ sales, expenses, productMap, refunds, C }) {
  const [fBrand,    setFBrand]    = useState("");
  const [fPlatform, setFPlatform] = useState("");
  const [fMonth,    setFMonth]    = useState("");
  const [fYear,     setFYear]     = useState("");

  const brands    = [...new Set(Object.values(productMap).map(p => p.brand).filter(Boolean))].sort();
  const monthOpts = getMonthOptions(sales).map(m => ({ value: m, label: monthLabel(m) }));
  const yearOpts  = getYearOptions(sales);

  const fSales = sales.filter(s => {
    if (s.refunded) return false;
    const p = productMap[s.productId];
    if (fBrand    && p?.brand !== fBrand)      return false;
    if (fPlatform && s.platform !== fPlatform) return false;
    if (!matchesMonth(s, fMonth))              return false;
    if (!matchesYear(s, fYear))                return false;
    return true;
  });
  const fExp = expenses.filter(e => matchesMonth(e, fMonth) && matchesYear(e, fYear));
  const fRef = refunds.filter(r => matchesMonth(r, fMonth) && matchesYear(r, fYear));

  const rows = fSales.map(s => {
    const p    = productMap[s.productId];
    const cogs = ((p && p.cost) || 0) * s.qty;
    const shPL = ((s.shippingCharged||0) - (s.shippingCost||0)) * s.qty;
    const gross= s.salesPrice*s.qty - (s.vatAmount||0) - (s.commissionAmt||0) + shPL - (s.miscCost||0)*s.qty - cogs;
    return { ...s, productName: p?p.name:"–", brand: p?p.brand:"–", sku: p?p.sku:"–", cogs, gross, shPL };
  });

  const tRev  = rows.reduce((a,r)=>a+r.salesPrice*r.qty,0);
  const tCOGS = rows.reduce((a,r)=>a+r.cogs,0);
  const tGross= rows.reduce((a,r)=>a+r.gross,0);
  const tExp  = fExp.reduce((a,e)=>a+e.amount,0);
  const tRef  = fRef.reduce((a,r)=>a+r.amount,0);
  const net   = tGross - tExp - tRef;
  const margin= tRev > 0 ? (net/tRev*100) : 0;
  const ts    = { background: C.surfaceAlt, fontWeight: 800 };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:C.text }}>Profit Dashboard</h1>
      </div>
      <FilterBar C={C} filters={[
        { label:"All Brands",    value:fBrand,    onChange:setFBrand,    options:brands },
        { label:"All Platforms", value:fPlatform, onChange:setFPlatform, options:PLATFORMS },
        { label:"All Years",     value:fYear,     onChange: v => { setFYear(v); setFMonth(""); }, options:yearOpts },
        { label:"All Months",    value:fMonth,    onChange:setFMonth,    options:monthOpts },
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20 }}>
        <MetricCard C={C} label="Revenue"    value={fmtC(tRev)} />
        <MetricCard C={C} label="COGS"       value={fmtC(tCOGS)} color={C.red} />
        <MetricCard C={C} label="Net Profit" value={fmtC(net)}   color={net>=0?C.accent:C.red} />
        <MetricCard C={C} label="Net Margin" value={fmt(margin)+"%"} color={margin>=20?C.accent:margin>=0?C.yellow:C.red} />
      </div>
      <Card C={C} style={{ padding:0, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table>
            <thead><tr><th>Date</th><th>Brand</th><th>SKU</th><th>Product</th><th>Platform</th><th>Revenue</th><th>COGS</th><th>VAT</th><th>Commission</th><th>Ship P&L</th><th>Misc</th><th>Gross Profit</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={12} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No data for these filters</td></tr>}
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td style={{ color:C.textMuted }}>{r.brand}</td>
                  <td className="mono" style={{ color:C.textMuted }}>{r.sku}</td>
                  <td style={{ fontFamily:"'Syne',sans-serif", color:C.text }}>{r.productName}</td>
                  <td><span className="tag tag-blue">{r.platform}</span></td>
                  <td>{fmtC(r.salesPrice*r.qty)}</td>
                  <td style={{ color:C.red }}>{fmtC(r.cogs)}</td>
                  <td style={{ color:C.yellow }}>{fmtC(r.vatAmount||0)}</td>
                  <td style={{ color:C.red }}>{fmtC(r.commissionAmt||0)}</td>
                  <td style={{ color:r.shPL>=0?C.accent:C.red }}>{fmtC(r.shPL)}</td>
                  <td style={{ color:C.red }}>{fmtC((r.miscCost||0)*r.qty)}</td>
                  <td style={{ color:r.gross>=0?C.accent:C.red, fontWeight:700 }}>{fmtC(r.gross)}</td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr>
                  <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>TOTAL</td>
                  <td style={ts}></td><td style={ts}></td><td style={ts}></td><td style={ts}></td>
                  <td style={{ ...ts, color:C.text }}>{fmtC(tRev)}</td>
                  <td style={{ ...ts, color:C.red }}>{fmtC(tCOGS)}</td>
                  <td style={{ ...ts, color:C.yellow }}>{fmtC(rows.reduce((a,r)=>a+(r.vatAmount||0),0))}</td>
                  <td style={{ ...ts, color:C.red }}>{fmtC(rows.reduce((a,r)=>a+(r.commissionAmt||0),0))}</td>
                  <td style={{ ...ts, color:C.accent }}>{fmtC(rows.reduce((a,r)=>a+r.shPL,0))}</td>
                  <td style={{ ...ts, color:C.red }}>{fmtC(rows.reduce((a,r)=>a+(r.miscCost||0)*r.qty,0))}</td>
                  <td style={{ ...ts, color:tGross>=0?C.accent:C.red }}>{fmtC(tGross)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
        <Card C={C}>
          <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>Profit Breakdown</div>
          {[["Gross Profit from Sales",tGross,C.accent],["Business Expenses",-tExp,C.red],["Refunds",-tRef,C.red]].map(([l,v,co])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid "+C.border }}>
              <span style={{ color:C.textMuted }}>{l}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", color:co, fontWeight:600 }}>{v>=0?"+":""}{fmtC(v)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0" }}>
            <span style={{ fontWeight:700, color:C.text }}>Net Profit</span>
            <span style={{ fontFamily:"'DM Mono',monospace", color:net>=0?C.accent:C.red, fontSize:18, fontWeight:800 }}>{fmtC(net)}</span>
          </div>
        </Card>
        <Card C={C}>
          <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>Key Metrics</div>
          {[
            ["Gross Margin", tRev>0?fmt((tGross/tRev)*100)+"%":"–", C.accent],
            ["Net Margin",   tRev>0?fmt(margin)+"%":"–", margin>=0?C.accent:C.red],
            ["Avg Order Value",  rows.length>0?fmtC(tRev/rows.length):"–", C.blue],
            ["Avg Profit/Order", rows.length>0?fmtC(tGross/rows.length):"–", C.yellow],
          ].map(([l,v,co])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid "+C.border }}>
              <span style={{ color:C.textMuted }}>{l}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", color:co, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════
function ProductsTab({ products, setProducts, inventory, setInventory, C }) {
  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [selected,  setSelected]  = useState(new Set());
  const [fBrand,    setFBrand]    = useState("");
  const [fCat,      setFCat]      = useState("");
  const emptyForm = { sku:"", name:"", brand:"", category:"physical", cost:"" };
  const [form, setForm] = useState(emptyForm);

  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();

  const filtered = products.filter(p => {
    if (fBrand && p.brand !== fBrand) return false;
    if (fCat   && p.category !== fCat) return false;
    return true;
  });

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = p  => { setForm({ sku:p.sku, name:p.name, brand:p.brand, category:p.category, cost:p.cost }); setEditId(p.id); setShowModal(true); };

  const handleSubmit = () => {
    if (!form.sku || !form.name) return alert("SKU and name are required");
    if (editId) {
      setProducts(p => p.map(x => x.id === editId ? { ...x, ...form, cost: parseFloat(form.cost)||0 } : x));
    } else {
      const np = { id:uid(), ...form, cost:parseFloat(form.cost)||0 };
      setProducts(p => [...p, np]);
      if (np.category === "physical") setInventory(inv => ({ ...inv, [np.id]: 0 }));
    }
    setShowModal(false); setEditId(null);
  };
  const handleDelete = id => {
    if (!window.confirm("Delete this product?")) return;
    setProducts(p => p.filter(x => x.id !== id));
    setInventory(inv => { const n={...inv}; delete n[id]; return n; });
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleSelect = id => setSelected(sel => { const n=new Set(sel); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll    = () => setSelected(allSelected ? new Set() : new Set(filtered.map(p=>p.id)));
  const bulkDelete   = () => {
    if (!window.confirm("Delete "+selected.size+" product(s)?")) return;
    setProducts(p => p.filter(x => !selected.has(x.id)));
    setInventory(inv => { const n={...inv}; selected.forEach(id=>delete n[id]); return n; });
    setSelected(new Set());
  };
  const handleCSV = rows => {
    const np = rows.map(r => {
      const rc = (r.category||"physical").toLowerCase();
      const cat= rc.includes("dig")?"digital":rc.includes("serv")?"service":"physical";
      const p  = { id:uid(), sku:r.sku||uid(), name:r.name||r["product name"]||"", brand:r.brand||"", category:cat, cost:parseFloat(r["cost price"]||r.cost)||0 };
      if (p.category==="physical") setInventory(inv=>({...inv,[p.id]:0}));
      return p;
    });
    setProducts(p => [...p, ...np]);
  };

  return (
    <div>
      <SectionHeader C={C} title="Product Management" action={
        <>
          {selected.size > 0 && <Btn C={C} variant="danger" onClick={bulkDelete}>Delete {selected.size}</Btn>}
          <CSVImportBtn C={C} onData={handleCSV} label="Import CSV"
            getTemplate={() => "sku,name,brand,category,cost price\nSAVO-003,New Wooden Toy,SAVIO TOYS,physical,9.50\nCONJ-002,CONJUGAR Vol.2,CONJUGAR,digital,1.50"} />
          <Btn C={C} onClick={openAdd}>+ Add Product</Btn>
        </>
      } />
      <FilterBar C={C} filters={[
        { label:"All Brands",     value:fBrand, onChange:setFBrand, options:brands },
        { label:"All Categories", value:fCat,   onChange:setFCat,   options:["physical","digital","service"] },
      ]} />
      <Card C={C} style={{ padding:0, overflow:"hidden" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width:36 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th>SKU</th><th>Product Name</th><th>Brand</th><th>Category</th><th>Cost Price</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No products match filters</td></tr>}
            {filtered.map(p => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td className="mono">{p.sku}</td>
                <td style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, color:C.text }}>{p.name}</td>
                <td style={{ color:C.textMuted }}>{p.brand}</td>
                <td><span className={"tag "+(p.category==="digital"?"tag-purple":p.category==="service"?"tag-yellow":"tag-blue")}>{p.category}</span></td>
                <td>{fmtC(p.cost)}</td>
                <td>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn C={C} variant="subtle" onClick={() => openEdit(p)} style={{ padding:"4px 10px", fontSize:11 }}>Edit</Btn>
                    <Btn C={C} variant="danger" onClick={() => handleDelete(p.id)} style={{ padding:"4px 10px", fontSize:11 }}>Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {showModal && (
        <Modal C={C} title={editId?"Edit Product":"Add Product"} onClose={() => { setShowModal(false); setEditId(null); }}>
          <FormGrid>
            <Field C={C} label="SKU"><input value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} placeholder="SAVO-001" /></Field>
            <Field C={C} label="Brand"><input value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} placeholder="SAVIO TOYS" /></Field>
            <Field C={C} label="Product Name" full><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Product name…" /></Field>
            <Field C={C} label="Category">
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="service">Service</option>
              </select>
            </Field>
            <Field C={C} label="Cost Price (€)"><input type="number" step="0.01" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))} /></Field>
          </FormGrid>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={() => { setShowModal(false); setEditId(null); }}>Cancel</Btn>
            <Btn C={C} onClick={handleSubmit}>{editId?"Update":"Add Product"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════
function InventoryTab({ products, inventory, setInventory, C }) {
  const physical = products.filter(p => p.category === "physical");
  const [adjustId,     setAdjustId]     = useState(null);
  const [adjQty,       setAdjQty]       = useState("");
  const [adjNote,      setAdjNote]      = useState("");
  const [selected,     setSelected]     = useState(new Set());
  const [showBulk,     setShowBulk]     = useState(false);
  const [bulkMode,     setBulkMode]     = useState("adjust");
  const [bulkVal,      setBulkVal]      = useState("");
  const [inlineEdits,  setInlineEdits]  = useState({});
  const [fBrand,       setFBrand]       = useState("");
  const [fStatus,      setFStatus]      = useState("");
  const [search,       setSearch]       = useState("");

  const brands = [...new Set(physical.map(p => p.brand).filter(Boolean))].sort();

  const filtered = physical.filter(p => {
    if (fBrand && p.brand !== fBrand) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.sku.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false;
    }
    if (fStatus) {
      const stock = inventory[p.id] || 0;
      if (fStatus === "ok"  && stock < 5)  return false;
      if (fStatus === "low" && (stock === 0 || stock >= 5)) return false;
      if (fStatus === "out" && stock > 0)  return false;
    }
    return true;
  });

  const handleAdjust = () => {
    setInventory(inv => ({ ...inv, [adjustId]: Math.max(0, (inv[adjustId]||0) + (parseInt(adjQty)||0)) }));
    setAdjustId(null); setAdjQty(""); setAdjNote("");
  };
  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const toggleSelect = id => setSelected(sel => { const n=new Set(sel); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll    = () => setSelected(allSelected ? new Set() : new Set(filtered.map(p=>p.id)));
  const handleBulkApply = () => {
    const val = parseInt(bulkVal);
    if (isNaN(val)) return alert("Enter a valid number");
    setInventory(inv => {
      const n = {...inv};
      selected.forEach(id => { n[id] = bulkMode==="adjust" ? Math.max(0,(n[id]||0)+val) : Math.max(0,val); });
      return n;
    });
    setShowBulk(false); setBulkVal(""); setSelected(new Set());
  };
  const commitInline = id => {
    const val = parseInt(inlineEdits[id]);
    if (!isNaN(val)) setInventory(inv => ({ ...inv, [id]: Math.max(0, val) }));
    setInlineEdits(e => { const n={...e}; delete n[id]; return n; });
  };

  const ts = { background: C.surfaceAlt, fontWeight: 800 };

  return (
    <div>
      <SectionHeader C={C} title="Inventory" action={
        selected.size > 0 && <Btn C={C} variant="subtle" onClick={() => setShowBulk(true)}>Bulk Adjust {selected.size}</Btn>
      } />
      <FilterBar C={C} filters={[
        { type:"search", placeholder:"Search SKU or product…", value:search, onChange:setSearch, wide:true },
        { label:"All Brands",   value:fBrand,  onChange:setFBrand,  options:brands },
        { label:"All Statuses", value:fStatus, onChange:setFStatus, options:[{value:"ok",label:"In Stock"},{value:"low",label:"Low Stock"},{value:"out",label:"Out of Stock"}] },
      ]} />
      <Card C={C} style={{ padding:0, overflow:"hidden" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width:36 }}><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th>SKU</th><th>Product</th><th>Brand</th><th>Stock</th><th>Status</th><th>Quick Edit</th><th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No products match filters</td></tr>}
            {filtered.map(p => {
              const stock  = inventory[p.id] || 0;
              const status = stock===0?"out":stock<5?"low":"ok";
              const isEdit = p.id in inlineEdits;
              return (
                <tr key={p.id}>
                  <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="mono">{p.sku}</td>
                  <td style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, color:C.text }}>{p.name}</td>
                  <td style={{ color:C.textMuted }}>{p.brand}</td>
                  <td style={{ fontSize:18, fontWeight:800, color:status==="out"?C.red:status==="low"?C.yellow:C.accent }}>{stock}</td>
                  <td>
                    {status==="out" && <span className="tag tag-red">Out of Stock</span>}
                    {status==="low" && <span className="tag tag-yellow">Low Stock</span>}
                    {status==="ok"  && <span className="tag tag-green">In Stock</span>}
                  </td>
                  <td>
                    {isEdit ? (
                      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                        <input type="number" min="0" value={inlineEdits[p.id]}
                          onChange={e => setInlineEdits(ed=>({...ed,[p.id]:e.target.value}))}
                          onKeyDown={e => { if(e.key==="Enter") commitInline(p.id); if(e.key==="Escape") setInlineEdits(ed=>{const n={...ed};delete n[p.id];return n;}); }}
                          style={{ width:70, padding:"4px 8px", fontSize:13 }} autoFocus />
                        <Btn C={C} variant="primary" onClick={() => commitInline(p.id)} style={{ padding:"4px 10px", fontSize:11 }}>✓</Btn>
                        <Btn C={C} variant="ghost"   onClick={() => setInlineEdits(ed=>{const n={...ed};delete n[p.id];return n;})} style={{ padding:"4px 8px", fontSize:11 }}>✕</Btn>
                      </div>
                    ) : (
                      <Btn C={C} variant="ghost" onClick={() => setInlineEdits(ed=>({...ed,[p.id]:stock}))} style={{ padding:"3px 10px", fontSize:11 }}>Set exact</Btn>
                    )}
                  </td>
                  <td><Btn C={C} variant="subtle" onClick={() => { setAdjustId(p.id); setAdjQty(""); setAdjNote(""); }} style={{ padding:"4px 10px", fontSize:11 }}>+/−</Btn></td>
                </tr>
              );
            })}
            {filtered.length > 0 && (() => {
              const tot = filtered.reduce((a,p) => a + (inventory[p.id]||0), 0);
              return (
                <tr>
                  <td style={ts}></td><td style={ts}></td>
                  <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>TOTAL UNITS</td>
                  <td style={ts}></td>
                  <td style={{ ...ts, fontSize:18, color:C.accent }}>{tot}</td>
                  <td style={ts}></td><td style={ts}></td><td style={ts}></td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </Card>

      {adjustId && (
        <Modal C={C} title="Inventory Adjustment" onClose={() => setAdjustId(null)}>
          <p style={{ color:C.textMuted, fontSize:13, marginBottom:14 }}>
            <strong style={{ color:C.text }}>{(physical.find(p=>p.id===adjustId)||{}).name}</strong> — current stock: <strong style={{ color:C.accent }}>{inventory[adjustId]||0}</strong>
          </p>
          <FormGrid>
            <Field C={C} label="Adjustment (+ to add, − to remove)"><input type="number" value={adjQty} onChange={e=>setAdjQty(e.target.value)} placeholder="e.g. 10 or -5" autoFocus /></Field>
            <Field C={C} label="Reason (optional)"><input value={adjNote} onChange={e=>setAdjNote(e.target.value)} placeholder="Stocktake, damage…" /></Field>
          </FormGrid>
          <div style={{ marginTop:12, padding:"10px 12px", background:C.surfaceAlt, borderRadius:8, fontSize:13, color:C.textMuted }}>
            New stock: <strong style={{ color:C.accent }}>{Math.max(0,(inventory[adjustId]||0)+(parseInt(adjQty)||0))}</strong>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={() => setAdjustId(null)}>Cancel</Btn>
            <Btn C={C} onClick={handleAdjust}>Apply</Btn>
          </div>
        </Modal>
      )}

      {showBulk && (
        <Modal C={C} title={"Bulk Adjust — "+selected.size+" product"+(selected.size>1?"s":"")} onClose={() => setShowBulk(false)}>
          <div style={{ marginBottom:14 }}>
            {[...selected].map(id => {
              const p = physical.find(x => x.id === id);
              return p ? (
                <div key={id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid "+C.border, fontSize:12 }}>
                  <span style={{ color:C.text }}>{p.name}</span>
                  <span style={{ color:C.accent, fontFamily:"'DM Mono',monospace" }}>{inventory[id]||0} in stock</span>
                </div>
              ) : null;
            })}
          </div>
          <div style={{ display:"flex", gap:0, marginBottom:14, border:"1px solid "+C.border, borderRadius:8, overflow:"hidden", width:"fit-content" }}>
            {[["adjust","+/− Adjust"],["set","Set Exact"]].map(([m,label]) => (
              <button key={m} onClick={() => setBulkMode(m)} style={{ padding:"7px 16px", background:bulkMode===m?C.accent:"transparent", color:bulkMode===m?C.accentText:C.textMuted, border:"none", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:12 }}>{label}</button>
            ))}
          </div>
          <FormGrid>
            <Field C={C} label={bulkMode==="adjust"?"Adjustment (+ or −)":"Set Stock To"}>
              <input type="number" value={bulkVal} onChange={e=>setBulkVal(e.target.value)} placeholder={bulkMode==="adjust"?"e.g. -5 or 20":"e.g. 100"} autoFocus />
            </Field>
            <Field C={C} label="Reason (optional)"><input placeholder="Stocktake, write-off…" /></Field>
          </FormGrid>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={() => setShowBulk(false)}>Cancel</Btn>
            <Btn C={C} onClick={handleBulkApply}>Apply to All Selected</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════
function ExpensesTab({ expenses, setExpenses, C }) {
  const [showModal,  setShowModal]  = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [customCats, setCustomCats] = useState([]);
  const [newCat,     setNewCat]     = useState("");
  const [fCat,       setFCat]       = useState("");
  const [fMonth,     setFMonth]     = useState("");
  const [fYear,      setFYear]      = useState("");
  const allCats  = [...EXPENSE_CATEGORIES, ...customCats];
  const emptyExpForm = { date:todayStr(), category:EXPENSE_CATEGORIES[0], description:"", amount:"", notes:"" };
  const [form, setForm] = useState(emptyExpForm);

  const monthOpts = getMonthOptions(expenses).map(m => ({ value:m, label:monthLabel(m) }));
  const yearOpts  = getYearOptions(expenses);

  const filtered = expenses.filter(e => {
    if (fCat   && e.category !== fCat)  return false;
    if (!matchesMonth(e, fMonth))        return false;
    if (!matchesYear(e, fYear))          return false;
    return true;
  });

  const totalByCat = {};
  filtered.forEach(e => { totalByCat[e.category] = (totalByCat[e.category]||0) + e.amount; });

  const openAdd  = () => { setForm(emptyExpForm); setEditId(null); setShowModal(true); };
  const openEdit = e => { setForm({ date:e.date, category:e.category, description:e.description, amount:e.amount, notes:e.notes||"" }); setEditId(e.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditId(null); };

  const handleSubmit = () => {
    if (!form.amount) return alert("Amount required");
    if (editId) {
      setExpenses(ex => ex.map(e => e.id === editId ? { ...e, ...form, amount:parseFloat(form.amount) } : e));
    } else {
      setExpenses(ex => [{ id:uid(), ...form, amount:parseFloat(form.amount), createdAt:Date.now() }, ...ex]);
    }
    closeModal();
  };
  const handleCSV = rows => {
    const newExp = rows.filter(r => r.amount && parseFloat(r.amount) > 0).map(r => ({
      id:uid(), date:r.date||todayStr(), category:r.category||EXPENSE_CATEGORIES[0],
      description:r.description||"", amount:parseFloat(r.amount)||0, notes:r.notes||"", createdAt:Date.now(),
    }));
    setExpenses(e => [...newExp, ...e]);
  };

  const ts = { background: C.surfaceAlt, fontWeight: 800 };

  return (
    <div>
      <SectionHeader C={C} title="Business Expenses" action={
        <>
          <CSVImportBtn C={C} onData={handleCSV} label="Import CSV"
            getTemplate={() => "date,category,description,amount,notes\n2025-01-15,Advertising,Amazon PPC Campaign,120.00,Q1 campaign\n2025-01-20,Software/Tools,Helium 10,99.00,"} />
          <Btn C={C} onClick={openAdd}>+ Add Expense</Btn>
        </>
      } />
      <FilterBar C={C} filters={[
        { label:"All Categories", value:fCat,   onChange:setFCat,   options:allCats },
        { label:"All Years",      value:fYear,  onChange: v => { setFYear(v); setFMonth(""); }, options:yearOpts },
        { label:"All Months",     value:fMonth, onChange:setFMonth, options:monthOpts },
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <Card C={C} style={{ padding:0, overflow:"hidden" }}>
          <table>
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={5} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No expenses match filters</td></tr>}
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td><span className="tag tag-yellow">{e.category}</span></td>
                  <td style={{ fontFamily:"'Syne',sans-serif", color:C.text }}>{e.description}</td>
                  <td style={{ color:C.red, fontWeight:700 }}>{fmtC(e.amount)}</td>
                  <td>
                    <div style={{ display:"flex", gap:5 }}>
                      <Btn C={C} variant="subtle" onClick={() => openEdit(e)} style={{ padding:"3px 10px", fontSize:11 }}>Edit</Btn>
                      <Btn C={C} variant="danger" onClick={() => setExpenses(ex=>ex.filter(x=>x.id!==e.id))} style={{ padding:"3px 8px", fontSize:11 }}>×</Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr>
                  <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>TOTAL</td>
                  <td style={ts}></td>
                  <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>{filtered.length} expense{filtered.length!==1?"s":""}</td>
                  <td style={{ ...ts, color:C.red, fontFamily:"'DM Mono',monospace" }}>{fmtC(filtered.reduce((a,e)=>a+e.amount,0))}</td>
                  <td style={ts}></td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card C={C}>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>By Category</div>
            {Object.entries(totalByCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => (
              <div key={cat} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid "+C.border }}>
                <span style={{ fontSize:12, color:C.text }}>{cat}</span>
                <span style={{ fontFamily:"'DM Mono',monospace", color:C.red, fontSize:12 }}>{fmtC(amt)}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 0" }}>
              <span style={{ fontWeight:700, color:C.text }}>Total</span>
              <span style={{ fontFamily:"'DM Mono',monospace", color:C.red, fontWeight:700 }}>{fmtC(filtered.reduce((a,e)=>a+e.amount,0))}</span>
            </div>
          </Card>
          <Card C={C}>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:10 }}>Add Custom Category</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Category name…" />
              <Btn C={C} onClick={() => { if(newCat.trim()){setCustomCats(c=>[...c,newCat.trim()]);setNewCat("");} }} style={{ whiteSpace:"nowrap" }}>Add</Btn>
            </div>
          </Card>
        </div>
      </div>
      {showModal && (
        <Modal C={C} title={editId ? "Edit Expense" : "Add Expense"} onClose={closeModal}>
          <FormGrid>
            <Field C={C} label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></Field>
            <Field C={C} label="Category">
              <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {allCats.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field C={C} label="Description" full><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What was this for?" /></Field>
            <Field C={C} label="Amount (€)"><input type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></Field>
            <Field C={C} label="Notes"><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional…" /></Field>
          </FormGrid>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn C={C} onClick={handleSubmit}>{editId ? "Save Changes" : "Save Expense"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPOSITS
// ═══════════════════════════════════════════════════════════════════════════════
function DepositsTab({ deposits, setDeposits, C }) {
  const [showModal, setShowModal] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [fOrigin,   setFOrigin]   = useState("");
  const [fMonth,    setFMonth]    = useState("");
  const [fYear,     setFYear]     = useState("");
  const emptyDepForm = { date:todayStr(), origin:"", amount:"", notes:"" };
  const [form, setForm] = useState(emptyDepForm);

  const origins   = [...new Set(deposits.map(d => d.origin).filter(Boolean))].sort();
  const monthOpts = getMonthOptions(deposits).map(m => ({ value:m, label:monthLabel(m) }));
  const yearOpts  = getYearOptions(deposits);

  const filtered = deposits.filter(d => {
    if (fOrigin && d.origin !== fOrigin) return false;
    if (!matchesMonth(d, fMonth))        return false;
    if (!matchesYear(d, fYear))          return false;
    return true;
  });

  const byOrigin = {};
  filtered.forEach(d => { byOrigin[d.origin] = (byOrigin[d.origin]||0) + d.amount; });

  const openAdd  = () => { setForm(emptyDepForm); setEditId(null); setShowModal(true); };
  const openEdit = d => { setForm({ date:d.date, origin:d.origin, amount:d.amount, notes:d.notes||"" }); setEditId(d.id); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditId(null); };

  const handleSubmit = () => {
    if (!form.amount || !form.origin) return alert("Origin and amount required");
    if (editId) {
      setDeposits(dep => dep.map(d => d.id === editId ? { ...d, ...form, amount:parseFloat(form.amount) } : d));
    } else {
      setDeposits(dep => [{ id:uid(), ...form, amount:parseFloat(form.amount), createdAt:Date.now() }, ...dep]);
    }
    closeModal();
  };
  const handleCSV = rows => {
    const nd = rows.filter(r=>r.amount&&r.origin).map(r => ({
      id:uid(), date:r.date||todayStr(), origin:r.origin||"",
      amount:parseFloat(r.amount)||0, notes:r.notes||"", createdAt:Date.now(),
    }));
    setDeposits(d => [...nd, ...d]);
  };

  const ts = { background: C.surfaceAlt, fontWeight: 800 };

  return (
    <div>
      <SectionHeader C={C} title="Payment Deposits" action={
        <>
          <CSVImportBtn C={C} onData={handleCSV} label="Import CSV"
            getTemplate={() => "date,origin,amount,notes\n2025-01-31,Amazon Payout,1250.00,January\n2025-01-31,Shopify,380.50,"} />
          <Btn C={C} onClick={openAdd}>+ Record Deposit</Btn>
        </>
      } />
      <FilterBar C={C} filters={[
        { label:"All Origins", value:fOrigin, onChange:setFOrigin, options:origins },
        { label:"All Years",   value:fYear,   onChange: v => { setFYear(v); setFMonth(""); }, options:yearOpts },
        { label:"All Months",  value:fMonth,  onChange:setFMonth,  options:monthOpts },
      ]} />
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
        <Card C={C} style={{ padding:0, overflow:"hidden" }}>
          <table>
            <thead><tr><th>Date</th><th>Origin</th><th>Amount</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={5} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No deposits match filters</td></tr>}
              {filtered.map(d => (
                <tr key={d.id}>
                  <td>{d.date}</td>
                  <td><span className="tag tag-green">{d.origin}</span></td>
                  <td style={{ color:C.accent, fontWeight:700 }}>{fmtC(d.amount)}</td>
                  <td style={{ color:C.textMuted }}>{d.notes}</td>
                  <td>
                    <div style={{ display:"flex", gap:5 }}>
                      <Btn C={C} variant="subtle" onClick={() => openEdit(d)} style={{ padding:"3px 10px", fontSize:11 }}>Edit</Btn>
                      <Btn C={C} variant="danger" onClick={() => setDeposits(dep=>dep.filter(x=>x.id!==d.id))} style={{ padding:"3px 8px", fontSize:11 }}>×</Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr>
                  <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>TOTAL</td>
                  <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>{filtered.length} deposit{filtered.length!==1?"s":""}</td>
                  <td style={{ ...ts, color:C.accent, fontFamily:"'DM Mono',monospace" }}>{fmtC(filtered.reduce((a,d)=>a+d.amount,0))}</td>
                  <td style={ts}></td><td style={ts}></td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <MetricCard C={C} label="Total (filtered)" value={fmtC(filtered.reduce((a,d)=>a+d.amount,0))} icon="⊕" sub={filtered.length+" records"} />
          <Card C={C}>
            <div style={{ color:C.textMuted, fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>Summary by Origin</div>
            {Object.keys(byOrigin).length === 0 && <p style={{ color:C.textMuted, fontSize:13 }}>No data</p>}
            {Object.entries(byOrigin).sort((a,b)=>b[1]-a[1]).map(([origin, amt]) => (
              <div key={origin} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid "+C.border }}>
                <div>
                  <div style={{ fontSize:12, color:C.text, fontWeight:600 }}>{origin}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{filtered.filter(d=>d.origin===origin).length} payout{filtered.filter(d=>d.origin===origin).length!==1?"s":""}</div>
                </div>
                <span style={{ fontFamily:"'DM Mono',monospace", color:C.accent, fontWeight:700 }}>{fmtC(amt)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
      {showModal && (
        <Modal C={C} title={editId ? "Edit Deposit" : "Record Deposit"} onClose={closeModal}>
          <FormGrid>
            <Field C={C} label="Date"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></Field>
            <Field C={C} label="Amount (€)"><input type="number" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></Field>
            <Field C={C} label="Origin" full><input value={form.origin} onChange={e=>setForm(f=>({...f,origin:e.target.value}))} placeholder="Amazon Payout, Shopify, Bank Transfer…" /></Field>
            <Field C={C} label="Notes" full><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional…" /></Field>
          </FormGrid>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn C={C} onClick={handleSubmit}>{editId ? "Save Changes" : "Save Deposit"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS + REFUNDS
// ═══════════════════════════════════════════════════════════════════════════════
function OrdersTab({ purchaseOrders, setPurchaseOrders, addPurchaseOrder, refunds, setRefunds, addRefund, sales, products, productMap, inventory, setInventory, C }) {
  const [section,          setSection]         = useState("po");
  const [showPOModal,      setShowPOModal]      = useState(false);
  const [showRefundModal,  setShowRefundModal]  = useState(false);
  const [editRefundId,     setEditRefundId]     = useState(null);
  const [selectedPOs,      setSelectedPOs]      = useState(new Set());
  const [fBrand,           setFBrand]           = useState("");

  const emptyPO = { date:todayStr(), productId:"", qty:1, unitCost:"", supplier:"", notes:"" };
  const [poForm, setPoForm]  = useState(emptyPO);
  const [refundForm, setRF]  = useState({ date:todayStr(), saleId:"", productId:"", qty:1, amount:"", returnCost:"", reason:"" });

  const brands = [...new Set(products.map(p=>p.brand).filter(Boolean))].sort();

  const filteredPOs = purchaseOrders.filter(po => {
    if (!fBrand) return true;
    const p = productMap[po.productId];
    return p?.brand === fBrand;
  });

  const handlePOSubmit = () => {
    if (!poForm.productId || !poForm.qty) return alert("Product and qty required");
    addPurchaseOrder({ ...poForm, qty:parseInt(poForm.qty)||1, unitCost:parseFloat(poForm.unitCost)||0 });
    setShowPOModal(false); setPoForm(emptyPO);
  };
  const handleRefundSubmit = () => {
    if (!refundForm.productId || !refundForm.amount) return alert("Product and amount required");
    const data = { ...refundForm, qty:parseInt(refundForm.qty)||1, amount:parseFloat(refundForm.amount), returnCost:parseFloat(refundForm.returnCost)||0 };
    if (editRefundId) {
      setRefunds(rf => rf.map(r => r.id === editRefundId ? { ...r, ...data } : r));
    } else {
      addRefund(data);
    }
    setShowRefundModal(false);
    setEditRefundId(null);
    setRF({ date:todayStr(), saleId:"", productId:"", qty:1, amount:"", returnCost:"", reason:"" });
  };

  const openEditRefund = r => {
    setRF({ date:r.date, saleId:r.saleId||"", productId:r.productId, qty:r.qty, amount:r.amount, returnCost:r.returnCost||"", reason:r.reason||"" });
    setEditRefundId(r.id);
    setShowRefundModal(true);
  };

  const deleteRefund = id => {
    if (!window.confirm("Delete this refund?")) return;
    setRefunds(rf => rf.filter(r => r.id !== id));
  };

  const allPOsSelected = filteredPOs.length > 0 && selectedPOs.size === filteredPOs.length;
  const togglePO    = id => setSelectedPOs(sel => { const n=new Set(sel); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAllPOs= () => setSelectedPOs(allPOsSelected ? new Set() : new Set(filteredPOs.map(p=>p.id)));

  const bulkDeletePOs = () => {
    if (!window.confirm("Delete "+selectedPOs.size+" PO(s)? Inventory will be reversed.")) return;
    setInventory(inv => {
      const n = {...inv};
      purchaseOrders.filter(po=>selectedPOs.has(po.id)).forEach(po => {
        const prod = productMap[po.productId];
        if (prod?.category==="physical") n[po.productId] = Math.max(0,(n[po.productId]||0)-po.qty);
      });
      return n;
    });
    setPurchaseOrders(p => p.filter(x => !selectedPOs.has(x.id)));
    setSelectedPOs(new Set());
  };

  const getPOTemplate = () => {
    const pp = products.filter(p=>p.category==="physical");
    const rows = pp.length > 0
      ? pp.map(p => todayStr()+","+p.brand+","+p.sku+","+p.name+",1,"+p.cost+",").join("\n")
      : todayStr()+",My Supplier,SAVO-001,SAVIO Wooden Sorting Toy,50,8.50,Canton Fair";
    return "date,supplier/brand,sku,product,quantity,unit cost,notes\n"+rows;
  };

  const handlePOCSV = rows => {
    rows.forEach(r => {
      const sku  = String(r.sku||"").trim().toLowerCase();
      const name = String(r.product||r["product name"]||"").trim().toLowerCase();
      const prod = products.find(p=>p.sku&&p.sku.toLowerCase()===sku) || products.find(p=>p.name&&p.name.toLowerCase()===name);
      if (!prod) return;
      addPurchaseOrder({
        date:      String(r.date||todayStr()).trim(),
        productId: prod.id,
        qty:       parseInt(String(r["quantity"]||r["qty"]||"1").trim()) || 1,
        unitCost:  parseFloat(String(r["unit cost"]||r["unitcost"]||r["cost"]||"0").trim()) || 0,
        supplier:  String(r["supplier/brand"]||r["supplier"]||r["brand"]||"").trim(),
        notes:     String(r.notes||"").trim(),
      });
    });
  };

  const activeSales = sales.filter(s => !s.refunded);
  const ts = { background: C.surfaceAlt, fontWeight: 800 };

  return (
    <div>
      <div style={{ display:"flex", gap:0, marginBottom:16, border:"1px solid "+C.border, borderRadius:8, overflow:"hidden", width:"fit-content" }}>
        {[["po","Purchase Orders"],["refunds","Refunds"]].map(([id,label]) => (
          <button key={id} onClick={() => setSection(id)} style={{
            padding:"8px 20px", background:section===id?C.accent:"transparent",
            color:section===id?C.accentText:C.textMuted,
            border:"none", cursor:"pointer", fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:13,
          }}>{label}</button>
        ))}
      </div>

      {section === "po" && (
        <div>
          <SectionHeader C={C} title="Purchase Orders" action={
            <>
              {selectedPOs.size > 0 && <Btn C={C} variant="danger" onClick={bulkDeletePOs}>Delete {selectedPOs.size}</Btn>}
              <CSVImportBtn C={C} onData={handlePOCSV} label="Import CSV" getTemplate={getPOTemplate} />
              <Btn C={C} onClick={() => setShowPOModal(true)}>+ New PO</Btn>
            </>
          } />
          <FilterBar C={C} filters={[
            { label:"All Brands", value:fBrand, onChange:setFBrand, options:brands },
          ]} />
          <Card C={C} style={{ padding:0, overflow:"hidden" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width:36 }}><input type="checkbox" checked={allPOsSelected} onChange={toggleAllPOs} /></th>
                  <th>Date</th><th>Supplier / Brand</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.length===0 && <tr><td colSpan={7} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No purchase orders</td></tr>}
                {filteredPOs.map(po => {
                  const p = productMap[po.productId];
                  return (
                    <tr key={po.id}>
                      <td><input type="checkbox" checked={selectedPOs.has(po.id)} onChange={()=>togglePO(po.id)} /></td>
                      <td>{po.date}</td>
                      <td style={{ color:C.textMuted }}>{po.supplier}</td>
                      <td style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, color:C.text }}>{p?p.name:"–"}</td>
                      <td style={{ color:C.accent, fontWeight:700 }}>+{po.qty}</td>
                      <td>{fmtC(po.unitCost)}</td>
                      <td style={{ fontWeight:700 }}>{fmtC(po.unitCost*po.qty)}</td>
                    </tr>
                  );
                })}
                {filteredPOs.length > 0 && (() => {
                  const tQty  = filteredPOs.reduce((a,po)=>a+po.qty,0);
                  const tCost = filteredPOs.reduce((a,po)=>a+po.unitCost*po.qty,0);
                  return (
                    <tr>
                      <td style={ts}></td>
                      <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>TOTAL</td>
                      <td style={ts}></td>
                      <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>{filteredPOs.length} order{filteredPOs.length!==1?"s":""}</td>
                      <td style={{ ...ts, color:C.accent, fontFamily:"'DM Mono',monospace" }}>+{tQty}</td>
                      <td style={ts}></td>
                      <td style={{ ...ts, color:C.text, fontFamily:"'DM Mono',monospace" }}>{fmtC(tCost)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {section === "refunds" && (
        <div>
          <SectionHeader C={C} title="Refunds" action={<Btn C={C} onClick={() => setShowRefundModal(true)}>+ Process Refund</Btn>} />
          <Card C={C} style={{ padding:0, overflow:"hidden" }}>
            <table>
              <thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Refund Amount</th><th>Return Cost</th><th>Net Cost</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {refunds.length===0 && <tr><td colSpan={8} style={{ textAlign:"center", color:C.textMuted, padding:32 }}>No refunds</td></tr>}
                {refunds.map(r => {
                  const p = productMap[r.productId];
                  const net = r.amount + (r.returnCost||0);
                  return (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, color:C.text }}>{p?p.name:"–"}</td>
                      <td style={{ color:C.yellow }}>+{r.qty}</td>
                      <td style={{ color:C.red }}>{fmtC(r.amount)}</td>
                      <td style={{ color:C.red }}>{fmtC(r.returnCost||0)}</td>
                      <td style={{ color:C.red, fontWeight:700 }}>{fmtC(net)}</td>
                      <td style={{ color:C.textMuted }}>{r.reason}</td>
                      <td>
                        <div style={{ display:"flex", gap:5 }}>
                          <Btn C={C} variant="subtle" onClick={() => openEditRefund(r)} style={{ padding:"3px 10px", fontSize:11 }}>Edit</Btn>
                          <Btn C={C} variant="danger" onClick={() => deleteRefund(r.id)} style={{ padding:"3px 8px", fontSize:11 }}>×</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {refunds.length > 0 && (() => {
                  const tAmt  = refunds.reduce((a,r)=>a+r.amount,0);
                  const tRet  = refunds.reduce((a,r)=>a+(r.returnCost||0),0);
                  return (
                    <tr>
                      <td style={{ ...ts, color:C.textMuted, fontSize:11 }}>TOTAL</td>
                      <td style={ts}></td><td style={ts}></td>
                      <td style={{ ...ts, color:C.red, fontFamily:"'DM Mono',monospace" }}>{fmtC(tAmt)}</td>
                      <td style={{ ...ts, color:C.red, fontFamily:"'DM Mono',monospace" }}>{fmtC(tRet)}</td>
                      <td style={{ ...ts, color:C.red, fontFamily:"'DM Mono',monospace" }}>{fmtC(tAmt+tRet)}</td>
                      <td style={ts}></td><td style={ts}></td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {showPOModal && (
        <Modal C={C} title="New Purchase Order" onClose={() => setShowPOModal(false)}>
          <FormGrid>
            <Field C={C} label="Date"><input type="date" value={poForm.date} onChange={e=>setPoForm(f=>({...f,date:e.target.value}))} /></Field>
            <Field C={C} label="Supplier / Brand"><input value={poForm.supplier} onChange={e=>setPoForm(f=>({...f,supplier:e.target.value}))} placeholder="Alibaba, Canton Fair…" /></Field>
            <Field C={C} label="Product" full>
              <select value={poForm.productId} onChange={e=>setPoForm(f=>({...f,productId:e.target.value}))}>
                <option value="">— Select product —</option>
                {products.filter(p=>p.category==="physical").map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </Field>
            <Field C={C} label="Quantity"><input type="number" min="1" value={poForm.qty} onChange={e=>setPoForm(f=>({...f,qty:e.target.value}))} /></Field>
            <Field C={C} label="Unit Cost (€)"><input type="number" step="0.01" value={poForm.unitCost} onChange={e=>setPoForm(f=>({...f,unitCost:e.target.value}))} /></Field>
            <Field C={C} label="Notes" full><input value={poForm.notes} onChange={e=>setPoForm(f=>({...f,notes:e.target.value}))} placeholder="Optional…" /></Field>
          </FormGrid>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={() => setShowPOModal(false)}>Cancel</Btn>
            <Btn C={C} onClick={handlePOSubmit}>Create PO + Update Inventory</Btn>
          </div>
        </Modal>
      )}

      {showRefundModal && (
        <Modal C={C} title={editRefundId ? "Edit Refund" : "Process Refund"} onClose={() => { setShowRefundModal(false); setEditRefundId(null); }}>
          <FormGrid>
            <Field C={C} label="Date"><input type="date" value={refundForm.date} onChange={e=>setRF(f=>({...f,date:e.target.value}))} /></Field>
            <Field C={C} label="Refund Amount (€)"><input type="number" step="0.01" value={refundForm.amount} onChange={e=>setRF(f=>({...f,amount:e.target.value}))} /></Field>
            <Field C={C} label="Cost of Return (€)" style={{ color:C.textMuted }}>
              <input type="number" step="0.01" value={refundForm.returnCost} onChange={e=>setRF(f=>({...f,returnCost:e.target.value}))} placeholder="Postage, restocking fee…" />
            </Field>
            <Field C={C} label="Qty to Return"><input type="number" min="1" value={refundForm.qty} onChange={e=>setRF(f=>({...f,qty:e.target.value}))} /></Field>
            <Field C={C} label="Link to Original Sale" full>
              <select value={refundForm.saleId} onChange={e => {
                const s = sales.find(x=>x.id===e.target.value);
                setRF(f=>({...f,saleId:e.target.value,productId:s?s.productId:f.productId}));
              }}>
                <option value="">— Select original sale (optional) —</option>
                {activeSales.map(s => {
                  const p=productMap[s.productId];
                  return <option key={s.id} value={s.id}>{s.date} · {p?p.name:"?"} · {fmtC(s.salesPrice)} · {s.platform}</option>;
                })}
              </select>
            </Field>
            <Field C={C} label="Product" full>
              <select value={refundForm.productId} onChange={e=>setRF(f=>({...f,productId:e.target.value}))}>
                <option value="">— Select product —</option>
                {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field C={C} label="Reason" full><input value={refundForm.reason} onChange={e=>setRF(f=>({...f,reason:e.target.value}))} placeholder="Damaged, wrong item, customer request…" /></Field>
          </FormGrid>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            <Btn C={C} variant="ghost" onClick={() => { setShowRefundModal(false); setEditRefundId(null); }}>Cancel</Btn>
            <Btn C={C} variant="danger" onClick={handleRefundSubmit}>{editRefundId ? "Save Changes" : "Process Refund"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
