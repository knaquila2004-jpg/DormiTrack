import React, { useState, useMemo } from "react";
import {
  Megaphone,
  Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Calendar,
  Clock, Search, AlertCircle, BookOpen,
} from "lucide-react";

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

// `.toISOString()` reports the date in UTC, not the viewer's local calendar day — for
// any timezone ahead of UTC (e.g. Philippines, UTC+8, where this app is actually used)
// that's silently *yesterday's* date for the first several hours of every local day.
// Every "today"/"tomorrow"/"this week" computation below goes through this instead.
const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const HL_TODAY = toISODate(new Date()); // "YYYY-MM-DD", local calendar day

// ── Types ─────────────────────────────────────────────────────────────────────

// The landlord's own "Announcements" planner (internal name — Highlight —
// unchanged; only the UI-facing term changed to "Announcement"). Both date and
// time are independent and optional: a general/evergreen announcement can have
// neither, just a title/description.
export type Highlight = {
  id: string;
  title: string;
  description?: string;
  date?: string;   // "YYYY-MM-DD", only present if the landlord opted to add one
  time?: string;   // "HH:MM" 24h, only present if the landlord opted to add one
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });

const fmtRelDate = (d: string, today: string) => {
  if (d === today) return "Today";
  const t = new Date(today + "T00:00:00"); t.setDate(t.getDate() + 1);
  if (d === toISODate(t)) return "Tomorrow";
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
  return date >= toISODate(s) && date <= toISODate(e);
};

const isInMonth = (date: string, today: string) => date.slice(0,7) === today.slice(0,7);

