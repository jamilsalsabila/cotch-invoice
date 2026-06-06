import { useState, useRef, useEffect } from "react";

const RED       = "#CC1B1E";
const GOLD      = "#F5C418";
const RED_LIGHT = "#FDEAEA";
const FOOTER_BG = "#F6F2EB";
const NATURAL_W = 828; // lebar alami invoice (wrap 860px − padding 32px)

function rp(n) {
  return "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
}

function formatTgl(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  const bln = ["Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];
  return `${parseInt(d)} ${bln[parseInt(m) - 1]} ${y}`;
}

function printValue(val) {
  return val && String(val).trim() ? val : " ";
}

function hasValue(val) {
  return Boolean(val && String(val).trim());
}

function toWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  const base = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

  if (num < 12) return base[num];
  if (num < 20) return `${toWords(num - 10)} belas`;
  if (num < 100) return `${toWords(Math.floor(num / 10))} puluh ${toWords(num % 10)}`.trim();
  if (num < 200) return `seratus ${toWords(num - 100)}`.trim();
  if (num < 1000) return `${toWords(Math.floor(num / 100))} ratus ${toWords(num % 100)}`.trim();
  if (num < 2000) return `seribu ${toWords(num - 1000)}`.trim();
  if (num < 1000000) return `${toWords(Math.floor(num / 1000))} ribu ${toWords(num % 1000)}`.trim();
  if (num < 1000000000) return `${toWords(Math.floor(num / 1000000))} juta ${toWords(num % 1000000)}`.trim();
  if (num < 1000000000000) return `${toWords(Math.floor(num / 1000000000))} miliar ${toWords(num % 1000000000)}`.trim();
  return `${toWords(Math.floor(num / 1000000000000))} triliun ${toWords(num % 1000000000000)}`.trim();
}

