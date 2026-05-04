"use client";

import { useState, useEffect } from "react";

// ============================================================
// SUPABASE — .env.local'dan okunuyor
// ============================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = {
  get headers() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
  },
  async query(table, params = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: this.headers, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

// ============================================================
// YARDIMCI FONKSİYONLAR
// ============================================================
async function hashTC(tc) {
  const data = new TextEncoder().encode(tc.trim());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function validateTC(tc) {
  if (!/^\d{11}$/.test(tc) || tc[0] === "0") return false;
  const d = tc.split("").map(Number);
  const c10 = (d[0]+d[2]+d[4]+d[6]+d[8])*7 - (d[1]+d[3]+d[5]+d[7]);
  if (((c10 % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0,10).reduce((a,b)=>a+b,0) % 10 === d[10];
}

// Excel (xlsx) ve CSV parser - SheetJS CDN'den yüklenir
let XLSX = null;
async function loadXLSX() {
  if (XLSX) return XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => { XLSX = window.XLSX; resolve(XLSX); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function parseFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    // Excel dosyası
    const xlsx = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = xlsx.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: "", raw: false });
    // Header'ları lowercase yap
    return rows.map(row => {
      const r = {};
      Object.keys(row).forEach(k => { r[k.trim().toLowerCase()] = String(row[k] || "").trim(); });
      return r;
    });
  } else {
    // CSV/TXT dosyası
    let text = await file.text();
    text = text.replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));
    const colCount = headers.length;
    return lines.slice(1).map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ""));
      const row = {};
      headers.forEach((h, i) => {
        if (i === colCount - 1 && vals.length > colCount) {
          row[h] = vals.slice(i).join(", ");
        } else {
          row[h] = vals[i] || "";
        }
      });
      return row;
    });
  }
}

function mapRow(row) {
  // AKBİS direkt sütun isimleri + genel formatlar
  const tc = row["tc"]||row["tc kimlik no"]||row["tc_kimlik"]||row["tckimlik"]||row["tc_kimlik_no"]||row["tckimlikno"]||row["kimlik_no"]||"";
  const ad = row["ad_soyad"]||row["adsoyad"]||row["ad soyad"]||row["isim"]||row["ad"]||row["adı"]||"";
  const soyad = row["soyad"]||row["soyadı"]||"";
  const mahalle = row["mahalle"]||row["üye mahalle"]||row["ilce"]||row["semt"]||"";
  const telefon = row["telefon"]||row["tel"]||row["phone"]||row["gsm"]||row["cep telefonu"]||"";
  const adres = row["adres"]||row["seçmen adres"]||row["ev adres"]||row["adress"]||"";
  const referans = row["referans"]||row["referanslar"]||row["referanslari"]||"";
  return {
    tc_kimlik: tc.replace(/\D/g, ""),
    ad_soyad: soyad ? `${ad} ${soyad}`.trim() : ad.trim(),
    mahalle: mahalle.trim(),
    telefon: telefon.replace(/\D/g, ""),
    adres: adres.trim(),
    referans: referans.trim(),
  };
}

// ============================================================
// AK PARTİ AMPUL LOGO
// ============================================================
function AKPartiLogo({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="60" y1="4" x2="60" y2="16" stroke="#F5A623" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="30" y1="16" x2="36" y2="26" stroke="#F5A623" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="90" y1="16" x2="84" y2="26" stroke="#F5A623" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="12" y1="48" x2="24" y2="48" stroke="#F5A623" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="108" y1="48" x2="96" y2="48" stroke="#F5A623" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="22" y1="76" x2="32" y2="70" stroke="#F5A623" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="98" y1="76" x2="88" y2="70" stroke="#F5A623" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M40 72 C40 72 32 60 32 46 C32 30 44 20 60 20 C76 20 88 30 88 46 C88 60 80 72 80 72 Z" fill="#FBC02D" stroke="#F5A623" strokeWidth="2"/>
      <path d="M45 68 C45 68 38 58 38 46 C38 33 47 25 60 25 C73 25 82 33 82 46 C82 58 75 68 75 68 Z" fill="#FFD54F" opacity="0.6"/>
      <path d="M52 65 Q55 45 60 40 Q65 45 68 65" stroke="#E65100" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <rect x="44" y="74" width="32" height="5" rx="1.5" fill="#404040"/>
      <rect x="46" y="79" width="28" height="4" rx="1" fill="#666"/>
      <rect x="44" y="83" width="32" height="5" rx="1.5" fill="#404040"/>
      <rect x="48" y="88" width="24" height="6" rx="3" fill="#333"/>
    </svg>
  );
}

// ============================================================
// RENK PALETİ
// ============================================================
const ak = {
  yellow: "#FBC02D", yellowDark: "#F5A623", yellowDeep: "#E8971A",
  yellowLight: "#FFF3C4", yellowGlow: "rgba(251,192,45,0.25)",
  black: "#1A1A1A", darkGray: "#2D2D2D", midGray: "#404040",
  white: "#FFFFFF", offWhite: "#FAFAF8", cream: "#FFF8E7",
  red: "#D32F2F", redSoft: "rgba(211,47,47,0.08)",
  green: "#2E7D32", greenSoft: "rgba(46,125,50,0.08)",
  textDark: "#1A1A1A", textMuted: "#666", textLight: "#999",
  border: "#E5E0D5", inputBg: "#FFF", cardBg: "#FFF", pageBg: "#F4F2EC",
};

// ============================================================
// UI KOMPONENTLERİ
// ============================================================
function Spinner({ color = ak.yellowDark }) {
  return <div style={{ width:20, height:20, border:`2.5px solid ${color}33`, borderTopColor:color, borderRadius:"50%", animation:"spin 0.6s linear infinite", display:"inline-block" }} />;
}

