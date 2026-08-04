import React, { useState, useMemo } from "react";
import {
  Megaphone, Wrench, Users, LogIn, LogOut, UserCheck, Bell, Star,
  Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Calendar,
  Clock, Search, AlertCircle, ArrowRight, BookOpen,
} from "lucide-react";

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

export const HL_TODAY = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

// ── Types ─────────────────────────────────────────────────────────────────────

export type HLCategory =
  | "announcement" | "maintenance" | "meeting"
  | "move-in" | "move-out" | "visitor-reminder"
  | "general-reminder" | "other";

export type HLPriority = "high" | "medium" | "low";

export type Highlight = {
  id: string;
  title: string;
  description?: string;
  date: string;   // "YYYY-MM-DD"
  time: string;   // "HH:MM" 24h
  category: HLCategory;
  priority: HLPriority;
};

// ── Seed data ─────────────────────────────────────────────────────────────────

const D = HL_TODAY; // base "today" for offsets
const off = (n: number) => {
  const d = new Date(D + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

export const INITIAL_HIGHLIGHTS: Highlight[] = [
  { id:"hl1", title:"Room Inspection",           description:"Check all rooms for cleanliness and maintenance issues.", date: D,       time:"09:00", category:"maintenance",      priority:"high"   },
  { id:"hl2", title:"Rent Collection Reminder",  description:"Remind all occupants about this month's rent due.",      date: D,       time:"15:00", category:"general-reminder",  priority:"medium" },
  { id:"hl3", title:"Water Bill Collection",     description:"Collect water bill payments from tenants.",               date: off(-2), time:"10:00", category:"announcement",      priority:"medium" },
  { id:"hl4", title:"Parent Meeting",            description:"Meet with parents of newly registered students.",         date: off(2),  time:"10:00", category:"meeting",           priority:"medium" },
  { id:"hl5", title:"New Student Move-In",       description:"Sofia Castro moves into Room D.",                        date: off(4),  time:"14:00", category:"move-in",           priority:"low"    },
  { id:"hl6", title:"General Cleaning Day",      description:"Full boarding house scheduled cleaning.",                date: off(9),  time:"08:00", category:"maintenance",       priority:"medium" },
  { id:"hl7", title:"Monthly BH Inspection",     description:"Official monthly boarding house inspection.",            date: off(12), time:"09:00", category:"announcement",      priority:"high"   },
  { id:"hl8", title:"Fire Safety Inspection",    description:"Annual fire safety compliance check.",                   date: off(15), time:"09:00", category:"maintenance",       priority:"high"   },
  { id:"hl9", title:"Student Move-Out",          description:"Kevin Cruz checking out of Room C.",                     date: off(17), time:"11:00", category:"move-out",          priority:"low"    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const catMeta = (c: HLCategory) => {
  const map: Record<HLCategory, { Icon: React.ElementType; color: string; bg: string; label: string }> = {
    "announcement":     { Icon: Megaphone, color:"#D97706", bg:"#FEF3C7", label:"Announcement"     },
    "maintenance":      { Icon: Wrench,    color:"#7C3AED", bg:"#EDE9FE", label:"Maintenance"      },
    "meeting":          { Icon: Users,     color:"#3B82F6", bg:"#EFF6FF", label:"Meeting"          },
    "move-in":          { Icon: LogIn,     color:"#16A34A", bg:"#DCFCE7", label:"Move-In"          },
    "move-out":         { Icon: LogOut,    color:"#EF4444", bg:"#FEE2E2", label:"Move-Out"         },
    "visitor-reminder": { Icon: UserCheck, color:"#EC4899", bg:"#FCE7F3", label:"Visitor Reminder" },
    "general-reminder": { Icon: Bell,      color:"#9772F6", bg:"#F5F0FF", label:"General Reminder" },
    "other":            { Icon: Star,      color:"#6B7280", bg:"#F3F4F6", label:"Other"            },
  };
  return map[c];
};

export const prioMeta = (p: HLPriority) => ({
  high:   { color:"#EF4444", bg:"#FEE2E2", dot:"#EF4444", label:"High Priority"   },
  medium: { color:"#F59E0B", bg:"#FEF3C7", dot:"#F59E0B", label:"Medium Priority" },
  low:    { color:"#22C55E", bg:"#DCFCE7", dot:"#22C55E", label:"Low Priority"    },
}[p]);

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });

const fmtRelDate = (d: string, today: string) => {
  if (d === today) return "Today";
  const t = new Date(today + "T00:00:00"); t.setDate(t.getDate() + 1);
  if (d === t.toISOString().split("T")[0]) return "Tomorrow";
  return fmtDate(d);
};

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2,"0")} ${ap}`;
};

const fmtDayName = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday:"long" });

const isInWeek = (date: string, today: string) => {
  const d = new Date(today + "T00:00:00");
  const s = new Date(d); s.setDate(d.getDate() - d.getDay());
  const e = new Date(s); e.setDate(s.getDate() + 6);
  return date >= s.toISOString().split("T")[0] && date <= e.toISOString().split("T")[0];
};

const isInMonth = (date: string, today: string) => date.slice(0,7) === today.slice(0,7);

const CATS: HLCategory[] = ["announcement","maintenance","meeting","move-in","move-out","visitor-reminder","general-reminder","other"];
const PRIOS: HLPriority[] = ["high","medium","low"];

// ── Mini Calendar ─────────────────────────────────────────────────────────────

function MiniCalendar({ today, highlights, selectedDate, onSelect }: {
  today: string; highlights: Highlight[]; selectedDate: string|null; onSelect: (d: string|null)=>void;
}) {
  const [vy, setVy] = useState(() => parseInt(today.slice(0,4)));
  const [vm, setVm] = useState(() => parseInt(today.slice(5,7)) - 1);

  const prevMo = () => { if(vm===0){setVm(11);setVy(y=>y-1);}else setVm(m=>m-1); };
  const nextMo = () => { if(vm===11){setVm(0);setVy(y=>y+1);}else setVm(m=>m+1); };

  const MN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DN = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  const dotMap = useMemo(()=>{
    const map: Record<string,HLPriority> = {};
    highlights.forEach(h => {
      const e = map[h.date];
      if (!e||(h.priority==="high")||(h.priority==="medium"&&e==="low")) map[h.date]=h.priority;
    });
    return map;
  }, [highlights]);

  const first = new Date(vy, vm, 1).getDay();
  const days  = new Date(vy, vm+1, 0).getDate();
  const cells: (number|null)[] = [];
  for(let i=0;i<first;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);

  return (
    <div style={{ background:"white", borderRadius:18, padding:"14px 14px 10px", boxShadow:"0 2px 10px rgba(0,0,0,.05)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <button onClick={prevMo} style={{ width:28, height:28, borderRadius:8, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <ChevronLeft size={13} color="#6B7280"/>
        </button>
        <span style={{ fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{MN[vm]} {vy}</span>
        <button onClick={nextMo} style={{ width:28, height:28, borderRadius:8, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <ChevronRight size={13} color="#6B7280"/>
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6 }}>
        {DN.map(d=><div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700, color:"#9CA3AF", fontFamily:QS }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day,i) => {
          if(!day) return <div key={`e${i}`}/>;
          const ds = `${vy}-${String(vm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isTd = ds===today, isSel = ds===selectedDate;
          const dot = dotMap[ds];
          return (
            <button key={ds} onClick={()=>onSelect(ds===selectedDate ? null : ds)}
              style={{ width:"100%", aspectRatio:"1", borderRadius:7, border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:1,
                background: isSel ? "#9772F6" : isTd ? "#F5F0FF" : "transparent",
                color: isSel ? "white" : isTd ? "#9772F6" : "#374151",
                fontFamily:QS, fontSize:11, fontWeight:(isTd||isSel) ? 800 : 500,
              }}>
              {day}
              {dot && <div style={{ width:4, height:4, borderRadius:"50%", background: isSel ? "rgba(255,255,255,.75)" : prioMeta(dot).dot }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────

function HighlightFormModal({ editing, defaultDate, onSave, onClose }: {
  editing: Highlight|null; defaultDate: string;
  onSave: (h: Omit<Highlight,"id"> & { id?: string }) => void;
  onClose: ()=>void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [desc,  setDesc]  = useState(editing?.description ?? "");
  const [date,  setDate]  = useState(editing?.date ?? defaultDate);
  const [time,  setTime]  = useState(editing?.time ?? "09:00");
  const [cat,   setCat]   = useState<HLCategory>(editing?.category ?? "general-reminder");
  const [prio,  setPrio]  = useState<HLPriority>(editing?.priority ?? "medium");
  const [err,   setErr]   = useState("");

  const save = () => {
    if(!title.trim()){ setErr("Please enter a highlight title."); return; }
    onSave({ id:editing?.id, title:title.trim(), description:desc.trim()||undefined, date, time, category:cat, priority:prio });
  };

  const LBL = ({ text }: { text: string }) => (
    <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:QS, letterSpacing:0.3, textTransform:"uppercase" as const, display:"block", marginBottom:6 }}>{text}</label>
  );
  const field: React.CSSProperties = { width:"100%", padding:"11px 14px", borderRadius:14, border:"1.5px solid #E5E7EB", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const };

  return (
    <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:85, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", maxHeight:"93%", display:"flex", flexDirection:"column" as const }}>
        {/* Header */}
        <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:40, height:40, borderRadius:13, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <BookOpen size={18} color="white"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>{editing ? "Edit Highlight" : "Add Highlight"}</p>
            <p style={{ fontSize:11, color:"#9CA3AF", margin:0, fontFamily:IN }}>Fill in the details below</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="#6B7280"/>
          </button>
        </div>

        <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 20px 28px", display:"flex", flexDirection:"column" as const, gap:14 }}>
          {err && <div style={{ padding:"9px 13px", background:"#FEE2E2", borderRadius:12, color:"#EF4444", fontSize:12, fontFamily:IN }}>{err}</div>}

          {/* Title */}
          <div><LBL text="Highlight Title *"/>
            <input value={title} onChange={e=>{setTitle(e.target.value);setErr("");}} placeholder="e.g. Monthly Room Inspection" style={field}/>
          </div>

          {/* Description */}
          <div><LBL text="Description (optional)"/>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Add a short note or details…" style={{ ...field, resize:"none" as const }}/>
          </div>

          {/* Date + Time */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><LBL text="Date"/>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ ...field, fontSize:12 }}/>
            </div>
            <div><LBL text="Time"/>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ ...field, fontSize:12 }}/>
            </div>
          </div>

          {/* Category */}
          <div><LBL text="Category"/>
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6 }}>
              {CATS.map(c => {
                const m = catMeta(c); const sel = cat===c;
                return (
                  <button key={c} onClick={()=>setCat(c)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:20, border: sel ? "none" : "1.5px solid #E5E7EB", cursor:"pointer", background: sel ? m.bg : "white", fontFamily:QS, fontSize:11, fontWeight:700, color: sel ? m.color : "#6B7280" }}>
                    <m.Icon size={12} color={sel?m.color:"#9CA3AF"}/> {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div><LBL text="Priority"/>
            <div style={{ display:"flex", gap:8 }}>
              {PRIOS.map(p => {
                const m = prioMeta(p); const sel = prio===p;
                return (
                  <button key={p} onClick={()=>setPrio(p)} style={{ flex:1, padding:"11px 0", borderRadius:14, border: sel ? "none" : "1.5px solid #E5E7EB", cursor:"pointer", background: sel ? m.bg : "white", fontFamily:QS, fontSize:12, fontWeight:800, color: sel ? m.color : "#9CA3AF", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background: sel ? m.dot : "#D1D5DB" }}/>
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:10, paddingTop:2 }}>
            <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:16, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Cancel</button>
            <button onClick={save} style={{ flex:2, padding:"13px 0", borderRadius:16, border:"none", backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS, boxShadow:"0 4px 14px rgba(151,114,246,.3)" }}>
              {editing ? "Save Changes" : "Save Highlight"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ title, onConfirm, onCancel }: { title:string; onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:95, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 28px" }}>
      <div style={{ background:"white", borderRadius:24, padding:24, width:"100%" }}>
        <div style={{ width:48, height:48, borderRadius:16, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
          <Trash2 size={22} color="#EF4444"/>
        </div>
        <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 6px", fontFamily:QS }}>Delete Highlight?</p>
        <p style={{ fontSize:12, color:"#6B7280", margin:"0 0 18px", fontFamily:IN, lineHeight:1.5 }}>
          Are you sure you want to delete <strong>"{title}"</strong>? This cannot be undone.
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", background:"#EF4444", color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Highlight Card ────────────────────────────────────────────────────────────

function HighlightCard({ h, onEdit, onDelete, showDesc=true }: { h:Highlight; onEdit:()=>void; onDelete:()=>void; showDesc?:boolean }) {
  const cm = catMeta(h.category);
  const pm = prioMeta(h.priority);
  return (
    <div style={{ background:"white", borderRadius:18, padding:"13px 14px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", borderLeft:`4px solid ${pm.dot}` }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ width:38, height:38, borderRadius:13, background:cm.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <cm.Icon size={17} color={cm.color}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6, marginBottom:3 }}>
            <p style={{ fontSize:13, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS, lineHeight:1.3 }}>{h.title}</p>
            <div style={{ display:"flex", gap:4, flexShrink:0 }}>
              <button onClick={onEdit} style={{ width:27, height:27, borderRadius:8, background:"#F5F0FF", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Edit2 size={11} color="#9772F6"/>
              </button>
              <button onClick={onDelete} style={{ width:27, height:27, borderRadius:8, background:"#FEE2E2", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Trash2 size={11} color="#EF4444"/>
              </button>
            </div>
          </div>
          {showDesc && h.description && (
            <p style={{ fontSize:11, color:"#6B7280", margin:"0 0 6px", fontFamily:IN, lineHeight:1.4 }}>{h.description}</p>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" as const }}>
            <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN, display:"flex", alignItems:"center", gap:3 }}>
              <Calendar size={10} color="#C4C9D4"/> {fmtDate(h.date)}
            </span>
            <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN, display:"flex", alignItems:"center", gap:3 }}>
              <Clock size={10} color="#C4C9D4"/> {fmtTime(h.time)}
            </span>
            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS }}>
              {pm.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full Highlights Modal ─────────────────────────────────────────────────────

export function HighlightsFullModal({ highlights, today, onClose, onAdd, onEdit, onDelete }: {
  highlights: Highlight[]; today: string; onClose:()=>void;
  onAdd: (h: Omit<Highlight,"id">) => void;
  onEdit: (h: Highlight) => void;
  onDelete: (id:string) => void;
}) {
  const [tab, setTab]           = useState<"today"|"week"|"month">("today");
  const [search, setSearch]     = useState("");
  const [fPrio, setFPrio]       = useState<HLPriority|"all">("all");
  const [fCat, setFCat]         = useState<HLCategory|"all">("all");
  const [selDate, setSelDate]   = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Highlight|null>(null);
  const [deleting, setDeleting] = useState<Highlight|null>(null);
  const [showCal, setShowCal]   = useState(true);

  const base = useMemo(()=> highlights.filter(h => {
    if(search){ const q=search.toLowerCase(); if(!h.title.toLowerCase().includes(q)&&!catMeta(h.category).label.toLowerCase().includes(q)) return false; }
    if(fPrio!=="all"&&h.priority!==fPrio) return false;
    if(fCat!=="all"&&h.category!==fCat) return false;
    return true;
  }), [highlights, search, fPrio, fCat]);

  const list = useMemo(()=>{
    let l = selDate ? base.filter(h=>h.date===selDate) : tab==="today" ? base.filter(h=>h.date===today) : tab==="week" ? base.filter(h=>isInWeek(h.date,today)) : base.filter(h=>isInMonth(h.date,today));
    return [...l].sort((a,b)=>a.date===b.date ? a.time.localeCompare(b.time):a.date.localeCompare(b.date));
  }, [base, tab, today, selDate]);

  const groups = useMemo(()=>{
    if(tab==="today"&&!selDate) return null;
    const g: Record<string,Highlight[]> = {};
    list.forEach(h=>{ (g[h.date]=g[h.date]||[]).push(h); });
    return g;
  }, [list, tab, selDate]);

  const handleSave = (data: Omit<Highlight,"id">&{id?:string}) => {
    if(data.id) onEdit({...data} as Highlight); else onAdd(data as Omit<Highlight,"id">);
    setShowForm(false); setEditing(null);
  };
  const handleDel = () => { if(!deleting) return; onDelete(deleting.id); setDeleting(null); };

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={()=>{setTab(t);setSelDate(null);}} style={{ flex:1, padding:"9px 0", border:"none", cursor:"pointer", fontFamily:QS, fontSize:11, fontWeight:800, borderRadius:10,
      background: tab===t&&!selDate ? GRAD : "transparent",
      color: tab===t&&!selDate ? "white" : "#9CA3AF",
    }}>{label}</button>
  );

  return (
    <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:70, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F3F4F8", borderRadius:"24px 24px 0 0", height:"93%", display:"flex", flexDirection:"column" as const }}>

        {/* Header */}
        <div style={{ padding:"16px 20px 12px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Highlights & Schedule</p>
              <p style={{ fontSize:11, color:"#9CA3AF", margin:0, fontFamily:IN }}>{highlights.length} total highlights</p>
            </div>
            <button onClick={()=>{setEditing(null);setShowForm(true);}} style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", borderRadius:12, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS }}>
              <Plus size={13} color="white"/> Add
            </button>
            <button onClick={()=>setShowCal(v=>!v)} style={{ width:34, height:34, borderRadius:10, background:showCal?"#F5F0FF":"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Calendar size={15} color={showCal?"#9772F6":"#6B7280"}/>
            </button>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={15} color="#6B7280"/>
            </button>
          </div>
          <div style={{ display:"flex", background:"#F3F4F6", borderRadius:12, padding:4 }}>
            {tabBtn("today","Today")}
            {tabBtn("week","This Week")}
            {tabBtn("month","This Month")}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"12px 16px 28px" }}>

          {/* Calendar */}
          {showCal && (
            <div style={{ marginBottom:12 }}>
              <MiniCalendar today={today} highlights={highlights} selectedDate={selDate} onSelect={setSelDate}/>
              {selDate && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8, padding:"8px 12px", background:"#F5F0FF", borderRadius:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#9772F6", fontFamily:QS }}>Showing: {fmtDate(selDate)}</span>
                  <button onClick={()=>setSelDate(null)} style={{ fontSize:11, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer", fontFamily:IN }}>Clear ×</button>
                </div>
              )}
            </div>
          )}

          {/* Search */}
          <div style={{ background:"white", borderRadius:12, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 1px 4px rgba(0,0,0,.05)", marginBottom:10 }}>
            <Search size={13} color="#9CA3AF"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title or category…"
              style={{ flex:1, border:"none", outline:"none", fontSize:12, fontFamily:IN, color:"#1F2937", background:"transparent" }}/>
          </div>

          {/* Priority filter pills */}
          <div style={{ display:"flex", gap:6, marginBottom:8, overflowX:"auto" as const, scrollbarWidth:"none" as const }}>
            {(["all","high","medium","low"] as const).map(p=>(
              <button key={p} onClick={()=>setFPrio(p)} style={{ flexShrink:0, padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, fontFamily:QS,
                background: fPrio===p ? (p==="all"?"#1F2937":prioMeta(p as HLPriority).dot) : "white",
                color: fPrio===p ? "white" : "#6B7280", boxShadow:"0 1px 4px rgba(0,0,0,.06)",
              }}>
                {p==="all" ? "All Priority" : prioMeta(p as HLPriority).label}
              </button>
            ))}
          </div>

          {/* Category filter pills */}
          <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto" as const, scrollbarWidth:"none" as const }}>
            <button onClick={()=>setFCat("all")} style={{ flexShrink:0, padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, fontFamily:QS, background:fCat==="all"?"#1F2937":"white", color:fCat==="all"?"white":"#6B7280", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>All</button>
            {CATS.map(c=>{
              const m=catMeta(c); return (
                <button key={c} onClick={()=>setFCat(c)} style={{ flexShrink:0, padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, fontFamily:QS, background:fCat===c?m.color:"white", color:fCat===c?"white":"#6B7280", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* List */}
          {list.length === 0 ? (
            <div style={{ textAlign:"center", paddingTop:36 }}>
              <Calendar size={36} color="#D1D5DB"/>
              <p style={{ fontSize:13, color:"#9CA3AF", marginTop:10, fontFamily:IN }}>No highlights found for this view.</p>
              <button onClick={()=>setShowForm(true)} style={{ marginTop:8, padding:"10px 20px", borderRadius:14, backgroundImage:GRAD, color:"white", fontSize:12, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS }}>+ Add Highlight</button>
            </div>
          ) : groups ? (
            Object.entries(groups).map(([d, items])=>(
              <div key={d} style={{ marginBottom:16 }}>
                <p style={{ fontSize:11, fontWeight:800, color:"#9772F6", fontFamily:QS, margin:"0 0 8px", letterSpacing:0.3 }}>
                  {d===today ? "Today" : fmtDayName(d)} — {fmtDate(d)}
                </p>
                <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
                  {items.map(h=><HighlightCard key={h.id} h={h} onEdit={()=>{setEditing(h);setShowForm(true);}} onDelete={()=>setDeleting(h)}/>)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
              {list.map(h=><HighlightCard key={h.id} h={h} onEdit={()=>{setEditing(h);setShowForm(true);}} onDelete={()=>setDeleting(h)}/>)}
            </div>
          )}
        </div>
      </div>

      {showForm && <HighlightFormModal editing={editing} defaultDate={selDate??today} onSave={handleSave} onClose={()=>{setShowForm(false);setEditing(null);}}/>}
      {deleting && <DeleteConfirm title={deleting.title} onConfirm={handleDel} onCancel={()=>setDeleting(null)}/>}
    </div>
  );
}

// ── Dashboard Section (embedded in DashboardScreen) ───────────────────────────

export function HighlightsDashboardSection({ highlights, today, onAdd, onEdit, onDelete, onActivity }: {
  highlights: Highlight[]; today: string;
  onAdd: (h: Omit<Highlight,"id">) => void;
  onEdit: (h: Highlight) => void;
  onDelete: (id: string) => void;
  onActivity: (msg: string, Icon: React.ElementType) => void;
}) {
  const [showFull, setShowFull] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Highlight|null>(null);
  const [deleting, setDeleting] = useState<Highlight|null>(null);

  const todayList = useMemo(()=>[...highlights.filter(h=>h.date===today)].sort((a,b)=>a.time.localeCompare(b.time)), [highlights, today]);
  const overdue   = useMemo(()=>highlights.filter(h=>h.date<today).sort((a,b)=>b.date.localeCompare(a.date)), [highlights, today]);
  const upcoming  = useMemo(()=>highlights.filter(h=>h.date>today).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0]??null, [highlights, today]);

  const commit = (data: Omit<Highlight,"id">&{id?:string}) => {
    if(data.id){ onEdit({...data} as Highlight); onActivity(`Landlord updated the highlight: "${data.title}."`, BookOpen); }
    else { onAdd(data as Omit<Highlight,"id">); onActivity(`Landlord created a new highlight: "${data.title}."`, BookOpen); }
    setShowForm(false); setEditing(null);
  };
  const confirmDel = () => {
    if(!deleting) return;
    onDelete(deleting.id);
    onActivity(`Landlord deleted the highlight: "${deleting.title}."`, BookOpen);
    setDeleting(null);
  };

  const fullAdd = (h: Omit<Highlight,"id">) => { onAdd(h); onActivity(`Landlord created a new highlight: "${h.title}."`, BookOpen); };
  const fullEdit = (h: Highlight)  => { onEdit(h); onActivity(`Landlord updated the highlight: "${h.title}."`, BookOpen); };
  const fullDel  = (id: string) => { const h=highlights.find(x=>x.id===id); onDelete(id); if(h) onActivity(`Landlord deleted the highlight: "${h.title}."`, BookOpen); };

  return (
    <>
      <div style={{ padding:"0 16px 0" }}>
        {/* Section header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:2 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Highlights & Schedule</p>
            <p style={{ fontSize:11, color:"#9CA3AF", margin:"2px 0 12px", fontFamily:IN, lineHeight:1.4 }}>Keep track of reminders, events, and schedules.</p>
          </div>
          <button onClick={()=>setShowFull(true)} style={{ fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0, marginTop:3 }}>View All</button>
        </div>

        {/* Overdue banner */}
        {overdue.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#FEF2F2", borderRadius:14, border:"1px solid #FEE2E2", marginBottom:10 }}>
            <AlertCircle size={15} color="#EF4444"/>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#EF4444", fontFamily:QS }}>Overdue: {overdue.length} highlight{overdue.length>1?"s":""}</p>
              <p style={{ margin:0, fontSize:10, color:"#EF4444", fontFamily:IN, opacity:.75 }}>{overdue[0].title}{overdue.length>1?` +${overdue.length-1} more`:""}</p>
            </div>
            <button onClick={()=>setShowFull(true)} style={{ fontSize:10, color:"#EF4444", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontFamily:QS }}>View →</button>
          </div>
        )}

        {/* Today highlights — white base card with horizontal swipe */}
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:12 }}>
          {todayList.length === 0 ? (
            <div style={{ padding:"24px 16px", textAlign:"center" }}>
              <Calendar size={28} color="#D1D5DB" style={{ marginBottom:8 }}/>
              <p style={{ fontSize:12, color:"#9CA3AF", margin:"0 0 12px", fontFamily:IN }}>No highlights for today yet.</p>
              <button onClick={()=>{setEditing(null);setShowForm(true);}} style={{ padding:"8px 20px", borderRadius:12, backgroundImage:GRAD, color:"white", fontSize:11, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS }}>+ Add Highlight</button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:10, overflowX:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 14px 14px", WebkitOverflowScrolling:"touch" as const }}>
              {todayList.map(h => {
                const cm = catMeta(h.category);
                const pm = prioMeta(h.priority);
                return (
                  <div key={h.id} style={{ flexShrink:0, width:155, background:"#F9FAFB", borderRadius:18, padding:"13px 13px 11px", borderTop:`3px solid ${pm.dot}`, display:"flex", flexDirection:"column" as const }}>
                    {/* Icon + action row */}
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:9 }}>
                      <div style={{ width:34, height:34, borderRadius:11, background:cm.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <cm.Icon size={16} color={cm.color}/>
                      </div>
                      <div style={{ display:"flex", gap:3 }}>
                        <button onClick={()=>{setEditing(h);setShowForm(true);}} style={{ width:24, height:24, borderRadius:7, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,.08)" }}>
                          <Edit2 size={10} color="#9772F6"/>
                        </button>
                        <button onClick={()=>setDeleting(h)} style={{ width:24, height:24, borderRadius:7, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,.08)" }}>
                          <Trash2 size={10} color="#EF4444"/>
                        </button>
                      </div>
                    </div>
                    {/* Title */}
                    <p style={{ fontSize:12, fontWeight:800, color:"#1F2937", margin:"0 0 4px", fontFamily:QS, lineHeight:1.35, flex:1 }}>{h.title}</p>
                    {/* Time */}
                    <p style={{ fontSize:10, color:"#9CA3AF", margin:"0 0 8px", fontFamily:IN, display:"flex", alignItems:"center", gap:4 }}>
                      <Clock size={9} color="#C4C9D4"/> {fmtTime(h.time)}
                    </p>
                    {/* Priority badge */}
                    <span style={{ alignSelf:"flex-start" as const, fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS }}>
                      {pm.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming next event */}
        {upcoming && (
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"white", borderRadius:16, boxShadow:"0 2px 8px rgba(0,0,0,.04)", marginBottom:12, border:"1.5px solid #F5F0FF" }}>
            <div style={{ width:38, height:38, borderRadius:13, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <ArrowRight size={16} color="white"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:10, fontWeight:700, color:"#9772F6", fontFamily:QS, letterSpacing:0.2 }}>NEXT SCHEDULED</p>
              <p style={{ margin:"2px 0 0", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{upcoming.title}</p>
              <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{fmtRelDate(upcoming.date, today)} · {fmtTime(upcoming.time)}</p>
            </div>
            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:prioMeta(upcoming.priority).bg, color:prioMeta(upcoming.priority).color, fontFamily:QS, flexShrink:0 }}>
              {prioMeta(upcoming.priority).label}
            </span>
          </div>
        )}

        {/* Add button */}
        <button onClick={()=>{setEditing(null);setShowForm(true);}} style={{ width:"100%", padding:"12px 0", borderRadius:14, backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:20, boxShadow:"0 4px 14px rgba(151,114,246,.25)" }}>
          <Plus size={15} color="white"/> Add Highlight
        </button>
      </div>

      {showFull && <HighlightsFullModal highlights={highlights} today={today} onClose={()=>setShowFull(false)} onAdd={fullAdd} onEdit={fullEdit} onDelete={fullDel}/>}
      {showForm && <HighlightFormModal editing={editing} defaultDate={today} onSave={commit} onClose={()=>{setShowForm(false);setEditing(null);}}/>}
      {deleting && <DeleteConfirm title={deleting.title} onConfirm={confirmDel} onCancel={()=>setDeleting(null)}/>}
    </>
  );
}