function terbilangRupiah(n) {
  const value = Math.round(Number(n) || 0);
  if (value === 0) return "nol rupiah";
  const normalized = toWords(value).replace(/\s+/g, " ").trim();
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} rupiah`;
}

function getInvSeqKey(date = new Date()) {
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  return { yr, mo, key: `cotch-invoice-seq-${yr}-${mo}` };
}

function getStoredInvSeq(date = new Date()) {
  const { key } = getInvSeqKey(date);
  try { return Number(window.localStorage.getItem(key) || "0"); }
  catch { return 0; }
}

function genInvNo() {
  const now = new Date();
  const { yr, mo } = getInvSeqKey(now);
  const seq = getStoredInvSeq(now) + 1;
  return `SI.${yr}.${mo}.${String(seq).padStart(5, "0")}`;
}

function commitInvNo(invNo) {
  const match = /^SI\.(\d{4})\.(\d{2})\.(\d{5})$/.exec(invNo || "");
  if (!match) return;
  const [, yr, mo, seqStr] = match;
  const key = `cotch-invoice-seq-${yr}-${mo}`;
  const seq = Number(seqStr);
  try {
    const prev = Number(window.localStorage.getItem(key) || "0");
    if (seq > prev) window.localStorage.setItem(key, String(seq));
  } catch { /* ignore */ }
}

let uid = 1;

/* ── Signature Pad ── */
function SignaturePad() {
  const ref     = useRef(null);
  const drawing = useRef(false);
  const [has, setHas] = useState(false);

  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    ctx.strokeStyle = "#111"; ctx.lineWidth = 1.8;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
  }, []);

  const getPos = (e, c) => {
    const r = c.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: (s.clientX - r.left) * (c.width / r.width),
             y: (s.clientY - r.top)  * (c.height / r.height) };
  };

  const start = e => {
    e.preventDefault();
    const p = getPos(e, ref.current);
    const ctx = ref.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    drawing.current = true; setHas(true);
  };

  const move = e => {
    e.preventDefault();
    if (e.type === "mousemove" && e.buttons !== 1) { drawing.current = false; return; }
    const ctx = ref.current.getContext("2d");
    const p   = getPos(e, ref.current);
    if (!drawing.current) {
      if (e.type === "mousemove" && e.buttons === 1) {
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        drawing.current = true; setHas(true);
      }
      return;
    }
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };

  const stop  = () => { drawing.current = false; };
  const clear = () => {
    ref.current.getContext("2d").clearRect(0, 0, ref.current.width, ref.current.height);
    setHas(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
      <div style={{ position:"relative" }}>
        {!has && (
          <div style={{ position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)", color:"#ccc",
            fontSize:11, pointerEvents:"none", whiteSpace:"nowrap" }}>
            Tanda tangan di sini
          </div>
        )}
        <canvas ref={ref} width={220} height={80}
          style={{ cursor:"crosshair", touchAction:"none", display:"block", width:220, height:80 }}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop} />
      </div>
      {has && (
        <button className="no-print" onClick={clear} style={{ fontSize:11, color:"#bbb", background:"none",
          border:"none", cursor:"pointer", fontFamily:"inherit", marginTop:2, padding:0 }}>
          Hapus
        </button>
      )}
    </div>
  );
}

/* ── CoRow: label kiri + titik dua sejajar + input ── */
function CoRow({
  label, val, set, ph, isStatic, lw = 82, options,
  printClassName = "pv-line", inputTextAlign = "left", printFlex = 1, disabled = false,
  printText,
}) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginBottom:7, fontSize:12.5,
      opacity: disabled ? 0.55 : 1 }}>
      <span style={{ width:lw, flexShrink:0, color:"#444", fontWeight:600,
        textAlign:"left", display:"inline-block", paddingTop:2 }}>{label}</span>
      <span style={{ marginRight:10, color:"#444", fontWeight:600,
        paddingTop:2, flexShrink:0 }}>:</span>
      {isStatic
        ? <span className="pv-line-static" style={{ color:"#888", paddingTop:2 }}>{val}</span>
        : <>
            {options
              ? <select className="no-print"
                  style={{ flex:1, minWidth:0, background:"transparent", border:"none",
                    borderBottom:"1.5px dashed #ddd", outline:"none",
                    fontFamily:"'DM Sans',system-ui,sans-serif",
                    fontSize:12.5, color:"#555", padding:"2px 0", transition:"border-color .15s",
                    textAlign:inputTextAlign,
                    appearance:"none", WebkitAppearance:"none", borderRadius:0 }}
                  disabled={disabled}
                  value={val}
                  onChange={e => set(e.target.value)}
                  onFocus={e => e.target.style.borderBottomColor = RED}
                  onBlur={e  => e.target.style.borderBottomColor = "#ddd"}>
                  <option value="">{ph}</option>
                  {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              : <input className="no-print"
                  style={{ flex:1, minWidth:0, background:"transparent", border:"none",
                    borderBottom:"1.5px dashed #ddd", outline:"none",
                    fontFamily:"'DM Sans',system-ui,sans-serif",
                    fontSize:12.5, color:"#555", padding:"2px 0", transition:"border-color .15s",
                    textAlign:inputTextAlign }}
                  disabled={disabled}
                  value={val} placeholder={ph}
                  onChange={e => set(e.target.value)}
                  onFocus={e => e.target.style.borderBottomColor = RED}
                  onBlur={e  => e.target.style.borderBottomColor = "#ddd"} />
            }
            <span className={`pv ${printClassName}`} style={{ flex:printFlex, fontSize:12.5, color:"#555",
              wordBreak:"break-word", overflowWrap:"break-word", paddingTop:2 }}>
              {printText ?? printValue(val)}
            </span>
          </>
      }
    </div>
  );
}

/* ── ClRow: khusus section Ditagihkan Kepada ── */
function ClRow({ label, val, set, ph }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginTop:6, fontSize:12.5, color:"#888" }}>
      <span style={{ width:52, flexShrink:0, textAlign:"left",
        display:"inline-block", paddingTop:2 }}>{label}</span>
      <span style={{ marginRight:8, paddingTop:2, flexShrink:0 }}>:</span>
      <div style={{ flex:1, minWidth:0 }}>
        <input className="no-print"
          style={{ width:"100%", background:"transparent", border:"none",
            borderBottom:"1.5px dashed #ddd", outline:"none",
            fontFamily:"'DM Sans',system-ui,sans-serif",
            fontSize:12.5, color:"#666", padding:"2px 0", transition:"border-color .15s" }}
          value={val} placeholder={ph}
          onChange={e => set(e.target.value)}
          onFocus={e => e.target.style.borderBottomColor = RED}
          onBlur={e  => e.target.style.borderBottomColor = "#ddd"} />
        <div className="pv-block pv-block-line" style={{ fontSize:12.5, color:"#666",
          wordBreak:"break-word", overflowWrap:"break-word", whiteSpace:"pre-wrap" }}>
          {printValue(val)}
        </div>
      </div>
    </div>
  );
}

/* ── Main Invoice ── */
export default function CotchInvoice() {
  /* ── Scale logic ── */
  const cardRef   = useRef(null);
  const scalerRef = useRef(null);

  useEffect(() => {
    const refit = () => {
      const card   = cardRef.current;
      const scaler = scalerRef.current;
      if (!card || !scaler) return;

      if (window.matchMedia("(max-width: 680px)").matches) {
        card.style.width = ""; card.style.transform = "";
        card.style.transformOrigin = ""; scaler.style.height = "";
        return;
      }

      const avail = scaler.clientWidth;
      if (avail < NATURAL_W) {
        const scale = avail / NATURAL_W;
        card.style.width           = `${NATURAL_W}px`;
        card.style.transform       = `scale(${scale})`;
        card.style.transformOrigin = "top left";
        scaler.style.height = card.getBoundingClientRect().height + "px";
      } else {
        card.style.width = ""; card.style.transform = "";
        card.style.transformOrigin = ""; scaler.style.height = "";
      }
    };

    requestAnimationFrame(refit);
    window.addEventListener("resize", refit);
    const ro = new ResizeObserver(() => requestAnimationFrame(refit));
    if (cardRef.current) ro.observe(cardRef.current);
    return () => { window.removeEventListener("resize", refit); ro.disconnect(); };
  }, []);

  /* ── State ── */
  const [invNo,      setInvNo]      = useState(genInvNo);
  const [issueDate,  setIssueDate]  = useState("");
  const [dueDate,    setDueDate]    = useState("");
  const [status,     setStatus]     = useState("");
  const [payMethod,  setPayMethod]  = useState("");
  const [pic,        setPic]        = useState("");
  const [picContact, setPicContact] = useState("");

  const [clientName,  setClientName]  = useState("");
  const [clientAddr,  setClientAddr]  = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [items, setItems] = useState([{ id: uid++, desc:"", qty:1, price:0, discount:0 }]);

  const [discount,     setDiscount]     = useState(0);
  const [discountType, setDiscountType] = useState("nominal");
  const [otherFee,     setOtherFee]     = useState(0);
  const [usePPN,       setUsePPN]       = useState(true);
  const [ppnRate,      setPpnRate]      = useState(0);
  const [currency,     setCurrency]     = useState("IDR");
  const [bank,         setBank]         = useState("");
  const [accNo,        setAccNo]        = useState("");
  const [accName,      setAccName]      = useState("");
  const [notes,        setNotes]        = useState("");
  const [printWarning, setPrintWarning] = useState("");

  const transferEnabled       = !payMethod || payMethod === "Transfer Bank";
  const transferInfoRequired  = payMethod === "Transfer Bank";
  const missingTransferFields = [
    !hasValue(bank)    && "Bank",
    !hasValue(accNo)   && "No. Rekening",
    !hasValue(accName) && "Atas Nama",
  ].filter(Boolean);
  const transferInfoComplete = missingTransferFields.length === 0;

  /* ── Calculations ── */
  const subtotal = items.reduce((s, i) =>
    s + Math.max(0, Math.round(Number(i.qty || 0) * Number(i.price || 0)) - Math.round(Number(i.discount || 0))), 0);
  const normalizedPpnRate = Math.max(0, Number(ppnRate) || 0);
  const ppnAmt     = usePPN ? Math.round(subtotal * normalizedPpnRate / 100) : 0;
  const rawDiscount = Number(discount) || 0;
  const discAmt    = discountType === "percent"
    ? Math.round(subtotal * Math.min(Math.max(rawDiscount, 0), 100) / 100)
    : Math.round(rawDiscount);
  const otherFeeAmt = Math.round(Number(otherFee) || 0);
  const total      = subtotal + ppnAmt + otherFeeAmt - discAmt;
  const terbilang  = terbilangRupiah(total);

  const addItem    = () => setItems(p => [...p, { id: uid++, desc:"", qty:1, price:0, discount:0 }]);
  const removeItem = id => items.length > 1 && setItems(p => p.filter(i => i.id !== id));
  const upd        = (id, f, v) => setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i));

  useEffect(() => {
    if (!transferInfoRequired || transferInfoComplete) setPrintWarning("");
  }, [transferInfoRequired, transferInfoComplete]);

  const handlePrint = () => {
    if (transferInfoRequired && !transferInfoComplete) {
      const msg = `Lengkapi informasi transfer terlebih dahulu: ${missingTransferFields.join(", ")}.`;
      setPrintWarning(msg);
      window.alert(msg);
      return;
    }
    setPrintWarning("");
    commitInvNo(invNo);
    window.print();
    setInvNo(genInvNo());
  };

  /* ── Shared styles ── */
  const F = {
    background:"transparent", border:"none",
    borderBottom:"1.5px dashed #ddd", outline:"none",
    fontFamily:"'DM Sans',system-ui,sans-serif",
    fontSize:"inherit", color:"inherit",
    width:"100%", padding:"2px 0", transition:"border-color .15s",
  };
  const TH  = { background:RED, color:"#fff", fontWeight:600,
                fontSize:11, padding:"8px 10px", letterSpacing:0.35 };
  const SL  = { fontWeight:700, fontSize:10, color:RED,
                textTransform:"uppercase", letterSpacing:1.2, marginBottom:10, textAlign:"left" };
  const TDL = { padding:"9px 10px", fontWeight:600, color:"#444",
                textAlign:"left", verticalAlign:"middle" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{ box-sizing:border-box; margin:0; padding:0; }
        body{ background:#ece8e3; }
        .wrap{
          font-family:'DM Sans',system-ui,sans-serif;
          max-width:860px; margin:0 auto; padding:16px;
        }
        .scaler{ overflow:hidden; }

        .btn-del{ background:none;border:none;cursor:pointer;color:#e0e0e0;
          font-size:20px;line-height:1;padding:0 4px;transition:color .15s; }
        .btn-del:hover{ color:#c0392b; }
        .btn-add{ background:none;border:1.5px dashed ${RED};color:${RED};
          padding:7px 18px;border-radius:5px;cursor:pointer;font-size:12px;
          font-weight:600;font-family:'DM Sans',system-ui,sans-serif;
          transition:background .15s; }
        .btn-add:hover{ background:${RED_LIGHT}; }
        .btn-print{ background:${RED};color:#fff;border:none;padding:10px 22px;
          border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;
          font-family:'DM Sans',system-ui,sans-serif;
          display:flex;align-items:center;gap:8px;transition:background .15s; }
        .btn-print:hover{ background:#8b1215; }
        .row-e{ background:#fff; } .row-o{ background:#fafafa; }
        .row-e:hover,.row-o:hover{ background:#fff5f5; }
        select:disabled, input:disabled{ cursor:not-allowed; }
        input[type="date"]{ color-scheme:light; }
        input[type="date"]::-webkit-calendar-picker-indicator{ opacity:.5;cursor:pointer; }
        .summary-input-row{
          display:flex; justify-content:flex-end; align-items:center; gap:8px;
        }
        .summary-single-input{
          display:flex; justify-content:flex-end;
        }
        /* Print-value elements: hidden on screen */
        .pv       { display:none; }
        .pv-block { display:none; }
        .desc-print{ display:none; }
        .notes-empty{ display:none; }

        /* ── Print ── */
        @media print {
          body{ background:#fff; }
          .no-print{ display:none !important; }
          .wrap{ padding:0; max-width:100%; }
          .scaler{ overflow:visible !important; height:auto !important; }
          .card{
            box-shadow:none !important; border:none !important;
            border-radius:0 !important;
            transform:none !important; width:100% !important;
          }
          input, textarea{
            border:none !important; outline:none !important;
            background:transparent !important; -webkit-appearance:none;
          }
          input[type="date"], input[type="checkbox"]{ display:none !important; }
          .pv{
            display:inline !important;
            word-break:break-word; overflow-wrap:break-word;
            text-align:left !important;
          }
          .pv-line{
            display:inline-block !important;
            min-width:100%;
            min-height:18px;
            padding-bottom:2px;
            border-bottom:1px solid #bfb7b1;
          }
          .pv-line-mid{
            display:inline-block !important;
            min-width:0;
            min-height:18px;
            padding-bottom:2px;
            border-bottom:1px solid #bfb7b1;
          }
          .pv-line-short{
            display:inline-block !important;
            min-width:0;
            min-height:18px;
            padding-bottom:2px;
            border-bottom:1px solid #bfb7b1;
          }
          .pv-line-static{
            display:inline-block !important;
            min-width:110px;
            min-height:18px;
            padding-bottom:2px;
            border-bottom:1px solid #bfb7b1;
          }
          .pv-block{
            display:block !important;
            word-break:break-word; overflow-wrap:break-word;
            white-space:pre-wrap; text-align:left !important;
          }
          .pv-block-line{
            min-height:18px;
            padding-bottom:3px;
            border-bottom:1px solid #bfb7b1;
          }
          .desc-print{ display:block !important;
            word-break:break-word; overflow-wrap:break-word;
            min-height:18px; text-align:left !important; }
          .desc-cell{ word-wrap:break-word; overflow-wrap:break-word;
            white-space:normal !important; }
          .desc-cell input{ display:none !important; }
          .print-no-divider{ border-right:none !important; }
          .print-hide-divider{ display:none !important; }
          .notes-empty{
            display:grid !important;
            margin-top:10px;
            row-gap:12px;
          }
          .notes-empty span{
            display:block;
            min-height:18px;
            border-bottom:1px solid #bfb7b1;
          }
        }

        /* ── Minimal responsive ── */
        @media (max-width:860px) {
          .wrap{ padding:8px; }
          .summary-input-row,
          .summary-single-input{ width:100%; }
          .summary-input-row{ justify-content:stretch; }
          .summary-input-row > *,
          .summary-single-input > *{ flex:1 1 0; min-width:0; }
        }
      `}</style>

      <div className="wrap">

        {/* Toolbar */}
        <div className="no-print" style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <button className="btn-print" onClick={handlePrint}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak / Simpan PDF
          </button>
        </div>
        {printWarning && (
          <div className="no-print" style={{
            marginBottom:12, padding:"10px 12px", borderRadius:8,
            background:"#fff1f1", border:"1px solid #f1cccc",
            color:"#9a3030", fontSize:12, lineHeight:1.5,
          }}>
            {printWarning}
          </div>
        )}

        <div ref={scalerRef} className="scaler">
          <div ref={cardRef} className="card"
            style={{ background:"#fff", borderRadius:10, overflow:"hidden",
              boxShadow:"0 4px 24px rgba(0,0,0,0.09)" }}>

            <div style={{ background:RED,  height:7 }} />
            <div style={{ background:GOLD, height:3 }} />

            {/* ── HEADER ── */}
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", padding:"28px 36px 20px", gap:24 }}>

              <div style={{ minWidth:0 }}>
                <img src="./logo-cotch.png" alt="Cotch"
                  style={{ height:88, display:"block", marginBottom:6 }}
                  onError={e => { e.target.style.display="none";
                    e.target.nextSibling.style.display="block"; }} />
                <div style={{ display:"none", fontFamily:"'Playfair Display',Georgia,serif",
                  fontWeight:900, fontSize:36, color:RED, marginBottom:6 }}>Cotch</div>
                <div style={{ fontSize:10.5, color:"#b0a59b", marginBottom:6, textAlign:"left" }}>
                  Operated by PT Kuku Momma Indonesia
                </div>
                <div style={{ fontSize:11.5, color:"#999", lineHeight:2, textAlign:"left" }}>
                  <div>Jl. LLRE Martadinata No. 221, Cihapit, Bandung Wetan</div>
                  <div>Kota Bandung, Jawa Barat 40114</div>
                  <div>+62 816-1617-181</div>
                </div>
              </div>

              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:"'Libre Baskerville',Georgia,serif",
                  fontWeight:700, fontSize:40, color:"#111", lineHeight:1.05, letterSpacing:-0.6 }}>
                  INVOICE
                </div>
                <div style={{ marginTop:8, display:"flex", justifyContent:"flex-end",
                  alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11.5, fontWeight:600, color:RED, whiteSpace:"nowrap" }}>No. Faktur #</span>
                  <input className="no-print" value={invNo} onChange={e => setInvNo(e.target.value)}
                    style={{ ...F, width:165, fontSize:12, color:RED, fontWeight:600, textAlign:"right" }}
                    onFocus={e => e.target.style.borderBottomColor=RED}
                    onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                  <span className="pv pv-line" style={{ fontSize:12, color:RED, fontWeight:600, whiteSpace:"nowrap" }}>
                    {printValue(invNo)}
                  </span>
                </div>
                {[["Tanggal", issueDate, setIssueDate],
                  ["Jatuh Tempo", dueDate, setDueDate]].map(([lbl, val, set]) => (
                  <div key={lbl} style={{ display:"flex", justifyContent:"flex-end",
                    alignItems:"center", gap:6, marginTop:4 }}>
                    <span style={{ fontSize:11.5, color:"#999", whiteSpace:"nowrap" }}>{lbl}:</span>
                    <input type="date" className="no-print" value={val}
                      onChange={e => set(e.target.value)}
                      style={{ ...F, width:148, fontSize:11.5, color:"#777", textAlign:"right" }}
                      onFocus={e => e.target.style.borderBottomColor=RED}
                      onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                    <span className="pv pv-line" style={{ fontSize:11.5, color:"#777", whiteSpace:"nowrap" }}>
                      {formatTgl(val) || " "}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:"#F3EDED", height:5 }} />
            <div style={{ background:GOLD,    height:2 }} />

            {/* ── DITAGIHKAN + DETAIL PEMBAYARAN ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", padding:"0 36px" }}>

              <div className="print-no-divider"
                style={{ padding:"20px 28px 20px 0", borderRight:"1px solid #eeebe8" }}>
                <div style={SL}>Ditagihkan Kepada</div>
                <input className="no-print" value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Nama Klien / Perusahaan"
                  style={{ ...F, fontWeight:700, fontSize:15, color:"#111", marginBottom:6 }}
                  onFocus={e => e.target.style.borderBottomColor=RED}
                  onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                <div className="pv-block pv-block-line" style={{ fontWeight:700, fontSize:15, color:"#111",
                  marginBottom:6, wordBreak:"break-word" }}>{printValue(clientName)}</div>
                <ClRow label="Alamat"  val={clientAddr}  set={setClientAddr}  ph="Alamat klien / perusahaan" />
                <ClRow label="Email"   val={clientEmail} set={setClientEmail} ph="email@klien.com" />
                <ClRow label="No. HP"  val={clientPhone} set={setClientPhone} ph="+62 xxx-xxxx-xxxx" />
              </div>

              <div style={{ padding:"20px 0 20px 28px" }}>
                <div style={SL}>Detail Pembayaran</div>
                <CoRow label="Status"     val={status}     set={setStatus}     ph="Pilih status"        lw={82}
                  options={["Draft", "Paid", "Unpaid"]} printClassName="pv-line-short" printFlex={1} />
                <CoRow label="Metode"     val={payMethod}  set={setPayMethod}  ph="Pilih metode"        lw={82}
                  options={["Transfer Bank", "Tunai", "QRIS", "Kartu Kredit", "Virtual Account"]}
                  printClassName="pv-line-short" printFlex={1} />
                <CoRow label="PIC"        val={pic}        set={setPic}        ph="Admin Finance Cotch" lw={82}
                  printClassName="pv-line-short" printFlex={1} />
                <CoRow label="Kontak PIC" val={picContact} set={setPicContact} ph="+62 xxx-xxxx-xxxx"  lw={82}
                  printClassName="pv-line-short" printFlex={1} />
                <CoRow label="Mata Uang"  val={currency}   set={setCurrency}   ph="Pilih mata uang"    lw={82}
                  options={["IDR", "USD", "SGD", "EUR"]} printClassName="pv-line-short" printFlex={1} />
              </div>
            </div>

            {/* ── LINE ITEMS ── */}
            <div style={{ padding:"16px 36px 0" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width:42,  textAlign:"center" }}>No</th>
                    <th style={{ ...TH,             textAlign:"left"   }}>Deskripsi</th>
                    <th style={{ ...TH, width:68,  textAlign:"center" }}>Qty</th>
                    <th style={{ ...TH, width:128, textAlign:"right"  }}>Harga Satuan (Rp)</th>
                    <th style={{ ...TH, width:118, textAlign:"right"  }}>Diskon (Rp)</th>
                    <th style={{ ...TH, width:138, textAlign:"right"  }}>Jumlah</th>
                    <th className="no-print" style={{ ...TH, width:34 }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const baseAmt    = Math.round(Number(item.qty||0) * Number(item.price||0));
                    const itemDisc   = Math.round(Number(item.discount||0));
                    const amt        = Math.max(0, baseAmt - itemDisc);
                    return (
                      <tr key={item.id}
                        className={idx % 2 === 0 ? "row-e" : "row-o"}
                        style={{ borderBottom:"1px solid #eee" }}>
                        <td style={{ textAlign:"center", padding:"11px 8px",
                          color:"#aaa", fontSize:13 }}>{idx + 1}</td>
                        <td className="desc-cell" style={{ padding:"11px 10px", minWidth:160 }}>
                          <input value={item.desc}
                            onChange={e => upd(item.id,"desc",e.target.value)}
                            placeholder="Deskripsi item..."
                            style={{ ...F, color:"#222", fontSize:13 }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                          <span className="desc-print" style={{ fontSize:13, color:"#222" }}>
                            {printValue(item.desc)}
                          </span>
                        </td>
                        <td style={{ padding:"11px 8px" }}>
                          <input type="number" min="1" value={item.qty}
                            onChange={e => upd(item.id,"qty",e.target.value)}
                            style={{ ...F, width:52, fontSize:13, color:"#333",
                              textAlign:"center", margin:"0 auto", display:"block",
                              MozAppearance:"textfield" }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                        </td>
                        <td style={{ padding:"11px 10px" }}>
                          <input type="number" min="0" value={item.price}
                            onChange={e => upd(item.id,"price",e.target.value)}
                            style={{ ...F, fontSize:13, color:"#333", textAlign:"right",
                              MozAppearance:"textfield" }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                        </td>
                        <td style={{ padding:"11px 10px" }}>
                          <input type="number" min="0" value={item.discount}
                            onChange={e => upd(item.id,"discount",e.target.value)}
                            style={{ ...F, fontSize:13, color:"#333", textAlign:"right",
                              MozAppearance:"textfield" }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                        </td>
                        <td style={{ padding:"11px 10px", textAlign:"right",
                          fontWeight:500, color:"#222", fontSize:13, whiteSpace:"nowrap" }}>
                          {rp(amt)}
                        </td>
                        <td className="no-print" style={{ padding:"4px 6px", textAlign:"center" }}>
                          <button className="btn-del"
                            onClick={() => removeItem(item.id)} title="Hapus">×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="no-print" style={{ padding:"12px 0 6px" }}>
                <button className="btn-add" onClick={addItem}>+ Tambah Item</button>
              </div>
            </div>

            {/* ── KETERANGAN + TOTAL ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:28, padding:"20px 36px 26px" }}>

              <div>
                <div style={SL}>Keterangan</div>
                <textarea className="no-print" value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3} placeholder="Catatan tambahan untuk klien..."
                  style={{ resize:"vertical", border:"1px dashed #ddd", borderRadius:5,
                    background:"#fff",
                    padding:"8px 10px", fontSize:12, color:"#777", lineHeight:1.75,
                    width:"100%", fontFamily:"'DM Sans',system-ui,sans-serif",
                    outline:"none", transition:"border-color .15s",
                    colorScheme:"light" }}
                  onFocus={e => e.target.style.borderColor=RED}
                  onBlur={e  => e.target.style.borderColor="#ddd"} />
                <div className="pv-block pv-block-line" style={{ fontSize:12, color:"#777",
                  lineHeight:1.75, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>
                  {notes ? notes : " "}
                </div>
                {!notes && (
                  <div className="notes-empty">
                    <span /><span /><span />
                  </div>
                )}
              </div>

              <div>
                <table style={{ width:"100%", borderCollapse:"collapse",
                  fontSize:13, tableLayout:"fixed" }}>
                  <colgroup>
                    <col style={{ width:"56%" }} />
                    <col style={{ width:"44%" }} />
                  </colgroup>
                  <tbody>
                    <tr style={{ borderTop:"1.5px solid #eee", borderBottom:"1px solid #eee" }}>
                      <td style={TDL}>Subtotal</td>
                      <td style={{ padding:"9px 10px", textAlign:"right",
                        color:"#444", whiteSpace:"nowrap", verticalAlign:"middle" }}>
                        {rp(subtotal)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom:"1px solid #eee" }}>
                      <td style={TDL}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span>{`PPN ${normalizedPpnRate}%`}</span>
                          <label className="no-print"
                            style={{ cursor:"pointer", fontWeight:400, display:"inline-flex", alignItems:"center" }}>
                            <input type="checkbox" checked={usePPN}
                              onChange={e => setUsePPN(e.target.checked)}
                              style={{ accentColor:RED, verticalAlign:"middle" }} />
                          </label>
                        </div>
                      </td>
                      <td style={{ padding:"9px 10px", textAlign:"right",
                        color:"#444", whiteSpace:"nowrap", verticalAlign:"middle" }}>
                        <div className="no-print summary-single-input" style={{ marginBottom:4 }}>
                          <input type="number" min="0" step="0.01" value={ppnRate}
                            onChange={e => setPpnRate(e.target.value)}
                            style={{ ...F, width:72, fontSize:13, color:"#444",
                              textAlign:"right", MozAppearance:"textfield" }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                        </div>
                        {rp(ppnAmt)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom:"1.5px solid #eee" }}>
                      <td style={TDL}>Diskon</td>
                      <td style={{ padding:"9px 10px", textAlign:"right", verticalAlign:"middle" }}>
                        <div className="no-print summary-input-row">
                          <select value={discountType}
                            onChange={e => setDiscountType(e.target.value)}
                            style={{ ...F, width:78, fontSize:12.5, color:"#444", textAlign:"left",
                              appearance:"none", WebkitAppearance:"none", borderRadius:0 }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"}>
                            <option value="nominal">Nominal</option>
                            <option value="percent">Persen</option>
                          </select>
                          <input type="number" min="0" max={discountType === "percent" ? "100" : undefined}
                            className="no-print" value={discount}
                            onChange={e => setDiscount(e.target.value)}
                            style={{ ...F, width:90, fontSize:13, color:"#444",
                              textAlign:"right", MozAppearance:"textfield" }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                        </div>
                        <span className="pv pv-line" style={{ color:"#444" }}>{rp(discAmt)}</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom:"1.5px solid #eee" }}>
                      <td style={TDL}>Biaya Lain-lain</td>
                      <td style={{ padding:"9px 10px", textAlign:"right", verticalAlign:"middle" }}>
                        <div className="no-print summary-single-input">
                          <input type="number" min="0" value={otherFee}
                            onChange={e => setOtherFee(e.target.value)}
                            style={{ ...F, width:120, fontSize:13, color:"#444",
                              textAlign:"right", MozAppearance:"textfield" }}
                            onFocus={e => e.target.style.borderBottomColor=RED}
                            onBlur={e  => e.target.style.borderBottomColor="#ddd"} />
                        </div>
                        <span className="pv pv-line" style={{ color:"#444" }}>{rp(otherFeeAmt)}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ padding:0 }}>
                        <div style={{ background:RED, borderRadius:5, display:"flex",
                          justifyContent:"space-between", padding:"10px 10px", marginTop:4 }}>
                          <span style={{ fontWeight:700, color:"#fff", fontSize:14 }}>TOTAL</span>
                          <span style={{ fontWeight:700, color:"#fff",
                            fontSize:14, whiteSpace:"nowrap" }}>{rp(total)}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ padding:"10px 2px 0" }}>
                        <div style={{ fontSize:10.5, color:RED, fontWeight:700,
                          letterSpacing:1, textTransform:"uppercase", marginBottom:5, textAlign:"left" }}>
                          Terbilang
                        </div>
                        <div style={{
                          fontSize:12.5, color:"#555", lineHeight:1.75,
                          fontStyle:"italic",
                          borderBottom:"1px solid #d8d0c8",
                          paddingBottom:6, textAlign:"left",
                        }}>
                          {terbilang}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── INFORMASI TRANSFER + TANDA TANGAN ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:28, padding:"0 36px 32px" }}>
              <div style={{ opacity: transferEnabled ? 1 : 0.72, transition:"opacity .18s ease" }}>
                <div style={SL}>Informasi Transfer</div>
                {!transferEnabled && (
                  <div style={{
                    marginBottom:12, padding:"9px 11px", borderRadius:6,
                    background:"#f8f3ef", border:"1px solid #eadfd7",
                    color:"#8b6f61", fontSize:11.5, lineHeight:1.5,
                  }}>
                    Informasi transfer dinonaktifkan karena metode pembayaran yang dipilih bukan transfer bank.
                  </div>
                )}
                {transferInfoRequired && !transferInfoComplete && (
                  <div className="no-print" style={{
                    marginBottom:12, padding:"9px 11px", borderRadius:6,
                    background:"#fff4e8", border:"1px solid #f0d6b2",
                    color:"#9a6230", fontSize:11.5, lineHeight:1.5,
                  }}>
                    Untuk metode transfer bank, lengkapi: {missingTransferFields.join(", ")}.
                  </div>
                )}
                <CoRow label="Bank"         val={bank}    set={setBank}
                  ph="Nama Bank"         lw={108} printClassName="pv-line-mid" printFlex="0 1 55%"
                  printText={transferEnabled ? (hasValue(bank)    ? bank    : "Belum diisi") : " "}
                  disabled={!transferEnabled} />
                <CoRow label="No. Rekening" val={accNo}   set={setAccNo}
                  ph="Nomor Rekening"    lw={108} printClassName="pv-line-mid" printFlex="0 1 55%"
                  printText={transferEnabled ? (hasValue(accNo)   ? accNo   : "Belum diisi") : " "}
                  disabled={!transferEnabled} />
                <CoRow label="Atas Nama"    val={accName} set={setAccName}
                  ph="Nama Pemegang Rek" lw={108} printClassName="pv-line-mid" printFlex="0 1 55%"
                  printText={transferEnabled ? (hasValue(accName) ? accName : "Belum diisi") : " "}
                  disabled={!transferEnabled} />
              </div>
              <div style={{ display:"flex", flexDirection:"column",
                justifyContent:"flex-end", alignItems:"flex-end" }}>
                <div style={{ fontSize:12.5, color:"#888", marginBottom:8 }}>Hormat kami,</div>
                <SignaturePad />
                <div style={{ fontSize:11.5, color:"#bbb", marginTop:6, textAlign:"right" }}>
                  Finance Department PT Kuku Momma Indonesia
                </div>
              </div>
            </div>

            {/* ── FOOTER ── */}
            <div style={{ background:FOOTER_BG, padding:"10px 36px" }} />

          </div>{/* end .card */}
        </div>{/* end .scaler */}
      </div>{/* end .wrap */}
    </>
  );
}