function Input({ icon, ...props }) {
  return (
    <div style={{ position:"relative" }}>
      {icon && <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none", color:ak.textLight }}>{icon}</span>}
      <input {...props}
        style={{
          width:"100%", padding: icon ? "14px 14px 14px 44px" : "14px",
          background:ak.inputBg, border:`1.5px solid ${ak.border}`, borderRadius:10,
          color:ak.textDark, fontSize:15, outline:"none", transition:"border-color 0.2s, box-shadow 0.2s",
          boxSizing:"border-box", fontFamily:"'Source Sans 3', sans-serif", ...(props.style||{})
        }}
        onFocus={e => { e.target.style.borderColor = ak.yellowDark; e.target.style.boxShadow = `0 0 0 3px ${ak.yellowGlow}`; props.onFocus?.(e); }}
        onBlur={e => { e.target.style.borderColor = ak.border; e.target.style.boxShadow = "none"; props.onBlur?.(e); }}
      />
    </div>
  );
}

function Button({ children, variant="primary", loading, ...props }) {
  const styles = {
    primary: { background:`linear-gradient(135deg, ${ak.yellowDark}, ${ak.yellow})`, color:ak.black, boxShadow:`0 4px 16px ${ak.yellowGlow}`, fontWeight:700 },
    dark: { background:ak.black, color:ak.white, boxShadow:"0 2px 8px rgba(0,0,0,0.15)", fontWeight:600 },
    secondary: { background:ak.offWhite, color:ak.textDark, border:`1.5px solid ${ak.border}`, boxShadow:"none", fontWeight:600 },
    ghost: { background:"transparent", color:ak.textMuted, boxShadow:"none", fontWeight:500 },
  };
  return (
    <button {...props} disabled={loading||props.disabled}
      style={{
        padding:"13px 24px", border:"none", borderRadius:10, fontSize:14,
        cursor: loading||props.disabled ? "not-allowed":"pointer",
        opacity: loading||props.disabled ? 0.5 : 1, transition:"all 0.2s",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        ...styles[variant], ...(props.style||{})
      }}
    >{loading ? <Spinner color={variant==="primary"?ak.black:ak.yellowDark} /> : children}</button>
  );
}

function Card({ children, style }) {
  return <div style={{ background:ak.cardBg, border:`1.5px solid ${ak.border}`, borderRadius:16, padding:28, boxShadow:"0 1px 8px rgba(0,0,0,0.04)", ...style }}>{children}</div>;
}

function YellowBar() {
  return <div style={{ height:4, background:`linear-gradient(90deg, ${ak.yellowDeep}, ${ak.yellow}, ${ak.yellowDeep})`, borderRadius:2, marginBottom:22 }} />;
}

function Header({ children }) {
  return (
    <div style={{ padding:"12px 24px", borderBottom:`1.5px solid ${ak.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:ak.white }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <AKPartiLogo size={34} />
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:ak.textDark, letterSpacing:-0.3 }}>Üye Doğrulama</div>
          <div style={{ fontSize:10, color:ak.textLight, fontWeight:600 }}>AK Parti Üye Doğrulama</div>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>{children}</div>
    </div>
  );
}

// ============================================================
// LOGIN EKRANI
// ============================================================
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!user.trim()||!pass.trim()) { setError("Kullanıcı adı ve şifre giriniz"); return; }
    setLoading(true); setError("");
    try {
      const ph = await hashTC(pass);
      const r = await supabase.query("admins", `username=eq.${encodeURIComponent(user.trim())}&password_hash=eq.${ph}&select=*`);
      r.length > 0 ? onLogin(r[0]) : setError("Kullanıcı adı veya şifre hatalı");
    } catch(e) { setError("Bağlantı hatası: " + e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(170deg, ${ak.cream} 0%, ${ak.pageBg} 50%, #EFECE4 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ position:"fixed", top:-100, right:-100, width:350, height:350, borderRadius:"50%", background:ak.yellowGlow, filter:"blur(80px)", pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <AKPartiLogo size={64} />
          <h1 style={{ fontSize:22, fontWeight:800, color:ak.textDark, margin:"12px 0 4px", letterSpacing:-0.5 }}>Üye Doğrulama Sistemi</h1>
          <p style={{ fontSize:13, color:ak.textMuted, margin:0, fontWeight:500 }}>AK Parti Üye Doğrulama Sistemi</p>
        </div>

        <Card style={{ padding:32 }}>
          <YellowBar />
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:ak.textMuted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Kullanıcı Adı</label>
              <Input icon="👤" placeholder="Kullanıcı adınız" value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:ak.textMuted, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Şifre</label>
              <Input icon="🔒" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()} />
            </div>
            {error && <div style={{ background:ak.redSoft, color:ak.red, padding:"10px 14px", borderRadius:8, fontSize:13, fontWeight:600 }}>{error}</div>}
            <Button loading={loading} onClick={handle} style={{ width:"100%", fontSize:15, padding:"14px" }}>Giriş Yap</Button>
          </div>
        </Card>
        <p style={{ textAlign:"center", fontSize:11, color:ak.textLight, marginTop:20, fontWeight:500 }}>AK Parti Üye Doğrulama Sistemi</p>
      </div>
    </div>
  );
}

// ============================================================
// SORGU EKRANI
// ============================================================
function QueryScreen({ admin, onLogout, onGoAdmin }) {
  const [tc, setTC] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queryCount, setQueryCount] = useState(0);
  const [memberInfo, setMemberInfo] = useState(null);

  const handle = async () => {
    setResult(null); setError(""); setMemberInfo(null);
    if (!validateTC(tc)) { setError("Geçerli bir TC Kimlik numarası giriniz"); return; }
    setLoading(true);
    try {
      const h = await hashTC(tc.trim());
      const d = await supabase.query("members", `tc_hash=eq.${h}&select=id,ad_soyad,mahalle,telefon,adres`);
      if (d.length > 0) {
        setResult("uye");
        setMemberInfo(d[0]);
      } else {
        setResult("degil");
      }
      setQueryCount(c => c + 1);
      try { await supabase.insert("query_logs", { admin_id: admin.id, tc_hash: h, is_member: d.length > 0 }); } catch(_) {}
    } catch(e) { setError("Sorgulama hatası: " + e.message); }
    setLoading(false);
  };
  const reset = () => { setTC(""); setResult(null); setError(""); setMemberInfo(null); };

  return (
    <div style={{ minHeight:"100vh", background:ak.pageBg, display:"flex", flexDirection:"column" }}>
      <Header>
        <span style={{ fontSize:13, color:ak.textMuted, fontWeight:600 }}>{admin.display_name || admin.username}</span>
        {admin.role === "superadmin" && <Button variant="dark" onClick={onGoAdmin} style={{ padding:"7px 14px", fontSize:12 }}>Yönetim</Button>}
        <Button variant="ghost" onClick={onLogout} style={{ padding:"7px 12px", fontSize:12 }}>Çıkış</Button>
      </Header>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ width:"100%", maxWidth:500 }}>
          <div style={{ background:ak.cream, border:`1.5px solid ${ak.yellowDark}22`, borderRadius:14, padding:"16px 20px", marginBottom:20, textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, color:ak.yellowDark }}>{queryCount}</div>
            <div style={{ fontSize:11, color:ak.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>Sorgu Yapıldı</div>
          </div>

          <Card style={{ padding:32 }}>
            <YellowBar />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <AKPartiLogo size={28} />
              <h2 style={{ fontSize:20, fontWeight:800, color:ak.textDark, margin:0 }}>TC Kimlik Sorgula</h2>
            </div>
            <p style={{ fontSize:13, color:ak.textMuted, margin:"4px 0 22px", fontWeight:500 }}>Üye olduğunu beyan eden kişinin TC Kimlik numarasını girerek kayıt kontrolü yapın</p>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Input icon="🔍" placeholder="TC Kimlik No (11 haneli)" value={tc} maxLength={11}
                onChange={e => { setTC(e.target.value.replace(/\D/g, "")); if (result) reset(); }}
                onKeyDown={e => e.key === "Enter" && handle()}
                style={{ fontSize:22, padding:"18px 14px 18px 44px", letterSpacing:4, fontWeight:700, fontFamily:"'JetBrains Mono', monospace" }}
              />
              {error && <div style={{ background:ak.redSoft, color:ak.red, padding:"10px 14px", borderRadius:8, fontSize:13, fontWeight:600 }}>{error}</div>}
              {!result && <Button loading={loading} onClick={handle} style={{ width:"100%", fontSize:15 }}>Sorgula</Button>}

              {result === "uye" && memberInfo && (
                <div style={{ background:"linear-gradient(135deg, #E8F5E9, #F1F8E9)", border:"2px solid #66BB6A", borderRadius:16, padding:28, animation:"fadeIn 0.4s ease" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ width:64, height:64, background:"#2E7D32", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:30, color:"#fff", fontWeight:800 }}>✓</div>
                    <div style={{ fontSize:24, fontWeight:800, color:"#2E7D32" }}>ÜYE</div>
                    <p style={{ fontSize:13, color:ak.textMuted, margin:"8px 0 0", fontWeight:500 }}>Bu kişi kayıtlı üyedir, form doldurmayınız</p>
                  </div>

                  {/* Üye Bilgileri */}
                  <div style={{ marginTop:20, background:"rgba(255,255,255,0.7)", borderRadius:12, padding:16 }}>
                    {memberInfo.ad_soyad && (
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${ak.border}` }}>
                        <span style={{ fontSize:12, color:ak.textMuted, fontWeight:600 }}>Ad Soyad</span>
                        <span style={{ fontSize:13, color:ak.textDark, fontWeight:700 }}>{memberInfo.ad_soyad}</span>
                      </div>
                    )}
                    {memberInfo.mahalle && (
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0" }}>
                        <span style={{ fontSize:12, color:ak.textMuted, fontWeight:600 }}>Mahalle</span>
                        <span style={{ fontSize:13, color:ak.textDark, fontWeight:700 }}>{memberInfo.mahalle}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign:"center", marginTop:16 }}>
                    <Button variant="secondary" onClick={reset} style={{ margin:"0 auto" }}>Yeni Sorgu</Button>
                  </div>
                </div>
              )}
              {result === "degil" && (
                <div style={{ background:"linear-gradient(135deg, #FFEBEE, #FFF3E0)", border:"2px solid #EF5350", borderRadius:16, padding:28, textAlign:"center", animation:"fadeIn 0.4s ease" }}>
                  <div style={{ width:64, height:64, background:"#D32F2F", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:30, color:"#fff", fontWeight:800 }}>✗</div>
                  <div style={{ fontSize:24, fontWeight:800, color:"#D32F2F" }}>ÜYE DEĞİL</div>
                  <p style={{ fontSize:13, color:ak.textMuted, margin:"8px 0 18px", fontWeight:500 }}>Bu kişi kayıtlı üye değildir, form doldurabilirsiniz</p>
                  <Button variant="secondary" onClick={reset} style={{ margin:"0 auto" }}>Yeni Sorgu</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// YÖNETİM EKRANI
// ============================================================
function AdminScreen({ admin, onBack }) {
  const [tab, setTab] = useState("upload");
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [memberCount, setMemberCount] = useState("—");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newName, setNewName] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [deletedList, setDeletedList] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [deletedFilter, setDeletedFilter] = useState("");

  // Dashboard state'leri
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [mahalleData, setMahalleData] = useState(null);
  const [referansData, setReferansData] = useState(null);
  const [pingpongData, setPingpongData] = useState(null);

  // Görevli performans
  const loadDashboard = async () => {
    setDashLoading(true);
    try {
      // Görevli bazlı sorgu sayıları - tüm logları çek (pagination)
      let logs = [];
      let offset = 0;
      while (true) {
        const logsRes = await fetch(`${SUPABASE_URL}/rest/v1/query_logs?select=admin_id,tc_hash,is_member,queried_at&order=queried_at.desc&offset=${offset}&limit=1000`, { headers: supabase.headers });
        const batch = logsRes.ok ? await logsRes.json() : [];
        if (batch.length === 0) break;
        logs.push(...batch);
        offset += 1000;
        if (batch.length < 1000) break;
      }

      const adminsRes = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=id,display_name,username`, { headers: supabase.headers });
      const admins = adminsRes.ok ? await adminsRes.json() : [];

      const adminMap = {};
      admins.forEach(a => { adminMap[a.id] = a.display_name || a.username; });

      // Görevli bazlı gruplama
      const gorevliStats = {};
      logs.forEach(l => {
        const name = adminMap[l.admin_id] || "Bilinmeyen";
        if (!gorevliStats[name]) gorevliStats[name] = { toplam: 0, benzersiz: new Set(), uye: 0, degil: 0, sonSorgu: null };
        gorevliStats[name].toplam++;
        gorevliStats[name].benzersiz.add(l.tc_hash);
        if (l.is_member) gorevliStats[name].uye++; else gorevliStats[name].degil++;
        if (!gorevliStats[name].sonSorgu || l.queried_at > gorevliStats[name].sonSorgu) gorevliStats[name].sonSorgu = l.queried_at;
      });

      const gorevliList = Object.entries(gorevliStats)
        .map(([name, s]) => ({ name, toplam: s.toplam, benzersiz: s.benzersiz.size, uye: s.uye, degil: s.degil, sonSorgu: s.sonSorgu }))
        .sort((a, b) => b.benzersiz - a.benzersiz);

      // Günlük sorgu trendi (son 14 gün)
      const gunluk = {};
      logs.forEach(l => {
        const d = l.queried_at?.split("T")[0];
        if (d) gunluk[d] = (gunluk[d] || 0) + 1;
      });

      setDashData({ gorevliList, toplamSorgu: logs.length, toplamBenzersiz: new Set(logs.map(l => l.tc_hash)).size, gunluk });
    } catch(e) { console.error(e); }
    setDashLoading(false);
  };

  // Mahalle bazlı üye analizi
  const loadMahalle = async () => {
    setDashLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/members?select=mahalle`, { headers: supabase.headers });
      const rows = res.ok ? await res.json() : [];
      const mahalleCount = {};
      rows.forEach(r => {
        const m = (r.mahalle || "Belirtilmemiş").trim();
        mahalleCount[m] = (mahalleCount[m] || 0) + 1;
      });

      // Silinen üyeler mahalle bazlı
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/deleted_members?select=mahalle,tekrar_uye_tarihi`, { headers: supabase.headers });
      const delRows = delRes.ok ? await delRes.json() : [];
      const mahalleIstifa = {};
      delRows.forEach(r => {
        const m = (r.mahalle || "Belirtilmemiş").trim();
        if (!r.tekrar_uye_tarihi) mahalleIstifa[m] = (mahalleIstifa[m] || 0) + 1;
      });

      const mahalleList = Object.entries(mahalleCount)
        .map(([mahalle, uye]) => ({ mahalle, uye, istifa: mahalleIstifa[mahalle] || 0 }))
        .sort((a, b) => b.uye - a.uye);

      setMahalleData({ mahalleList, toplamUye: rows.length, toplamMahalle: mahalleList.length });
    } catch(e) { console.error(e); }
    setDashLoading(false);
  };

  // Referans bazlı üye kazanım
  const loadReferans = async () => {
    setDashLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/members?select=referans`, { headers: supabase.headers });
      const rows = res.ok ? await res.json() : [];
      const refCount = {};
      rows.forEach(r => {
        const ref = (r.referans || "").trim();
        if (ref) refCount[ref] = (refCount[ref] || 0) + 1;
      });

      // İstifa edenler referans bazlı
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/deleted_members?select=referans,tekrar_uye_tarihi`, { headers: supabase.headers });
      const delRows = delRes.ok ? await delRes.json() : [];
      const refIstifa = {};
      delRows.forEach(r => {
        const ref = (r.referans || "").trim();
        if (ref && !r.tekrar_uye_tarihi) refIstifa[ref] = (refIstifa[ref] || 0) + 1;
      });

      const refList = Object.entries(refCount)
        .map(([referans, kazanim]) => ({ referans, kazanim, istifa: refIstifa[referans] || 0, net: kazanim - (refIstifa[referans] || 0) }))
        .sort((a, b) => b.kazanim - a.kazanim);

      setReferansData({ refList, toplamReferans: refList.length });
    } catch(e) { console.error(e); }
    setDashLoading(false);
  };

  // Ping-pong üyeler
  const loadPingpong = async () => {
    setDashLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/deleted_members?select=tc_no,ad_soyad,mahalle,referans,silinme_tarihi,tekrar_uye_tarihi`, { headers: supabase.headers });
      const rows = res.ok ? await res.json() : [];

      // TC bazlı gruplama — birden fazla kaydı olanlar
      const tcGroup = {};
      rows.forEach(r => {
        const tc = r.tc_no || r.ad_soyad;
        if (!tcGroup[tc]) tcGroup[tc] = { ad_soyad: r.ad_soyad, mahalle: r.mahalle, referans: r.referans, kayitlar: [] };
        tcGroup[tc].kayitlar.push({ silinme: r.silinme_tarihi, tekrar: r.tekrar_uye_tarihi });
      });

      // Tekrar üye olanlar (en az 1 kez istifa edip geri dönenler)
      const pingpongList = Object.values(tcGroup)
        .filter(g => g.kayitlar.some(k => k.tekrar))
        .map(g => ({
          ad_soyad: g.ad_soyad, mahalle: g.mahalle, referans: g.referans,
          istifaSayisi: g.kayitlar.length,
          sonIstifa: g.kayitlar.sort((a,b) => (b.silinme||"").localeCompare(a.silinme||""))[0]?.silinme,
          sonTekrar: g.kayitlar.filter(k => k.tekrar).sort((a,b) => (b.tekrar||"").localeCompare(a.tekrar||""))[0]?.tekrar,
        }))
        .sort((a, b) => b.istifaSayisi - a.istifaSayisi);

      setPingpongData({ pingpongList, toplamIstifa: rows.filter(r => !r.tekrar_uye_tarihi).length, toplamTekrar: rows.filter(r => r.tekrar_uye_tarihi).length });
    } catch(e) { console.error(e); }
    setDashLoading(false);
  };

  const loadDeleted = async () => {
    setDeletedLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/deleted_members?select=tc_no,ad_soyad,mahalle,referans,silinme_tarihi,tekrar_uye_tarihi&order=silinme_tarihi.desc&limit=500`, {
        headers: supabase.headers,
      });
      if (res.ok) setDeletedList(await res.json());
    } catch(e) { console.error(e); }
    setDeletedLoading(false);
  };

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/members?select=id`, {
      method: "HEAD", headers: { ...supabase.headers, Prefer: "count=exact" },
    }).then(r => { setMemberCount(r.headers.get("content-range")?.split("/")[1] || "?"); }).catch(() => setMemberCount("?"));
  }, [uploadStatus]);

  const [confirmData, setConfirmData] = useState(null); // onay ekranı verisi

  const handleAnalyze = async () => {
    if (!csvFile) return;
    setUploading(true); setUploadStatus(null); setConfirmData(null);
    try {
      const rows = await parseFile(csvFile);

      // DOSYA YAPI KONTROLÜ
      if (rows.length === 0) {
        setUploadStatus({ error: "Dosya boş veya okunamadı." });
        setUploading(false);
        return;
      }

      // İlk satırın sütunlarını kontrol et
      const cols = Object.keys(rows[0]).map(c => c.toLowerCase());
      const requiredFields = [
        { names: ["tc kimlik no", "tc", "tc_kimlik", "tckimlik"], label: "TC Kimlik No" },
        { names: ["adı", "ad", "ad_soyad", "adsoyad"], label: "Adı / Ad Soyad" },
      ];
      const missing = [];
      for (const field of requiredFields) {
        if (!field.names.some(n => cols.includes(n))) {
          missing.push(field.label);
        }
      }
      if (missing.length > 0) {
        setUploadStatus({ error: `Bu dosya AKBİS formatına uymuyor. Eksik sütunlar: ${missing.join(", ")}. Lütfen AKBİS'ten indirilen orijinal Excel dosyasını yükleyin.` });
        setUploading(false);
        return;
      }

      // TC doğrulama — en az %90'ı geçerli TC olmalı
      const mapped = rows.map(mapRow).filter(r => r.tc_kimlik);
      const validTCCount = mapped.filter(r => validateTC(r.tc_kimlik)).length;
      const tcRatio = mapped.length > 0 ? validTCCount / mapped.length : 0;
      if (tcRatio < 0.9) {
        setUploadStatus({ error: `TC Kimlik doğrulama başarısız. ${mapped.length} satırdan sadece ${validTCCount} tanesi geçerli TC içeriyor (%${(tcRatio*100).toFixed(0)}). Bu dosya AKBİS listesi olmayabilir.` });
        setUploading(false);
        return;
      }

      // Kayıt sayısı kontrolü — çok az kayıt uyarısı
      if (mapped.length < 1000) {
        setUploadStatus({ error: `Dosyada sadece ${mapped.length} kayıt var. AKBİS üye listesi genellikle 60.000+ kayıt içerir. Yanlış dosya yüklemiş olabilirsiniz.` });
        setUploading(false);
        return;
      }

      // 1. ADIM: CSV'deki tüm TC'leri hash'le
      setUploadStatus({ phase: "hash", total: mapped.length, processed: 0, done: false });
      const newHashes = new Set();
      const preparedRows = [];
      for (let i = 0; i < mapped.length; i += 200) {
        const batch = mapped.slice(i, i + 200);
        const hashed = await Promise.all(batch.map(async r => {
          const h = await hashTC(r.tc_kimlik);
          newHashes.add(h);
          return { tc_hash: h, tc_no: r.tc_kimlik, ad_soyad: r.ad_soyad, mahalle: r.mahalle, telefon: r.telefon, adres: r.adres, referans: r.referans };
        }));
        preparedRows.push(...hashed);
        setUploadStatus({ phase: "hash", total: mapped.length, processed: Math.min(i + 200, mapped.length), done: false });
      }

      // 2. ADIM: Mevcut üyeleri çek
      setUploadStatus({ phase: "fetch", total: mapped.length, processed: 0, done: false });
      let existingHashes = new Set();
      let offset = 0;
      while (true) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/members?select=tc_hash&offset=${offset}&limit=1000`, {
          headers: supabase.headers,
        });
        const fetchedRows = await res.json();
        if (!fetchedRows.length) break;
        fetchedRows.forEach(r => existingHashes.add(r.tc_hash));
        offset += 1000;
      }

      const toAdd = preparedRows.filter(r => !existingHashes.has(r.tc_hash));
      const toRemove = [...existingHashes].filter(h => !newHashes.has(h));
      const unchanged = existingHashes.size - toRemove.length;

      // ONAY EKRANI göster
      setConfirmData({ mapped, preparedRows, newHashes, existingHashes, toAdd, toRemove, unchanged });
      setUploadStatus(null);

    } catch(e) { setUploadStatus({ error: e.message }); }
    setUploading(false);
  };

  const handleConfirmedSync = async () => {
    if (!confirmData) return;
    const { mapped, preparedRows, newHashes, existingHashes, toAdd, toRemove, unchanged } = confirmData;
    setConfirmData(null);
    setUploading(true);

    try {
      // 3. ADIM: Yeni üyeleri ekle + tekrar üye olanları işaretle
      let added = 0, addErrors = 0, tekrarUye = 0;
      for (let i = 0; i < toAdd.length; i += 50) {
        const batch = toAdd.slice(i, i + 50);
        try {
          // Önce ekle
          const res = await fetch(`${SUPABASE_URL}/rest/v1/members`, {
            method: "POST",
            headers: { ...supabase.headers, Prefer: "resolution=ignore-duplicates,return=representation" },
            body: JSON.stringify(batch),
          });
          if (res.ok) { const ins = await res.json(); added += ins.length; }
          else addErrors += batch.length;

          // Eklenen TC hash'leri deleted_members'da var mı kontrol et
          const batchHashes = batch.map(r => `"${r.tc_hash}"`).join(",");
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/deleted_members?tc_hash=in.(${batchHashes})`, {
              method: "PATCH",
              headers: { ...supabase.headers, Prefer: "return=minimal" },
              body: JSON.stringify({ tekrar_uye_tarihi: new Date().toISOString() }),
            });
            // Kaç tanesi güncellendi sayamıyoruz ama sorun değil
          } catch(_) {}
        } catch { addErrors += batch.length; }
        setUploadStatus({
          phase: "sync", total: mapped.length,
          added, removed: 0, unchanged,
          addErrors, removeErrors: 0, done: false,
          toAddTotal: toAdd.length, toRemoveTotal: toRemove.length,
          processed: Math.min(i + 50, toAdd.length),
        });
      }

      // 4. ADIM: Eski üyeleri sil — önce deleted_members'a taşı
      let removed = 0, removeErrors = 0;
      for (let i = 0; i < toRemove.length; i += 50) {
        const batch = toRemove.slice(i, i + 50);
        const hashList = batch.map(h => `"${h}"`).join(",");
        try {
          const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/members?tc_hash=in.(${hashList})&select=tc_hash,tc_no,ad_soyad,mahalle,telefon,adres,referans,created_at`, {
            headers: supabase.headers,
          });
          if (fetchRes.ok) {
            const deletedRows = await fetchRes.json();
            if (deletedRows.length > 0) {
              const archiveRows = deletedRows.map(r => ({
                tc_hash: r.tc_hash,
                tc_no: r.tc_no || "",
                ad_soyad: r.ad_soyad,
                mahalle: r.mahalle,
                telefon: r.telefon,
                adres: r.adres,
                referans: r.referans || "",
                uyelik_baslangic: r.created_at,
              }));
              await fetch(`${SUPABASE_URL}/rest/v1/deleted_members`, {
                method: "POST",
                headers: { ...supabase.headers, Prefer: "return=minimal" },
                body: JSON.stringify(archiveRows),
              });
            }
          }
          const res = await fetch(`${SUPABASE_URL}/rest/v1/members?tc_hash=in.(${hashList})`, {
            method: "DELETE",
            headers: supabase.headers,
          });
          if (res.ok) removed += batch.length;
          else removeErrors += batch.length;
        } catch { removeErrors += batch.length; }
        setUploadStatus({
          phase: "sync", total: mapped.length,
          added, removed, unchanged,
          addErrors, removeErrors, done: false,
          toAddTotal: toAdd.length, toRemoveTotal: toRemove.length,
          processed: toAdd.length + Math.min(i + 50, toRemove.length),
        });
      }

      // 5. ADIM: Tamamlandı
      setUploadStatus({
        phase: "done", total: mapped.length,
        added, removed, unchanged,
        addErrors, removeErrors, done: true,
        toAddTotal: toAdd.length, toRemoveTotal: toRemove.length,
      });
    } catch(e) { setUploadStatus({ error: e.message }); }
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!newUser.trim() || !newPass.trim()) { setAdminMsg("Kullanıcı adı ve şifre zorunlu"); return; }
    try {
      await supabase.insert("admins", {
        username: newUser.trim(), password_hash: await hashTC(newPass),
        display_name: newName.trim() || newUser.trim(), role: "admin",
      });
      setAdminMsg("Görevli başarıyla eklendi"); setNewUser(""); setNewPass(""); setNewName("");
    } catch(e) { setAdminMsg("Hata: " + e.message); }
  };

  return (
    <div style={{ minHeight:"100vh", background:ak.pageBg, display:"flex", flexDirection:"column" }}>
      <Header><Button variant="secondary" onClick={onBack} style={{ padding:"7px 14px", fontSize:12 }}>← Sorgu Ekranı</Button></Header>
      <div style={{ flex:1, display:"flex", justifyContent:"center", padding:24 }}>
        <div style={{ width:"100%", maxWidth:560 }}>
          <div style={{ background:ak.cream, border:`1.5px solid ${ak.yellowDark}22`, borderRadius:14, padding:"16px 24px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <AKPartiLogo size={24} />
              <span style={{ fontSize:14, color:ak.textMuted, fontWeight:600 }}>Toplam Kayıtlı Üye</span>
            </div>
            <span style={{ fontSize:28, fontWeight:800, color:ak.yellowDark }}>{memberCount}</span>
          </div>

          <div style={{ display:"flex", gap:2, marginBottom:20, background:ak.white, borderRadius:12, padding:4, border:`1.5px solid ${ak.border}`, flexWrap:"wrap" }}>
            {[
              { id:"upload", label:"📁 Dosya Yükle" },
              { id:"admins", label:"👤 Görevli Ekle" },
              { id:"deleted", label:"🗑 Silinen Üyeler" },
              { id:"performance", label:"📊 Performans" },
              { id:"mahalle", label:"🏘 Mahalleler" },
              { id:"referans", label:"🤝 Referanslar" },
              { id:"pingpong", label:"🔄 Ping-Pong" },
            ].map(t => (
              <button key={t.id} onClick={() => {
                setTab(t.id);
                if (t.id === "deleted") loadDeleted();
                if (t.id === "performance") { setDashData(null); loadDashboard(); }
                if (t.id === "mahalle") { setMahalleData(null); loadMahalle(); }
                if (t.id === "referans") { setReferansData(null); loadReferans(); }
                if (t.id === "pingpong") { setPingpongData(null); loadPingpong(); }
              }} style={{
                flex:"1 1 auto", minWidth:"30%", padding:"10px 6px", background: tab === t.id ? `linear-gradient(135deg, ${ak.yellowDark}, ${ak.yellow})` : "transparent",
                color: tab === t.id ? ak.black : ak.textMuted, border:"none", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
              }}>{t.label}</button>
            ))}
          </div>

          {tab === "upload" && (
            <Card style={{ padding:32 }}>
              <YellowBar />
              <h3 style={{ fontSize:18, fontWeight:800, color:ak.textDark, margin:"0 0 6px" }}>Üye Listesi Güncelle</h3>
              <p style={{ fontSize:13, color:ak.textMuted, margin:"0 0 20px", lineHeight:1.6, fontWeight:500 }}>
                AKBİS'ten indirilen <b>Excel (.xlsx)</b> dosyasını direkt yükleyin. CSV de desteklenir. Yeni üyeler eklenir, istifa edenler silinir.
              </p>
              <div
                style={{ border:`2px dashed ${csvFile ? ak.yellowDark : ak.border}`, borderRadius:14, padding:36, textAlign:"center", marginBottom:16, background: csvFile ? ak.cream : ak.offWhite, cursor:"pointer", transition:"all 0.2s" }}
                onClick={() => document.getElementById("csv-input").click()}
              >
                <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={e => { setCsvFile(e.target.files[0]); setUploadStatus(null); }} style={{ display:"none" }} id="csv-input" />
                {csvFile ? <><div style={{ fontSize:36, marginBottom:8 }}>📄</div><div style={{ fontSize:14, fontWeight:700, color:ak.yellowDark }}>{csvFile.name}</div></> :
                  <><div style={{ fontSize:36, marginBottom:8 }}>📁</div><div style={{ fontSize:14, color:ak.textMuted, fontWeight:500 }}>Excel veya CSV dosyası seçmek için tıklayın</div></>}
              </div>
              <Button loading={uploading} onClick={handleAnalyze} disabled={!csvFile || confirmData} style={{ width:"100%", fontSize:15 }}>Analiz Et</Button>

              {/* ONAY EKRANI */}
              {confirmData && (
                <div style={{ marginTop:18, background:ak.white, border:`2px solid ${ak.yellowDark}`, borderRadius:14, padding:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <span style={{ fontSize:24 }}>⚠️</span>
                    <span style={{ fontSize:16, fontWeight:800, color:ak.textDark }}>Senkronizasyon Onayı</span>
                  </div>

                  <div style={{ display:"flex", gap:12, marginBottom:16 }}>
                    <div style={{ flex:1, background:ak.greenSoft, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:ak.green }}>+{confirmData.toAdd.length}</div>
                      <div style={{ fontSize:11, color:ak.textMuted, fontWeight:600 }}>YENİ EKLENECEK</div>
                    </div>
                    <div style={{ flex:1, background:ak.redSoft, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:ak.red }}>−{confirmData.toRemove.length}</div>
                      <div style={{ fontSize:11, color:ak.textMuted, fontWeight:600 }}>SİLİNECEK</div>
                    </div>
                    <div style={{ flex:1, background:ak.offWhite, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:24, fontWeight:800, color:ak.textMuted }}>{confirmData.unchanged}</div>
                      <div style={{ fontSize:11, color:ak.textMuted, fontWeight:600 }}>DEĞİŞMEYECEK</div>
                    </div>
                  </div>

                  {confirmData.toRemove.length > 0 && (
                    <div style={{ background:ak.redSoft, borderRadius:8, padding:12, marginBottom:14, fontSize:12, color:ak.red, fontWeight:600 }}>
                      ⚠ {confirmData.toRemove.length} üye silinecek ve "Silinen Üyeler" tablosuna taşınacaktır. Bu işlem geri alınamaz.
                    </div>
                  )}

                  <div style={{ display:"flex", gap:10 }}>
                    <Button onClick={handleConfirmedSync} style={{ flex:1, fontSize:14 }}>Onayla ve Senkronize Et</Button>
                    <Button variant="secondary" onClick={() => setConfirmData(null)} style={{ flex:1, fontSize:14 }}>İptal</Button>
                  </div>
                </div>
              )}

              {uploadStatus && !uploadStatus.error && (
                <div style={{ marginTop:18, background:ak.offWhite, border:`1px solid ${ak.border}`, borderRadius:12, padding:18 }}>
                  {/* Faz göstergesi */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <div style={{ width:8, height:8, borderRadius:4, background: uploadStatus.done ? ak.green : ak.yellowDark, animation: uploadStatus.done ? "none" : "pulse 1s infinite" }} />
                    <span style={{ fontSize:13, color:ak.textDark, fontWeight:700 }}>
                      {uploadStatus.phase === "hash" && "TC Kimlikler hash'leniyor..."}
                      {uploadStatus.phase === "fetch" && "Mevcut üyeler kontrol ediliyor..."}
                      {uploadStatus.phase === "sync" && "Senkronizasyon yapılıyor..."}
                      {uploadStatus.phase === "done" && "Senkronizasyon tamamlandı!"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {uploadStatus.phase === "hash" && (
                    <div style={{ height:8, background:ak.border, borderRadius:4, overflow:"hidden", marginBottom:14 }}>
                      <div style={{ width:`${(uploadStatus.processed / uploadStatus.total) * 100}%`, height:"100%", background:`linear-gradient(90deg, ${ak.yellowDark}, ${ak.yellow})`, borderRadius:4, transition:"width 0.3s" }} />
                    </div>
                  )}

                  {/* Sonuç istatistikleri */}
                  {(uploadStatus.phase === "sync" || uploadStatus.phase === "done") && (
                    <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
                      <div style={{ display:"flex", gap:16, fontSize:13, fontWeight:600 }}>
                        <span style={{ color:ak.green }}>+ {uploadStatus.added} yeni eklendi</span>
                        <span style={{ color:ak.red }}>− {uploadStatus.removed} silindi</span>
                        <span style={{ color:ak.textMuted }}>= {uploadStatus.unchanged} değişmedi</span>
                      </div>
                      {(uploadStatus.addErrors > 0 || uploadStatus.removeErrors > 0) && (
                        <span style={{ color:ak.red, fontSize:12 }}>⚠ {uploadStatus.addErrors + uploadStatus.removeErrors} hata</span>
                      )}
                    </div>
                  )}

                  {uploadStatus.done && (
                    <div style={{ marginTop:14, padding:"12px 16px", background:ak.greenSoft, borderRadius:8, fontSize:13, color:ak.green, fontWeight:700, textAlign:"center" }}>
                      Üye listesi başarıyla güncellendi — CSV: {uploadStatus.total} kayıt
                    </div>
                  )}
                </div>
              )}
              {uploadStatus?.error && <div style={{ marginTop:16, background:ak.redSoft, color:ak.red, padding:"12px 14px", borderRadius:8, fontSize:13, fontWeight:600 }}>{uploadStatus.error}</div>}
            </Card>
          )}

          {tab === "admins" && (
            <Card style={{ padding:32 }}>
              <YellowBar />
              <h3 style={{ fontSize:18, fontWeight:800, color:ak.textDark, margin:"0 0 18px" }}>Yeni Görevli Ekle</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Input placeholder="Kullanıcı adı" value={newUser} onChange={e => setNewUser(e.target.value)} />
                <Input type="password" placeholder="Şifre" value={newPass} onChange={e => setNewPass(e.target.value)} />
                <Input placeholder="Görünen isim (opsiyonel)" value={newName} onChange={e => setNewName(e.target.value)} />
                <Button onClick={handleAdd} style={{ width:"100%", fontSize:15 }}>Görevli Ekle</Button>
                {adminMsg && <div style={{ padding:"10px 14px", borderRadius:8, fontSize:13, fontWeight:600, background: adminMsg.includes("Hata") ? ak.redSoft : ak.greenSoft, color: adminMsg.includes("Hata") ? ak.red : ak.green }}>{adminMsg}</div>}
              </div>
            </Card>
          )}

          {tab === "deleted" && (
            <Card style={{ padding:32 }}>
              <YellowBar />
              <h3 style={{ fontSize:18, fontWeight:800, color:ak.textDark, margin:"0 0 6px" }}>Silinen / İstifa Eden Üyeler</h3>
              <p style={{ fontSize:13, color:ak.textMuted, margin:"0 0 16px", fontWeight:500 }}>
                Üye listesinden çıkarılan kişiler burada tutulur. Referans bazlı takip yapabilirsiniz.
              </p>

              {/* Arama */}
              <Input icon="🔍" placeholder="Ad, mahalle veya referans ile ara..." value={deletedFilter}
                onChange={e => setDeletedFilter(e.target.value)} style={{ marginBottom:16, fontSize:13 }} />

              {deletedLoading ? (
                <div style={{ textAlign:"center", padding:24, color:ak.textMuted }}>Yükleniyor...</div>
              ) : deletedList.length === 0 ? (
                <div style={{ textAlign:"center", padding:24, color:ak.textMuted, fontSize:13 }}>Henüz silinen üye kaydı bulunmuyor</div>
              ) : (
                <>
                  <div style={{ fontSize:12, color:ak.textMuted, marginBottom:12, fontWeight:600 }}>
                    Toplam {deletedList.length} silinen üye
                    {deletedFilter && ` (${deletedList.filter(d => {
                      const f = deletedFilter.toLowerCase();
                      return (d.ad_soyad||"").toLowerCase().includes(f) || (d.mahalle||"").toLowerCase().includes(f) || (d.referans||"").toLowerCase().includes(f);
                    }).length} sonuç)`}
                  </div>

                  {/* Referans özet */}
                  {!deletedFilter && (() => {
                    const refCount = {};
                    deletedList.forEach(d => { const r = (d.referans||"").trim(); if(r) refCount[r] = (refCount[r]||0) + 1; });
                    const topRefs = Object.entries(refCount).sort((a,b) => b[1]-a[1]).slice(0, 5);
                    if (topRefs.length === 0) return null;
                    return (
                      <div style={{ background:ak.redSoft, borderRadius:10, padding:14, marginBottom:16 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:ak.red, marginBottom:8 }}>En Çok İstifa Veren Referanslar</div>
                        {topRefs.map(([ref, count]) => (
                          <div key={ref} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:12 }}>
                            <span style={{ color:ak.textDark, cursor:"pointer", textDecoration:"underline" }} onClick={() => setDeletedFilter(ref)}>{ref}</span>
                            <span style={{ color:ak.red, fontWeight:700 }}>{count} üye</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Tablo */}
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{ background:ak.black }}>
                          {["#","TC Kimlik","Ad Soyad","Mahalle","Referans","Silinme","Durum"].map(h => (
                            <th key={h} style={{ padding:"10px 6px", color:ak.white, fontWeight:700, textAlign:"left", whiteSpace:"nowrap", fontSize:11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {deletedList
                          .filter(d => {
                            if (!deletedFilter) return true;
                            const f = deletedFilter.toLowerCase();
                            return (d.ad_soyad||"").toLowerCase().includes(f) || (d.mahalle||"").toLowerCase().includes(f) || (d.referans||"").toLowerCase().includes(f);
                          })
                          .map((d, i) => (
                          <tr key={i} style={{ background: d.tekrar_uye_tarihi ? "rgba(46,125,50,0.06)" : i%2===0 ? ak.offWhite : ak.white, borderBottom:`1px solid ${ak.border}` }}>
                            <td style={{ padding:"8px", color:ak.textMuted }}>{i+1}</td>
                            <td style={{ padding:"8px", color:ak.textDark, fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>{d.tc_no || "-"}</td>
                            <td style={{ padding:"8px", fontWeight:600, color:ak.textDark }}>{d.ad_soyad}</td>
                            <td style={{ padding:"8px", color:ak.textMuted }}>{d.mahalle}</td>
                            <td style={{ padding:"8px", color:ak.red, fontWeight:600 }}>{d.referans || "-"}</td>
                            <td style={{ padding:"8px", color:ak.textLight, whiteSpace:"nowrap" }}>{d.silinme_tarihi ? new Date(d.silinme_tarihi).toLocaleDateString("tr-TR") : "-"}</td>
                            <td style={{ padding:"8px", whiteSpace:"nowrap" }}>
                              {d.tekrar_uye_tarihi ? (
                                <span style={{ background:ak.greenSoft, color:ak.green, padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:700 }}>
                                  TEKRAR ÜYE {new Date(d.tekrar_uye_tarihi).toLocaleDateString("tr-TR")}
                                </span>
                              ) : (
                                <span style={{ background:ak.redSoft, color:ak.red, padding:"3px 8px", borderRadius:6, fontSize:10, fontWeight:700 }}>
                                  İSTİFA
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* PERFORMANS TAB */}
          {tab === "performance" && (
            <Card style={{ padding:32 }}>
              <YellowBar />
              <h3 style={{ fontSize:18, fontWeight:800, color:ak.textDark, margin:"0 0 6px" }}>Görevli Performans Raporu</h3>
              <p style={{ fontSize:13, color:ak.textMuted, margin:"0 0 20px", fontWeight:500 }}>Kim ne kadar sorgulama yaptı, hangi mahalle aktif</p>
              {dashLoading ? <div style={{ textAlign:"center", padding:24 }}><Spinner /></div> :
               !dashData ? <div style={{ textAlign:"center", padding:24, color:ak.textMuted }}>Veri yükleniyor...</div> : (
                <>
                  <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                    <div style={{ flex:1, minWidth:120, background:ak.cream, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.yellowDark }}>{dashData.toplamBenzersiz}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>BENZERSİZ SORGU</div>
                    </div>
                    <div style={{ flex:1, minWidth:120, background:ak.cream, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.yellowDark }}>{dashData.toplamSorgu}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>TOPLAM SORGU</div>
                    </div>
                    <div style={{ flex:1, minWidth:120, background:ak.cream, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.yellowDark }}>{dashData.gorevliList.length}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>AKTİF GÖREVLİ</div>
                    </div>
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead><tr style={{ background:ak.black }}>
                        {["#","Görevli","Benzersiz","Toplam","Üye","Üye Değil","Son Sorgu"].map(h => (
                          <th key={h} style={{ padding:"10px 6px", color:ak.white, fontWeight:700, textAlign:"center", fontSize:11 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{dashData.gorevliList.map((g, i) => (
                        <tr key={i} style={{ background: i%2===0 ? ak.offWhite : ak.white, borderBottom:`1px solid ${ak.border}` }}>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.textMuted }}>{i+1}</td>
                          <td style={{ padding:"8px 6px", fontWeight:700, color:ak.textDark }}>{g.name}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:700, color:ak.yellowDark }}>{g.benzersiz}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.textMuted }}>{g.toplam}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.green, fontWeight:600 }}>{g.uye}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.red, fontWeight:600 }}>{g.degil}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.textLight, fontSize:11 }}>{g.sonSorgu ? new Date(g.sonSorgu).toLocaleDateString("tr-TR") : "-"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* MAHALLE TAB */}
          {tab === "mahalle" && (
            <Card style={{ padding:32 }}>
              <YellowBar />
              <h3 style={{ fontSize:18, fontWeight:800, color:ak.textDark, margin:"0 0 6px" }}>Mahalle Bazlı Üye Analizi</h3>
              <p style={{ fontSize:13, color:ak.textMuted, margin:"0 0 20px", fontWeight:500 }}>Her mahalledeki üye sayısı ve istifa durumu</p>
              {dashLoading ? <div style={{ textAlign:"center", padding:24 }}><Spinner /></div> :
               !mahalleData ? <div style={{ textAlign:"center", padding:24, color:ak.textMuted }}>Veri yükleniyor...</div> : (
                <>
                  <div style={{ display:"flex", gap:12, marginBottom:20 }}>
                    <div style={{ flex:1, background:ak.cream, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.yellowDark }}>{mahalleData.toplamUye.toLocaleString("tr-TR")}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>TOPLAM ÜYE</div>
                    </div>
                    <div style={{ flex:1, background:ak.cream, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.yellowDark }}>{mahalleData.toplamMahalle}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>MAHALLE</div>
                    </div>
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead><tr style={{ background:ak.black }}>
                        {["#","Mahalle","Üye Sayısı","İstifa","Oran"].map(h => (
                          <th key={h} style={{ padding:"10px 6px", color:ak.white, fontWeight:700, textAlign:"center", fontSize:11 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{mahalleData.mahalleList.map((m, i) => (
                        <tr key={i} style={{ background: i%2===0 ? ak.offWhite : ak.white, borderBottom:`1px solid ${ak.border}` }}>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.textMuted }}>{i+1}</td>
                          <td style={{ padding:"8px 6px", fontWeight:700, color:ak.textDark }}>{m.mahalle}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:700, color:ak.yellowDark }}>{m.uye.toLocaleString("tr-TR")}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.red, fontWeight:600 }}>{m.istifa || "-"}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center" }}>
                            <div style={{ width:"100%", height:8, background:ak.border, borderRadius:4, overflow:"hidden" }}>
                              <div style={{ width:`${(m.uye / mahalleData.toplamUye) * 100}%`, height:"100%", background:`linear-gradient(90deg, ${ak.yellowDark}, ${ak.yellow})`, borderRadius:4, minWidth:2 }} />
                            </div>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* REFERANS TAB */}
          {tab === "referans" && (
            <Card style={{ padding:32 }}>
              <YellowBar />
              <h3 style={{ fontSize:18, fontWeight:800, color:ak.textDark, margin:"0 0 6px" }}>Referans Bazlı Üye Kazanım Raporu</h3>
              <p style={{ fontSize:13, color:ak.textMuted, margin:"0 0 20px", fontWeight:500 }}>Kim kaç üye kazandırmış, kaçı istifa etmiş</p>
              {dashLoading ? <div style={{ textAlign:"center", padding:24 }}><Spinner /></div> :
               !referansData ? <div style={{ textAlign:"center", padding:24, color:ak.textMuted }}>Veri yükleniyor...</div> : (
                <>
                  <div style={{ marginBottom:16, fontSize:12, color:ak.textMuted, fontWeight:600 }}>Toplam {referansData.toplamReferans} farklı referans</div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead><tr style={{ background:ak.black }}>
                        {["#","Referans","Kazanım","İstifa","Net"].map(h => (
                          <th key={h} style={{ padding:"10px 6px", color:ak.white, fontWeight:700, textAlign:"center", fontSize:11 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{referansData.refList.slice(0, 50).map((r, i) => (
                        <tr key={i} style={{ background: i%2===0 ? ak.offWhite : ak.white, borderBottom:`1px solid ${ak.border}` }}>
                          <td style={{ padding:"8px 6px", textAlign:"center", color:ak.textMuted }}>{i+1}</td>
                          <td style={{ padding:"8px 6px", fontWeight:700, color:ak.textDark }}>{r.referans}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:700, color:ak.green }}>{r.kazanim.toLocaleString("tr-TR")}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:600, color:ak.red }}>{r.istifa || "-"}</td>
                          <td style={{ padding:"8px 6px", textAlign:"center", fontWeight:800, color: r.net >= 0 ? ak.green : ak.red }}>{r.net >= 0 ? "+" : ""}{r.net.toLocaleString("tr-TR")}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  {referansData.refList.length > 50 && <div style={{ textAlign:"center", marginTop:12, fontSize:11, color:ak.textLight }}>İlk 50 referans gösteriliyor (toplam {referansData.refList.length})</div>}
                </>
              )}
            </Card>
          )}

          {/* PİNG-PONG TAB */}
          {tab === "pingpong" && (
            <Card style={{ padding:32 }}>
              <YellowBar />
              <h3 style={{ fontSize:18, fontWeight:800, color:ak.textDark, margin:"0 0 6px" }}>Ping-Pong Üyeler</h3>
              <p style={{ fontSize:13, color:ak.textMuted, margin:"0 0 20px", fontWeight:500 }}>Sürekli istifa edip tekrar üye olan kişiler</p>
              {dashLoading ? <div style={{ textAlign:"center", padding:24 }}><Spinner /></div> :
               !pingpongData ? <div style={{ textAlign:"center", padding:24, color:ak.textMuted }}>Veri yükleniyor...</div> : (
                <>
                  <div style={{ display:"flex", gap:12, marginBottom:20 }}>
                    <div style={{ flex:1, background:ak.redSoft, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.red }}>{pingpongData.toplamIstifa}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>AKTİF İSTİFA</div>
                    </div>
                    <div style={{ flex:1, background:ak.greenSoft, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.green }}>{pingpongData.toplamTekrar}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>TEKRAR ÜYE</div>
                    </div>
                    <div style={{ flex:1, background:ak.cream, borderRadius:10, padding:14, textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:800, color:ak.yellowDark }}>{pingpongData.pingpongList.length}</div>
                      <div style={{ fontSize:10, color:ak.textMuted, fontWeight:700 }}>PİNG-PONG</div>
                    </div>
                  </div>
                  {pingpongData.pingpongList.length === 0 ? (
                    <div style={{ textAlign:"center", padding:24, color:ak.textMuted, fontSize:13 }}>Henüz ping-pong üye tespit edilmedi. Veriler biriktikçe burada görünecek.</div>
                  ) : (
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead><tr style={{ background:ak.black }}>
                          {["#","Ad Soyad","Mahalle","Referans","İstifa Sayısı","Son İstifa","Son Dönüş"].map(h => (
                            <th key={h} style={{ padding:"10px 6px", color:ak.white, fontWeight:700, textAlign:"center", fontSize:10 }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>{pingpongData.pingpongList.map((p, i) => (
                          <tr key={i} style={{ background: i%2===0 ? ak.offWhite : ak.white, borderBottom:`1px solid ${ak.border}` }}>
                            <td style={{ padding:"8px 6px", textAlign:"center", color:ak.textMuted }}>{i+1}</td>
                            <td style={{ padding:"8px 6px", fontWeight:700, color:ak.textDark }}>{p.ad_soyad}</td>
                            <td style={{ padding:"8px 6px", color:ak.textMuted }}>{p.mahalle}</td>
                            <td style={{ padding:"8px 6px", color:ak.red, fontWeight:600 }}>{p.referans || "-"}</td>
                            <td style={{ padding:"8px 6px", textAlign:"center" }}>
                              <span style={{ background:ak.redSoft, color:ak.red, padding:"3px 10px", borderRadius:6, fontWeight:800, fontSize:13 }}>{p.istifaSayisi}</span>
                            </td>
                            <td style={{ padding:"8px 6px", textAlign:"center", color:ak.textLight, fontSize:11 }}>{p.sonIstifa ? new Date(p.sonIstifa).toLocaleDateString("tr-TR") : "-"}</td>
                            <td style={{ padding:"8px 6px", textAlign:"center", color:ak.green, fontSize:11, fontWeight:600 }}>{p.sonTekrar ? new Date(p.sonTekrar).toLocaleDateString("tr-TR") : "-"}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ANA UYGULAMA
// ============================================================
export default function Home() {
  const [screen, setScreen] = useState("login");
  const [admin, setAdmin] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Service Worker kaydet
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // PWA Install prompt'unu yakala
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstall(false);
    setInstallPrompt(null);
  };

  return (
    <>
      {/* PWA Yükle Banner */}
      {showInstall && (
        <div style={{
          position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
          background:ak.black, color:ak.white, padding:"12px 20px", borderRadius:12,
          display:"flex", alignItems:"center", gap:12, zIndex:9999,
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)", maxWidth:"90%",
        }}>
          <span style={{ fontSize:24 }}>📱</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>Uygulamayı Yükle</div>
            <div style={{ fontSize:11, color:ak.textLight }}>Ana ekrana ekleyerek uygulama gibi kullan</div>
          </div>
          <button onClick={handleInstall} style={{
            background:ak.yellowDark, color:ak.black, border:"none", borderRadius:8,
            padding:"8px 16px", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap",
          }}>Yükle</button>
          <button onClick={() => setShowInstall(false)} style={{
            background:"transparent", color:ak.textLight, border:"none", fontSize:18, cursor:"pointer", padding:"4px",
          }}>✕</button>
        </div>
      )}

      {screen === "login" && <LoginScreen onLogin={a => { setAdmin(a); setScreen("query"); }} />}
      {screen === "query" && <QueryScreen admin={admin} onLogout={() => { setAdmin(null); setScreen("login"); }} onGoAdmin={() => setScreen("admin")} />}
      {screen === "admin" && <AdminScreen admin={admin} onBack={() => setScreen("query")} />}
    </>
  );
}