// Small local switch — mirrors App.tsx's ToggleSwitch (not exported from there),
// just sized to sit inline next to a field label.
function MiniToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width:36, height:20, borderRadius:10, background: value ? undefined : "#D1D5DB", flexShrink:0, position:"relative" as const, cursor:"pointer", backgroundImage: value ? GRAD : undefined, transition:"background 0.2s" }}>
      <div style={{ position:"absolute" as const, top:2.5, left: value ? 18.5 : 2.5, width:15, height:15, borderRadius:"50%", background:"white", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left 0.2s ease" }}/>
    </div>
  );
}

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

  // Which dates have at least one announcement — undated ones (general
  // announcements) have nothing to plot here, only dated ones do.
  const datesWithHighlight = useMemo(
    () => new Set(highlights.map(h => h.date).filter((d): d is string => !!d)),
    [highlights],
  );

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
          const hasHighlight = datesWithHighlight.has(ds);
          return (
            <button key={ds} onClick={()=>onSelect(ds===selectedDate ? null : ds)}
              style={{ width:"100%", aspectRatio:"1", borderRadius:7, border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:1,
                background: isSel ? "#9772F6" : isTd ? "#F5F0FF" : "transparent",
                color: isSel ? "white" : isTd ? "#9772F6" : "#374151",
                fontFamily:QS, fontSize:11, fontWeight:(isTd||isSel) ? 800 : 500,
              }}>
              {day}
              {hasHighlight && <div style={{ width:4, height:4, borderRadius:"50%", background: isSel ? "rgba(255,255,255,.75)" : "#9772F6" }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────

function HighlightFormModal({ editing, defaultDate, onSave, onClose, onDelete }: {
  editing: Highlight|null; defaultDate: string;
  onSave: (h: Omit<Highlight,"id"> & { id?: string }) => void;
  onClose: ()=>void;
  onDelete?: ()=>void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [desc,  setDesc]  = useState(editing?.description ?? "");
  // Date and time are each opt-in independently — the checkbox/toggle is the
  // source of truth for whether one gets sent at all, not just whether the
  // input below happens to be empty.
  const [hasDate, setHasDate] = useState(!!editing?.date);
  const [date,    setDate]    = useState(editing?.date ?? defaultDate);
  const [hasTime, setHasTime] = useState(!!editing?.time);
  const [time,    setTime]    = useState(editing?.time ?? "09:00");
  const [err,   setErr]   = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const save = () => {
    if(!title.trim()){ setErr("Please enter an announcement title."); return; }
    onSave({
      id: editing?.id, title: title.trim(), description: desc.trim()||undefined,
      date: hasDate ? date : undefined,
      time: hasTime ? time : undefined,
    });
  };

  // Cancel only prompts "are you sure?" if closing would actually throw something
  // away — a blank, untouched form (or an edit with nothing changed) just closes.
  const isDirty = editing
    ? title !== editing.title || desc !== (editing.description ?? "")
      || hasDate !== !!editing.date || (hasDate && date !== editing.date)
      || hasTime !== !!editing.time || (hasTime && time !== editing.time)
    : title.trim() !== "" || desc.trim() !== "" || hasDate || hasTime;
  const handleCancel = () => { if (isDirty) setConfirmDiscard(true); else onClose(); };

  const LBL = ({ text }: { text: string }) => (
    <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:QS, letterSpacing:0.3, textTransform:"uppercase" as const, display:"block" }}>{text}</label>
  );
  const field: React.CSSProperties = { width:"100%", padding:"11px 14px", borderRadius:14, border:"1.5px solid #E5E7EB", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const };

  return (
    <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:85, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#F7F8FC", borderRadius:24, width:"100%", maxWidth:400, maxHeight:"85%", display:"flex", flexDirection:"column" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>
        {/* Header — the only place Delete lives now: opening the card is how you get
            here, so a separate delete icon on every card was redundant. */}
        <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, position:"relative" as const, textAlign:"center" as const }}>
          {editing && onDelete && (
            <button onClick={onDelete} style={{ position:"absolute" as const, right:18, top:16, width:32, height:32, borderRadius:10, background:"#FEE2E2", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Trash2 size={14} color="#EF4444"/>
            </button>
          )}
          <p style={{ fontSize:17, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>{editing ? "Edit Announcement" : "Add Announcement"}</p>
          <p style={{ fontSize:12, color:"#9CA3AF", margin:0, fontFamily:IN }}>Fill in the details below</p>
        </div>

        <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 20px 28px", display:"flex", flexDirection:"column" as const, gap:14 }}>
          {err && <div style={{ padding:"9px 13px", background:"#FEE2E2", borderRadius:12, color:"#EF4444", fontSize:12, fontFamily:IN }}>{err}</div>}

          {/* Title */}
          <div><LBL text="Announcement Title *"/>
            <div style={{ marginTop:6 }}>
              <input value={title} onChange={e=>{setTitle(e.target.value);setErr("");}} placeholder="e.g. Monthly Room Inspection" style={field}/>
            </div>
          </div>

          {/* Description */}
          <div><LBL text="Description (optional)"/>
            <div style={{ marginTop:6 }}>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Add a short note or details…" style={{ ...field, resize:"none" as const }}/>
            </div>
          </div>

          {/* Date + Time — each independently optional via its own toggle */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <LBL text="Add Date"/>
                <MiniToggle value={hasDate} onToggle={()=>setHasDate(v=>!v)}/>
              </div>
              {hasDate && <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ ...field, fontSize:12 }}/>}
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <LBL text="Add Time"/>
                <MiniToggle value={hasTime} onToggle={()=>setHasTime(v=>!v)}/>
              </div>
              {hasTime && <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ ...field, fontSize:12 }}/>}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:10, paddingTop:2 }}>
            <button onClick={handleCancel} style={{ flex:1, padding:"13px 0", borderRadius:16, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Cancel</button>
            <button onClick={save} style={{ flex:2, padding:"13px 0", borderRadius:16, border:"none", backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS, boxShadow:"0 4px 14px rgba(151,114,246,.3)" }}>
              {editing ? "Save Changes" : "Save Announcement"}
            </button>
          </div>
        </div>
      </div>

      {confirmDiscard && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:96, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 28px" }}>
          <div style={{ background:"white", borderRadius:24, padding:24, width:"100%" }}>
            <div style={{ width:48, height:48, borderRadius:16, background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
              <AlertCircle size={22} color="#D97706"/>
            </div>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 6px", fontFamily:QS }}>Discard {editing ? "Changes" : "Announcement"}?</p>
            <p style={{ fontSize:12, color:"#6B7280", margin:"0 0 18px", fontFamily:IN, lineHeight:1.5 }}>
              {editing
                ? "You have unsaved changes. If you leave now, they'll be lost."
                : "What you've typed hasn't been saved yet. If you leave now, it'll be lost."}
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmDiscard(false)} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Keep Editing</button>
              <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", background:"#EF4444", color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ title, onConfirm, onCancel }: { title:string; onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:95, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 28px" }}>
      <div style={{ background:"white", borderRadius:24, padding:24, width:"100%" }}>
        <div style={{ width:48, height:48, borderRadius:16, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
          <Trash2 size={22} color="#EF4444"/>
        </div>
        <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 6px", fontFamily:QS }}>Delete Announcement?</p>
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
  return (
    // Whole card opens the edit form — same tap-anywhere-to-open pattern every other
    // list card in the app uses (reports, requests, payments). The small icon buttons
    // still work as shortcuts; each stops propagation so tapping Delete doesn't also
    // fire this and pop the edit form open behind/alongside the delete confirm.
    <div onClick={onEdit} style={{ background:"white", borderRadius:18, padding:"13px 14px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", borderLeft:"4px solid #9772F6", cursor:"pointer" }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ width:38, height:38, borderRadius:13, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Megaphone size={17} color="#9772F6"/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6, marginBottom:3 }}>
            <p style={{ fontSize:13, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS, lineHeight:1.3 }}>{h.title}</p>
            <div style={{ display:"flex", gap:4, flexShrink:0 }}>
              <button onClick={e=>{e.stopPropagation();onEdit();}} style={{ width:27, height:27, borderRadius:8, background:"#F5F0FF", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Edit2 size={11} color="#9772F6"/>
              </button>
              <button onClick={e=>{e.stopPropagation();onDelete();}} style={{ width:27, height:27, borderRadius:8, background:"#FEE2E2", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Trash2 size={11} color="#EF4444"/>
              </button>
            </div>
          </div>
          {showDesc && h.description && (
            <p style={{ fontSize:11, color:"#6B7280", margin:"0 0 6px", fontFamily:IN, lineHeight:1.4 }}>{h.description}</p>
          )}
          {(h.date || h.time) && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" as const }}>
              {h.date && (
                <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN, display:"flex", alignItems:"center", gap:3 }}>
                  <Calendar size={10} color="#C4C9D4"/> {fmtDate(h.date)}
                </span>
              )}
              {h.time && (
                <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN, display:"flex", alignItems:"center", gap:3 }}>
                  <Clock size={10} color="#C4C9D4"/> {fmtTime(h.time)}
                </span>
              )}
            </div>
          )}
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
  const [selDate, setSelDate]   = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Highlight|null>(null);
  const [deleting, setDeleting] = useState<Highlight|null>(null);
  const [showCal, setShowCal]   = useState(true);

  const base = useMemo(()=> highlights.filter(h => {
    if(search){ const q=search.toLowerCase(); if(!h.title.toLowerCase().includes(q)) return false; }
    return true;
  }), [highlights, search]);

  // General (undated) announcements aren't tied to any day, so the Today/Week/Month
  // tabs below — which only make sense for dated ones — never touch them; they get
  // their own always-visible section instead, unless a specific calendar date is
  // selected (at that point the view is explicitly "what's on this day").
  const dated   = useMemo(()=> base.filter(h=>h.date), [base]);
  const general = useMemo(()=> base.filter(h=>!h.date), [base]);

  const list = useMemo(()=>{
    let l = selDate ? dated.filter(h=>h.date===selDate) : tab==="today" ? dated.filter(h=>h.date===today) : tab==="week" ? dated.filter(h=>isInWeek(h.date!,today)) : dated.filter(h=>isInMonth(h.date!,today));
    return [...l].sort((a,b)=>a.date===b.date ? (a.time??"").localeCompare(b.time??"") : a.date!.localeCompare(b.date!));
  }, [dated, tab, today, selDate]);

  const groups = useMemo(()=>{
    if(tab==="today"&&!selDate) return null;
    const g: Record<string,Highlight[]> = {};
    list.forEach(h=>{ (g[h.date!]=g[h.date!]||[]).push(h); });
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
    <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:70, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#F3F4F8", borderRadius:24, width:"100%", maxWidth:420, maxHeight:"85%", display:"flex", flexDirection:"column" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px 12px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Announcements & Schedule</p>
              <p style={{ fontSize:11, color:"#9CA3AF", margin:0, fontFamily:IN }}>{highlights.length} total announcements</p>
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
          <div style={{ background:"white", borderRadius:12, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 1px 4px rgba(0,0,0,.05)", marginBottom:16 }}>
            <Search size={13} color="#9CA3AF"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title…"
              style={{ flex:1, border:"none", outline:"none", fontSize:12, fontFamily:IN, color:"#1F2937", background:"transparent" }}/>
          </div>

          {/* General (undated) announcements — always visible regardless of tab, since
              they aren't tied to a day; hidden only while a specific date is selected. */}
          {!selDate && general.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:11, fontWeight:800, color:"#9772F6", fontFamily:QS, margin:"0 0 8px", letterSpacing:0.3 }}>General Announcements</p>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
                {general.map(h=><HighlightCard key={h.id} h={h} onEdit={()=>{setEditing(h);setShowForm(true);}} onDelete={()=>setDeleting(h)}/>)}
              </div>
            </div>
          )}

          {/* List */}
          {list.length === 0 ? (
            general.length === 0 && (
              <div style={{ textAlign:"center", paddingTop:36 }}>
                <Calendar size={36} color="#D1D5DB"/>
                <p style={{ fontSize:13, color:"#9CA3AF", marginTop:10, fontFamily:IN }}>No announcements found for this view.</p>
                <button onClick={()=>setShowForm(true)} style={{ marginTop:8, padding:"10px 20px", borderRadius:14, backgroundImage:GRAD, color:"white", fontSize:12, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS }}>Add Announcement</button>
              </div>
            )
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

      {showForm && <HighlightFormModal editing={editing} defaultDate={selDate??today} onSave={handleSave} onClose={()=>{setShowForm(false);setEditing(null);}} onDelete={editing ? ()=>{ const h=editing; setShowForm(false); setEditing(null); setDeleting(h); } : undefined}/>}
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

  const todayList = useMemo(()=>[...highlights.filter(h=>h.date===today)].sort((a,b)=>(a.time??"").localeCompare(b.time??"")), [highlights, today]);
  const overdue   = useMemo(()=>highlights.filter(h=>h.date && h.date<today).sort((a,b)=>b.date!.localeCompare(a.date!)), [highlights, today]);
  const upcomingList = useMemo(()=>highlights.filter(h=>h.date && h.date>today).sort((a,b)=>a.date!.localeCompare(b.date!)||(a.time??"").localeCompare(b.time??"")), [highlights, today]);
  // General (undated) announcements — never caught by todayList/overdue/upcoming
  // above (all date-based), so without this they'd be invisible on the dashboard.
  const general   = useMemo(()=>highlights.filter(h=>!h.date), [highlights]);

  const commit = (data: Omit<Highlight,"id">&{id?:string}) => {
    if(data.id){ onEdit({...data} as Highlight); onActivity(`Landlord updated the announcement: "${data.title}."`, BookOpen); }
    else { onAdd(data as Omit<Highlight,"id">); onActivity(`Landlord created a new announcement: "${data.title}."`, BookOpen); }
    setShowForm(false); setEditing(null);
  };
  const confirmDel = () => {
    if(!deleting) return;
    onDelete(deleting.id);
    onActivity(`Landlord deleted the announcement: "${deleting.title}."`, BookOpen);
    setDeleting(null);
  };

  const fullAdd = (h: Omit<Highlight,"id">) => { onAdd(h); onActivity(`Landlord created a new announcement: "${h.title}."`, BookOpen); };
  const fullEdit = (h: Highlight)  => { onEdit(h); onActivity(`Landlord updated the announcement: "${h.title}."`, BookOpen); };
  const fullDel  = (id: string) => { const h=highlights.find(x=>x.id===id); onDelete(id); if(h) onActivity(`Landlord deleted the announcement: "${h.title}."`, BookOpen); };

  return (
    <>
      <div style={{ padding:"0 16px 0" }}>
        {/* Section header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:2 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Announcements & Schedule</p>
            <p style={{ fontSize:11, color:"#9CA3AF", margin:"2px 0 12px", fontFamily:IN, lineHeight:1.4 }}>Keep track of reminders, events, and announcements.</p>
          </div>
          <button onClick={()=>setShowFull(true)} style={{ fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0, marginTop:3 }}>View All</button>
        </div>

        {/* Overdue banner */}
        {overdue.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#FEF2F2", borderRadius:14, border:"1px solid #FEE2E2", marginBottom:10 }}>
            <AlertCircle size={15} color="#EF4444"/>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#EF4444", fontFamily:QS }}>Overdue: {overdue.length} announcement{overdue.length>1?"s":""}</p>
              <p style={{ margin:0, fontSize:10, color:"#EF4444", fontFamily:IN, opacity:.75 }}>{overdue[0].title}{overdue.length>1?` +${overdue.length-1} more`:""}</p>
            </div>
            <button onClick={()=>setShowFull(true)} style={{ fontSize:10, color:"#EF4444", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontFamily:QS }}>View →</button>
          </div>
        )}

        {/* Today's announcements — each one is its own separate white card (not rows
            inside one shared card), wide/rectangular rather than square, in a
            horizontally swipeable row. */}
        <div style={{ marginBottom:(upcomingList.length>0||general.length>0)?18:20 }}>
          {todayList.length === 0 ? (
            <div style={{ background:"white", borderRadius:20, padding:"24px 16px", textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:10 }}>
              <p style={{ fontSize:12, color:"#9CA3AF", margin:0, fontFamily:IN }}>No announcements for today yet.</p>
            </div>
          ) : (
            <div style={{ display:"flex", gap:12, overflowX:"auto" as const, scrollbarWidth:"none" as const, padding:"4px 4px 12px", WebkitOverflowScrolling:"touch" as const }}>
              {todayList.map(h => (
                // Icon + text sit side by side. The purple panel is a full-height block
                // flush against the card's left edge (no padding/gap of its own — the
                // card's own overflow:hidden clips it to the same rounded corners on the
                // left, and its right edge is a plain straight line into the white area),
                // not just a small icon chip anymore. No edit/delete buttons on the card —
                // tapping it opens the form, which is also where Delete lives now.
                <div key={h.id} onClick={()=>{setEditing(h);setShowForm(true);}} style={{ flexShrink:0, width:220, background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)", display:"flex", cursor:"pointer" }}>
                  <div style={{ width:50, background:"#9772F6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Megaphone size={18} color="white"/>
                  </div>
                  <div style={{ flex:1, minWidth:0, padding:"10px 14px 9px" }}>
                    <p style={{ fontSize:12, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS, lineHeight:1.35, whiteSpace:"nowrap" as const, overflow:"hidden", textOverflow:"ellipsis" }}>{h.title}</p>
                    {h.time && (
                      <p style={{ fontSize:10, color:"#9CA3AF", margin:"2px 0 0", fontFamily:IN, display:"flex", alignItems:"center", gap:4 }}>
                        <Clock size={9} color="#C4C9D4"/> {fmtTime(h.time)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Add button */}
          <button onClick={()=>{setEditing(null);setShowForm(true);}} style={{ width:"100%", padding:"12px 0", borderRadius:14, backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, boxShadow:"0 4px 14px rgba(151,114,246,.25)" }}>
            Add Announcement
          </button>
        </div>

        {/* General (undated) announcements — same separate-card, horizontally swipeable
            treatment as Today above, so every one of them is reachable right here on
            the dashboard instead of only the first few with a "View All" detour. */}
        {general.length > 0 && (
          <div style={{ marginBottom:upcomingList.length>0?18:20 }}>
            <p style={{ margin:"0 0 8px 2px", fontSize:11, fontWeight:800, color:"#9772F6", fontFamily:QS, letterSpacing:0.3 }}>GENERAL ANNOUNCEMENTS</p>
            <div style={{ display:"flex", gap:12, overflowX:"auto" as const, scrollbarWidth:"none" as const, padding:"4px 4px 12px", WebkitOverflowScrolling:"touch" as const }}>
              {general.map(h => (
                // No edit/delete buttons — tapping the card opens the form, and Delete
                // lives there (top-right of that modal) instead of on every card. Same
                // full-height left panel treatment as the Today cards above.
                <div key={h.id} onClick={()=>{setEditing(h);setShowForm(true);}} style={{ flexShrink:0, width:220, background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.06)", display:"flex", cursor:"pointer" }}>
                  <div style={{ width:50, background:"#9772F6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Megaphone size={18} color="white"/>
                  </div>
                  <div style={{ flex:1, minWidth:0, padding:"8px 15px 7px" }}>
                    <p style={{ fontSize:12, fontWeight:800, color:"#1F2937", margin:"0 0 4px", fontFamily:QS, lineHeight:1.35 }}>{h.title}</p>
                    {/* Description preview — stands in for the Today row's time, since a
                        general announcement has neither. */}
                    {h.description && (
                      <p style={{ fontSize:10, color:"#9CA3AF", margin:0, fontFamily:IN, lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden" }}>
                        {h.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming — same separate-card, horizontally swipeable treatment, instead of
            only ever showing the single nearest one with no way to reach the rest. */}
        {upcomingList.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <p style={{ margin:"0 0 8px 2px", fontSize:11, fontWeight:800, color:"#9772F6", fontFamily:QS, letterSpacing:0.3 }}>UPCOMING</p>
            <div style={{ display:"flex", gap:12, overflowX:"auto" as const, scrollbarWidth:"none" as const, padding:"4px 4px 12px", WebkitOverflowScrolling:"touch" as const }}>
              {upcomingList.map(h => (
                // No delete button — tapping the card opens the form, and Delete lives
                // there (top-right of that modal) instead of on every card.
                <div key={h.id} onClick={()=>{setEditing(h);setShowForm(true);}} style={{ flexShrink:0, width:220, background:"white", borderRadius:18, padding:"10px 14px 9px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", cursor:"pointer" }}>
                  <p style={{ fontSize:14, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS, lineHeight:1.35 }}>{h.title}</p>
                  <p style={{ fontSize:11, color:"#9CA3AF", margin:"4px 0 0", fontFamily:IN }}>{fmtRelDate(h.date!, today)}{h.time ? ` · ${fmtTime(h.time)}` : ""}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showFull && <HighlightsFullModal highlights={highlights} today={today} onClose={()=>setShowFull(false)} onAdd={fullAdd} onEdit={fullEdit} onDelete={fullDel}/>}
      {showForm && <HighlightFormModal editing={editing} defaultDate={today} onSave={commit} onClose={()=>{setShowForm(false);setEditing(null);}} onDelete={editing ? ()=>{ const h=editing; setShowForm(false); setEditing(null); setDeleting(h); } : undefined}/>}
      {deleting && <DeleteConfirm title={deleting.title} onConfirm={confirmDel} onCancel={()=>setDeleting(null)}/>}
    </>
  );
}
