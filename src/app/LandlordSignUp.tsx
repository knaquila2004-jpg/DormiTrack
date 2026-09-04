import React, { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Check, Eye, EyeOff, Mail, Lock,
  MapPin, Camera, Plus, X, Phone, AlertTriangle,
} from "lucide-react";
import { GRAD, GRAD_H, Screen, LBed, LRoom, LPaymentExtra } from "./shared";
import { BoardingHouseLocationPicker } from "./components/BoardingHouseLocationPicker";
import { AddressComponents } from "./components/mapGeo";
import { supabase } from "../lib/supabase";
import { createBoardingHouseWithRooms } from "./boardingHouseStore";

// ── Payment Setup helpers ─────────────────────────────────────────────────────
// Hoisted to module scope (not redeclared per-render) so they keep a stable
// component identity across renders. Defining these as local `const`s inside the
// render body — as they were before — makes React see a brand-new component type
// on every re-render, which unmounts/remounts the underlying <input> on every
// keystroke and drops focus after a single character.
function PaymentToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width:40, height:22, borderRadius:11, background: on ? undefined : "#D1D5DB", backgroundImage: on ? GRAD : undefined, position:"relative" as const, cursor:"pointer", flexShrink:0, transition:"background .2s" }}>
      <div style={{ position:"absolute" as const, top:2, left: on ? 20 : 2, width:18, height:18, borderRadius:"50%", background:"white", boxShadow:"0 1px 4px rgba(0,0,0,.2)", transition:"left .2s" }}/>
    </div>
  );
}
function PaymentTypePicker({ type, setType }: { type: string; setType: (v: string) => void }) {
  return (
    <div style={{ display:"flex", background:"#F3F4F6", borderRadius:10, padding:3, marginTop:8 }}>
      {["fixed","metered"].map(t => (
        <button key={t} onClick={()=>setType(t)} style={{ flex:1, padding:"7px 0", borderRadius:8, border:"none", cursor:"pointer", background: type===t ? "white" : "transparent", color: type===t ? "#9772F6" : "#6B7280", fontSize:11, fontWeight:800, fontFamily:"'Quicksand',sans-serif", boxShadow: type===t ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
          {t==="fixed" ? "Fixed Rate" : "Meter-Based"}
        </button>
      ))}
    </div>
  );
}
function PaymentAmtInput({ value, onChange, placeholder = "500" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position:"relative" as const, marginTop:10 }}>
      <span style={{ position:"absolute" as const, left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#9CA3AF", fontFamily:"'Quicksand',sans-serif" }}>₱</span>
      <input type="number" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", boxSizing:"border-box" as const, padding:"13px 14px", borderRadius:14, border:"1.5px solid #E5E7EB", background:"#F9FAFB", color:"#1F2937", fontSize:14, fontFamily:"'Inter',sans-serif", outline:"none", paddingLeft:28 }}/>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, msg, confirmLabel = "Confirm", onConfirm, onCancel }: {
  title: string; msg: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }} onClick={onCancel}>
      <div style={{ background:"white", borderRadius:26, padding:"26px 22px 20px", width:"100%", maxWidth:320, boxShadow:"0 24px 60px rgba(0,0,0,.3)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:52, height:52, borderRadius:18, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
          <AlertTriangle size={24} color="#EF4444" />
        </div>
        <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:"'Quicksand',sans-serif", textAlign:"center" as const }}>{title}</h3>
        <p style={{ margin:"0 0 22px", fontSize:12, color:"#6B7280", fontFamily:"'Inter',sans-serif", lineHeight:1.65, textAlign:"center" as const }}>{msg}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={onCancel} style={{ height:48, borderRadius:18, border:"2px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:13, fontWeight:800, color:"#374151", fontFamily:"'Quicksand',sans-serif" }}>Cancel</button>
          <button onClick={onConfirm} style={{ height:48, borderRadius:18, border:"none", background:"#EF4444", cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:"'Quicksand',sans-serif" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function LandlordSignUpScreen({ go }: { go: (s: Screen) => void }) {
  const QS = "'Quicksand',sans-serif";
  const IN = "'Inter',sans-serif";
  const [step, setStep] = useState(0); // 0=personal 1=account 2=setup 3=review
  const [bhLat, setBhLat] = useState<number | null>(null);
  const [bhLng, setBhLng] = useState<number | null>(null);
  const [customAmenity, setCustomAmenity] = useState("");
  const [bhCustomAmenities, setBhCustomAmenities] = useState<string[]>([]);
  const [roomCustomInput, setRoomCustomInput] = useState<Record<string,string>>({});

  // ── Step 1: Personal Info ─────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [sex, setSex] = useState("");
  const [address, setAddress] = useState("");

  // ── Step 2: Account Info ──────────────────────────────────────────────────
  const username = (() => {
    const f = firstName.trim().toLowerCase().replace(/\s+/g, "");
    const mi = middleName.trim().toLowerCase().replace(/\s+/g, "")[0] ?? "";
    const l = lastName.trim().toLowerCase().replace(/\s+/g, "");
    if (!f && !mi && !l) return "";
    return [f, mi, l].filter(Boolean).join("_");
  })();
  const [email, setEmail] = useState("");
  const [emailNA, setEmailNA] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  // ── Step 3: Boarding House Setup ──────────────────────────────────────────
  const [bhName, setBhName] = useState("");
  const [bhAddress, setBhAddress] = useState("");
  const [bhComponents, setBhComponents] = useState<AddressComponents>({});
  const [bhLocationType, setBhLocationType] = useState<"existing" | "custom" | null>(null);
  const [bhPlaceName, setBhPlaceName] = useState<string | null>(null);
  const [bhPlaceId, setBhPlaceId] = useState<string | null>(null);
  const [bhLocationConfirmed, setBhLocationConfirmed] = useState(false);
  const [bhRadius, setBhRadius] = useState(50); // the only area a student's check-in/check-out is accepted from
  const [bhLandlord, setBhLandlord] = useState("");
  const [bhContact, setBhContact] = useState("");
  const [bhDesc, setBhDesc] = useState("");
  const [bhAmenities, setBhAmenities] = useState<string[]>([]);
  const [rooms, setRooms] = useState<LRoom[]>([]);
  const [highlightsEnabled, setHighlightsEnabled] = useState(true);
  const [visitorRecordsEnabled, setVisitorRecordsEnabled] = useState(false);
  const [vfName, setVfName] = useState(true);
  const [vfContact, setVfContact] = useState(true);
  const [vfRelationship, setVfRelationship] = useState(true);
  const [vfPurpose, setVfPurpose] = useState(true);
  const [allowLengthOfStay, setAllowLengthOfStay] = useState(true);
  const [allowMoveIn, setAllowMoveIn] = useState(true);
  const [allowPersonality, setAllowPersonality] = useState(true);
  const [allowHobbies, setAllowHobbies] = useState(true);
  const [allowLifestyle, setAllowLifestyle] = useState(true);
  const [allowNotes, setAllowNotes] = useState(true);
  const [bhRules, setBhRules] = useState("");
  const [rentEnabled, setRentEnabled] = useState(true);
  const [rentAmt, setRentAmt] = useState("");
  const [electricEnabled, setElectricEnabled] = useState(true);
  const [electricType, setElectricType] = useState<"fixed"|"metered">("fixed");
  const [electricAmt, setElectricAmt] = useState("");
  const [waterEnabled, setWaterEnabled] = useState(true);
  const [waterType, setWaterType] = useState<"fixed"|"metered">("fixed");
  const [waterAmt, setWaterAmt] = useState("");
  const [internetEnabled, setInternetEnabled] = useState(false);
  const [internetType, setInternetType] = useState<"fixed"|"metered">("fixed");
  const [internetAmt, setInternetAmt] = useState("");
  const [extraPayments, setExtraPayments] = useState<LPaymentExtra[]>([]);
  const [galleryImages, setGalleryImages] = useState<{ id: string; label: string; url: string }[]>([]);
  const addGalleryImages = (files: FileList | null, presetLabel?: string) => {
    if (!files || files.length === 0) return;
    // createObjectURL is a side effect (it allocates a real resource) — it has to run here,
    // synchronously in the event handler, and NOT inside the setState updater below. The caller
    // resets the <input>'s value right after this returns, which can invalidate the FileList a
    // deferred updater would still be holding onto; computing the URLs up front avoids that race
    // and matches the same synchronous pattern every other photo upload in this file already uses.
    if (presetLabel) {
      const url = URL.createObjectURL(files[0]);
      setGalleryImages(prev => {
        // A preset category row (e.g. "Exterior") holds exactly one photo — picking a new one for
        // that row replaces its existing entry instead of piling up duplicates.
        const idx = prev.findIndex(g => g.label === presetLabel);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], url };
          return copy;
        }
        return [...prev, { id: `gal-${Date.now()}-${Math.random().toString(36).slice(2)}`, label: presetLabel, url }];
      });
      return;
    }
    const added = Array.from(files).map((f, i) => ({
      id: `gal-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`, label: "", url: URL.createObjectURL(f),
    }));
    setGalleryImages(prev => [...prev, ...added]);
  };
  const removeGalleryImage = (id: string) => setGalleryImages(prev => prev.filter(g => g.id !== id));
  const updateGalleryLabel = (id: string, label: string) => setGalleryImages(prev => prev.map(g => g.id === id ? { ...g, label } : g));
  const GALLERY_PRESET_LABELS = ["Exterior","Entrance","Living Area","Kitchen","Dining Area","Common Room"];

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-populate BH landlord name and contact from Step 1
  useEffect(() => {
    setBhLandlord([firstName, middleName ? middleName.charAt(0)+"." : "", lastName].filter(Boolean).join(" "));
  }, [firstName, middleName, lastName]);
  useEffect(() => { setBhContact(contact); }, [contact]);

  // Generate beds when room capacity changes
  const updateRoomCap = (id: string, cap: string) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== id) return r;
      const n = Math.max(0, parseInt(cap) || 0);
      const beds = Array.from({ length: n }, (_, i) => r.beds[i] ?? { label: `Bed ${i+1}`, status: "available" as const });
      return { ...r, cap, beds };
    }));
  };

  const addRoom = () => {
    const id = Date.now().toString();
    setRooms(prev => [...prev, { id, name: `Room ${prev.length + 1}`, desc: "", cap: "", occ: "", amenities: [], customAmenities: [], beds: [], roomPhoto: undefined, crPhoto: undefined, confirmed: false }]);
  };
  const removeRoom = (id: string) => setRooms(prev => prev.filter(r => r.id !== id));
  const updateRoom = (id: string, key: keyof LRoom, val: string) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
    if (key === "cap") updateRoomCap(id, val);
  };
  const toggleRoomAmenity = (id: string, a: string) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, amenities: r.amenities.includes(a) ? r.amenities.filter(x => x !== a) : [...r.amenities, a] } : r));
  };
  // "reserved" deliberately isn't a manually-settable option here — it's now a real,
  // system-only status (submit_boarding_registration reserves a bed the instant a
  // student's registration is pending, reject_registration releases it; see
  // 0047_reserve_bed_on_registration.sql). Nothing exists to actually reserve at
  // account-creation time, so offering it here just let a landlord accidentally mark
  // a brand-new bed as reserved with no real registration behind it — the exact bug
  // this comment is here to prevent from coming back.
  const setBedStatus = (rid: string, bi: number, status: "available"|"occupied") => {
    setRooms(prev => prev.map(r => r.id !== rid ? r : { ...r, beds: r.beds.map((b,i) => i===bi ? {...b, status} : b) }));
  };
  // Removing a bed card directly (instead of editing Capacity above) drops that one bed, renumbers
  // the rest so labels stay sequential, and syncs Capacity down to match — the two stay in lockstep
  // either way the landlord chooses to resize.
  const [bedToRemove, setBedToRemove] = useState<{ roomId: string; bedIndex: number; label: string } | null>(null);
  const removeBed = (rid: string, bi: number) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== rid) return r;
      const beds = r.beds.filter((_, i) => i !== bi).map((b, i) => ({ ...b, label: `Bed ${i+1}` }));
      return { ...r, beds, cap: String(beds.length) };
    }));
  };
  const setBedPhoto = (rid: string, bi: number, photo: string) => {
    setRooms(prev => prev.map(r => r.id !== rid ? r : { ...r, beds: r.beds.map((b,i) => i===bi ? {...b, photo} : b) }));
  };
  const setRoomPhoto = (rid: string, photo: string) => setRooms(prev => prev.map(r => r.id !== rid ? r : { ...r, roomPhoto: photo }));
  const setCrPhoto = (rid: string, photo: string) => setRooms(prev => prev.map(r => r.id !== rid ? r : { ...r, crPhoto: photo }));

  const addRoomCustomAmenity = (id: string, a: string) => {
    if (!a.trim()) return;
    setRooms(prev => prev.map(r => r.id !== id ? r : { ...r, customAmenities: [...r.customAmenities, a.trim()], amenities: [...r.amenities, a.trim()] }));
  };
  const confirmRoom = (id: string) => setRooms(prev => prev.map(r => r.id === id ? { ...r, confirmed: true } : r));
  const unconfirmRoom = (id: string) => setRooms(prev => prev.map(r => r.id === id ? { ...r, confirmed: false } : r));

  const toggleBhAmenity = (a: string) => setBhAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  const addExtraPayment = () => setExtraPayments(prev => [...prev, { name: "", amount: "", type: "fixed", enabled: true, confirmed: false }]);

  const pwStrength = (pw: string) => {
    if (pw.length === 0) return 0;
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const pwStr = pwStrength(password);
  const pwColors = ["#EF4444","#F97316","#EAB308","#22C55E","#16A34A"];
  const pwLabels = ["Weak","Fair","Good","Strong","Very Strong"];

  const validate1 = () => {
    const e: Record<string,string> = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!contact.trim() || !/^\d{11}$/.test(contact.trim())) e.contact = "Enter a valid 11-digit contact number.";
    if (!sex) e.sex = "Please select your sex.";
    if (!address.trim()) e.address = "Complete address is required.";
    return e;
  };
  const validate2 = () => {
    const e: Record<string,string> = {};
    if (!emailNA && !email.trim()) e.email = "Email is required.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Minimum 6 characters.";
    if (password !== confirmPw) e.confirmPw = "Passwords do not match.";
    return e;
  };
  const validate3 = () => {
    const e: Record<string,string> = {};
    if (!bhName.trim()) e.bhName = "Boarding house name is required.";
    if (bhLat == null || bhLng == null) e.bhLocation = "Please pin your boarding house location.";
    else if (!bhAddress.trim()) e.bhAddress = "Please provide the boarding house address — select an existing map place, or enter it yourself for a custom pin.";
    else if (!bhLocationConfirmed) e.bhLocation = "Please confirm your boarding house location on the map.";
    return e;
  };

  const nextStep = () => {
    let e: Record<string,string> = {};
    if (step === 0) e = validate1();
    if (step === 1) e = validate2();
    if (step === 2) e = validate3();
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(s => s + 1);
  };
  const prevStep = () => { setErrors({}); setStep(s => s - 1); };

  // Boarding house / rooms / beds persistence (the data collected in this
  // same wizard's setup step) lands in a later phase — this creates the real
  // account + landlord profile row so the account itself is genuine.
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const finishSetup = async () => {
    setCreatingAccount(true);
    setSubmitError("");
    const authEmail = emailNA ? `landlord.${contact.trim()}@dormitrack.local` : email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          role: "landlord",
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          sex,
          contact_number: contact.trim(),
          address: address.trim(),
        },
      },
    });
    if (error || !data.user) {
      setCreatingAccount(false);
      setSubmitError(error?.message ?? "Could not create your account. Please try again.");
      return;
    }
    // `username` above (Step 2's read-only field) is only ever shown to the landlord unless it's
    // actually persisted here — checked against every role's usernames (not just other landlords',
    // since a landlord and a parent could easily generate the identical name+initial) before each
    // insert attempt, retrying with a numeric suffix exactly like student signup does for the same
    // first_mi_last collision case.
    let finalUsername = username;
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data: taken } = await supabase.rpc("is_username_taken", { p_username: finalUsername });
      if (taken) { finalUsername = `${username}${attempt + 2}`; continue; }
      const { error: profileError } = await supabase.from("landlords").insert({
        user_id: data.user.id,
        display_name: bhLandlord.trim() || `${firstName.trim()} ${lastName.trim()}`.trim(),
        username: finalUsername,
      });
      if (!profileError) { lastError = null; break; }
      lastError = profileError.message;
      const isUsernameConflict = profileError.code === "23505" && profileError.message.toLowerCase().includes("username");
      if (!isUsernameConflict) break; // a different failure — don't mask it by retrying
      finalUsername = `${username}${attempt + 2}`;
    }
    if (lastError) {
      setCreatingAccount(false);
      setSubmitError(lastError);
      return;
    }

    const bhResult = await createBoardingHouseWithRooms(data.user.id, {
      name: bhName, address: bhAddress, municipality: bhComponents.municipality || "",
      lat: bhLat as number, lng: bhLng as number,
      checkinRadiusMeters: bhRadius,
      description: bhDesc, contactNumber: bhContact,
      amenities: bhAmenities, customAmenities: bhCustomAmenities,
      rulesText: bhRules,
      rent: { enabled: rentEnabled, amount: rentAmt },
      electric: { enabled: electricEnabled, type: electricType, amount: electricAmt },
      water: { enabled: waterEnabled, type: waterType, amount: waterAmt },
      internet: { enabled: internetEnabled, type: internetType, amount: internetAmt },
      extraFees: extraPayments.map(ep => ({ name: ep.name, type: ep.type, amount: ep.amount, enabled: ep.enabled })),
      visitorRecordsEnabled,
      visitorFields: { name: vfName, contact: vfContact, relationship: vfRelationship, purpose: vfPurpose },
      highlightsEnabled,
      stayInfo: { lengthOfStay: allowLengthOfStay, moveIn: allowMoveIn, personality: allowPersonality, hobbies: allowHobbies, lifestyle: allowLifestyle, notes: allowNotes },
      rooms,
      galleryPhotos: galleryImages.map(g => ({ label: g.label.trim() || "Photo", url: g.url })),
    });
    setCreatingAccount(false);
    if ("error" in bhResult) {
      setSubmitError(bhResult.error);
      return;
    }
    go("dashboard");
  };

  const err = (k: string) => errors[k] ? <p style={{ margin:"4px 0 0", fontSize:11, color:"#EF4444", fontFamily:IN }}>{errors[k]}</p> : null;

  const inputStyle = (hasErr = false): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box" as const, padding: "13px 14px",
    borderRadius: 14, border: `1.5px solid ${hasErr ? "#EF4444" : "#E5E7EB"}`,
    background: "#F9FAFB", color: "#1F2937", fontSize: 14, fontFamily: IN, outline: "none",
  });
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 6, display: "block" };
  const fieldStyle: React.CSSProperties = { marginBottom: 16 };
  const sCard = (title: string, sub: string | null, children: React.ReactNode) => (
    <div style={{ background:"white", borderRadius:24, padding:"20px 18px", marginBottom:16, boxShadow:"0 4px 20px rgba(0,0,0,.06)" }}>
      <p style={{ fontSize:13, fontWeight:800, color:"#9772F6", fontFamily:QS, margin:"0 0 4px", letterSpacing:0.2 }}>{title}</p>
      {sub && <p style={{ fontSize:11, color:"#9CA3AF", margin:"0 0 16px" }}>{sub}</p>}
      {!sub && <div style={{ marginBottom:16 }}/>}
      {children}
    </div>
  );

  const BH_AMENITIES = [
    "Wi-Fi","Kitchen","Laundry Area","Parking","CCTV","Water Supply","Electricity","Study Area",
    "Air Conditioned","Electric Fan","Cabinet","Study Table","Own CR","Shared CR","Curfew",
    "Security","Drinking Water","Refrigerator","Cooking Allowed","Visitors Allowed",
  ];
  const ROOM_AMENITIES = ["Air Conditioner","Electric Fan","Single Bed","Double Deck","Study Table","Cabinet","Own CR","Shared CR","Window","Balcony","Wi-Fi","Refrigerator"];

  const STEPS = ["Personal Info","Account","BH Setup","Review"];

  // ── Step progress bar ─────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div style={{ padding:"4px 20px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:0 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", flex: i < STEPS.length-1 ? undefined : undefined }}>
              <div
                onClick={() => i < step && setStep(i)}
                style={{ width:28, height:28, borderRadius:"50%", background: i <= step ? GRAD : "#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", boxShadow: i===step ? "0 2px 10px rgba(151,114,246,.35)" : "none", flexShrink:0, cursor: i < step ? "pointer" : "default", transition:"transform .15s" }}
                onMouseEnter={e => { if (i < step) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}>
                {i < step ? <Check size={13} color="white" strokeWidth={3}/> : <span style={{ fontSize:11, fontWeight:800, color: i<=step ? "white" : "#9CA3AF", fontFamily:QS }}>{i+1}</span>}
              </div>
              <span style={{ fontSize:8, fontWeight:700, color: i<=step ? "#9772F6" : "#9CA3AF", fontFamily:QS, marginTop:3, whiteSpace:"nowrap" as const }}>{s}</span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ flex:1, height:2, background: i < step ? "#9772F6" : "#E5E7EB", marginBottom:14, marginLeft:2, marginRight:2 }}/>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  // ── STEP 1: Personal Information ─────────────────────────────────────────────
  if (step === 0) return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC" }}>
      <div style={{ flexShrink:0, padding:"48px 20px 24px", backgroundImage:GRAD_H, position:"relative" as const }}>
        <button onClick={() => go("roleSelect")} style={{ position:"absolute" as const, top:48, left:16, background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color:"white", fontSize:22, fontWeight:800, margin:"36px 0 6px", fontFamily:QS }}>Create Landlord Account</h1>
        <p style={{ color:"rgba(255,255,255,.75)", fontSize:13, margin:0, lineHeight:1.5 }}>Provide your personal information to continue.</p>
      </div>
      <div style={{ height:16 }} />
      <ProgressBar />
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"0 16px 24px" }}>
        {sCard("Personal Information", null, <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={labelStyle}>First Name <span style={{color:"#EF4444"}}>*</span></label>
              <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Kyla" style={inputStyle(!!errors.firstName)}/>
              {err("firstName")}
            </div>
            <div>
              <label style={labelStyle}>Middle Name</label>
              <input value={middleName} onChange={e=>setMiddleName(e.target.value)} placeholder="Lodripas" style={inputStyle(false)}/>
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Last Name <span style={{color:"#EF4444"}}>*</span></label>
            <input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Naquila" style={inputStyle(!!errors.lastName)}/>
            {err("lastName")}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Sex <span style={{color:"#EF4444"}}>*</span></label>
            <select value={sex} onChange={e=>setSex(e.target.value)} style={{ ...inputStyle(!!errors.sex), color: sex ? "#1F2937" : "#9CA3AF" }}>
              <option value="" disabled hidden>Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {err("sex")}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Contact Number <span style={{color:"#EF4444"}}>*</span></label>
            <div style={{ position:"relative" as const }}>
              <span style={{ position:"absolute" as const, left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#9CA3AF", fontFamily:IN }}>+63</span>
              <input value={contact} onChange={e=>setContact(e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="09XXXXXXX" style={{ ...inputStyle(!!errors.contact), paddingLeft:46 }}/>
            </div>
            {err("contact")}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Complete Address <span style={{color:"#EF4444"}}>*</span></label>
            <textarea value={address} onChange={e=>setAddress(e.target.value)} placeholder="Purok, Barangay, Municipality, Province" rows={3}
              style={{ ...inputStyle(!!errors.address), resize:"none" as const, lineHeight:1.5 }}/>
            {err("address")}
          </div>
        </>)}
        <button onClick={nextStep} style={{ width:"100%", height:52, borderRadius:24, border:"none", background:GRAD, color:"white", fontSize:15, fontWeight:800, fontFamily:QS, cursor:"pointer", boxShadow:"0 8px 24px rgba(151,114,246,.35)" }}>
          Next
        </button>
      </div>
    </div>
  );

  // ── STEP 2: Account Information ──────────────────────────────────────────────
  if (step === 1) return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC" }}>
      <div style={{ flexShrink:0, padding:"48px 20px 24px", backgroundImage:GRAD_H, position:"relative" as const }}>
        <button onClick={prevStep} style={{ position:"absolute" as const, top:48, left:16, background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color:"white", fontSize:22, fontWeight:800, margin:"36px 0 6px", fontFamily:QS }}>Account Information</h1>
        <p style={{ color:"rgba(255,255,255,.75)", fontSize:13, margin:0 }}>Set up your login credentials.</p>
      </div>
      <div style={{ height:16 }} />
      <ProgressBar />
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"0 16px 24px" }}>
        {sCard("Account Details", null, <>
          <div style={fieldStyle}>
            <label style={labelStyle}>Username</label>
            <div style={{ position:"relative" as const }}>
              <input value={username || "—"} readOnly
                style={{ ...inputStyle(false), background:"#F3F4F6", color: username ? "#9772F6" : "#9CA3AF", fontWeight: username ? 700 : 400, cursor:"default", paddingRight:54 }}/>
              <div style={{ position:"absolute" as const, right:12, top:"50%", transform:"translateY(-50%)", background:"#F0E6FF", borderRadius:8, padding:"3px 8px" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#9772F6", fontFamily:QS }}>AUTO</span>
              </div>
            </div>
            <p style={{ fontSize:11, color:"#9CA3AF", margin:"4px 0 0", fontFamily:IN }}>Generated from your name — updates as you type.</p>
          </div>
          <div style={fieldStyle}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <label style={{ ...labelStyle, marginBottom:0 }}>Email Address {!emailNA && <span style={{color:"#EF4444"}}>*</span>}</label>
              <button onClick={()=>{ setEmailNA(!emailNA); if(!emailNA) setEmail(""); }}
                style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", padding:0 }}>
                <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${emailNA ? "#9772F6" : "#D1D5DB"}`, background: emailNA ? GRAD : "white", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {emailNA && <div style={{ width:6, height:6, borderRadius:"50%", background:"white" }}/>}
                </div>
                <span style={{ fontSize:11, color: emailNA ? "#9772F6" : "#9CA3AF", fontWeight:700, fontFamily:QS }}>Not Applicable</span>
              </button>
            </div>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="kylanaquila@gmail.com" disabled={emailNA} autoComplete="off"
              style={{ ...inputStyle(!!errors.email), opacity: emailNA ? 0.5 : 1, cursor: emailNA ? "not-allowed" : "text" }}/>
            {err("email")}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Password <span style={{color:"#EF4444"}}>*</span></label>
            <div style={{ position:"relative" as const }}>
              <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password"
                style={{ ...inputStyle(!!errors.password), paddingRight:44 }}/>
              <button onClick={()=>setShowPw(!showPw)} style={{ position:"absolute" as const, right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:4 }}>
                {showPw ? <EyeOff size={18} color="#9CA3AF"/> : <Eye size={18} color="#9CA3AF"/>}
              </button>
            </div>
            {err("password")}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Confirm Password <span style={{color:"#EF4444"}}>*</span></label>
            <div style={{ position:"relative" as const }}>
              <input type={showCpw?"text":"password"} value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Re-enter password" autoComplete="new-password"
                style={{ ...inputStyle(!!errors.confirmPw), paddingRight:44 }}/>
              <button onClick={()=>setShowCpw(!showCpw)} style={{ position:"absolute" as const, right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:4 }}>
                {showCpw ? <EyeOff size={18} color="#9CA3AF"/> : <Eye size={18} color="#9CA3AF"/>}
              </button>
            </div>
            {confirmPw && password !== confirmPw && <p style={{ margin:"4px 0 0", fontSize:11, color:"#EF4444", fontFamily:IN }}>Passwords do not match.</p>}
            {confirmPw && password === confirmPw && <p style={{ margin:"4px 0 0", fontSize:11, color:"#16A34A", fontFamily:IN, display:"flex", alignItems:"center", gap:4 }}><Check size={11}/> Passwords match.</p>}
            {err("confirmPw")}
          </div>
        </>)}
        <button onClick={nextStep} style={{ width:"100%", height:52, borderRadius:24, border:"none", background:GRAD, color:"white", fontSize:14, fontWeight:800, fontFamily:QS, cursor:"pointer", boxShadow:"0 8px 24px rgba(151,114,246,.35)" }}>Create Account</button>
      </div>
    </div>
  );

  // ── STEP 3: Boarding House Setup ─────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC" }}>
      <div style={{ flexShrink:0, padding:"48px 20px 24px", backgroundImage:GRAD_H, position:"relative" as const }}>
        <button onClick={prevStep} style={{ position:"absolute" as const, top:48, left:16, background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color:"white", fontSize:21, fontWeight:800, margin:"36px 0 4px", fontFamily:QS }}>Let's Set Up Your Boarding House</h1>
        <p style={{ color:"rgba(255,255,255,.75)", fontSize:12, margin:0, lineHeight:1.5 }}>Complete your boarding house information so students can discover and reserve available rooms.</p>
      </div>
      <div style={{ height:16 }} />
      <ProgressBar />
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"0 16px 24px" }}>

        {/* A: Basic Info */}
        {sCard("Boarding House Information", null, <>
          <div style={fieldStyle}>
            <label style={labelStyle}>Boarding House Name <span style={{color:"#EF4444"}}>*</span></label>
            <input value={bhName} onChange={e=>setBhName(e.target.value)} placeholder="e.g. Naquila Boarding House" style={inputStyle(!!errors.bhName)}/>
            {err("bhName")}
          </div>

          {/* Interactive map-based location picker — the pin is the source of truth.
              An existing map place's address is used exactly as the place provider returns it
              (never reverse-geocoded); a custom pin's address is typed by the landlord themselves
              inside the picker. The read-only field below just mirrors whichever of those applies. */}
          <BoardingHouseLocationPicker
            lat={bhLat}
            lng={bhLng}
            address={bhAddress}
            locationType={bhLocationType}
            placeName={bhPlaceName}
            placeId={bhPlaceId}
            confirmed={bhLocationConfirmed}
            onConfirmedChange={setBhLocationConfirmed}
            hasError={!!errors.bhLocation}
            onLocationChange={(r)=>{ setBhLat(r.lat); setBhLng(r.lng); setBhAddress(r.address); setBhComponents(r.components); setBhLocationType(r.locationType); setBhPlaceName(r.placeName); setBhPlaceId(r.placeId); }}
            radiusMeters={bhRadius}
            onRadiusChange={setBhRadius}
          />
          {err("bhLocation")}

          <div style={fieldStyle}>
            <label style={labelStyle}>Boarding House Address <span style={{color:"#EF4444"}}>*</span></label>
            <textarea
              value={bhAddress}
              onChange={e=>setBhAddress(e.target.value)}
              placeholder="Select a location on the map above, then refine the address here if needed."
              rows={2}
              style={{ ...inputStyle(!!errors.bhAddress), resize:"none" as const, lineHeight:1.5 }}
            />
            <p style={{ margin:"4px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>
              Auto-filled from the map location selected above — feel free to edit it to be more specific.
            </p>
            {err("bhAddress")}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Landlord Name</label>
            <input value={bhLandlord} onChange={e=>setBhLandlord(e.target.value)} placeholder="Auto-populated from your name" style={inputStyle(false)}/>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Boarding House Contact Number</label>
            <div style={{ position:"relative" as const }}>
              <span style={{ position:"absolute" as const, left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#9CA3AF", fontFamily:IN }}>+63</span>
              <input value={bhContact} onChange={e=>setBhContact(e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="09XXXXXXXXX" style={{ ...inputStyle(false), paddingLeft:46 }}/>
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Short Description</label>
            <textarea value={bhDesc} onChange={e=>setBhDesc(e.target.value)} rows={3} placeholder="Describe your boarding house, nearby establishments, and what makes it suitable for students."
              style={{ ...inputStyle(false), resize:"none" as const, lineHeight:1.5 }}/>
          </div>
        </>)}

        {/* F: Gallery — moved above amenities */}
        {sCard("Boarding House Gallery", "Upload photos of your boarding house.", <>
          <label style={{ borderRadius:16, border:"2px dashed #DDD6FE", background:"#FAFAFE", padding:"24px 16px", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:10, marginBottom:14, cursor:"pointer" }}>
            <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e=>{ addGalleryImages(e.target.files); e.target.value=""; }}/>
            <div style={{ width:48, height:48, borderRadius:16, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Camera size={22} color="#9772F6"/>
            </div>
            <p style={{ fontSize:13, fontWeight:700, color:"#9772F6", margin:0, fontFamily:QS }}>Upload Photos</p>
            <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>Drag & drop or tap to upload</p>
          </label>

          {/* Freeform uploads from the dropzone above — each needs its own name since nothing
              picks a label for them automatically. */}
          {galleryImages.filter(g => !GALLERY_PRESET_LABELS.includes(g.label)).map(g => (
            <div key={g.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"#F9FAFB", marginBottom:8 }}>
              <img src={g.url} style={{ width:40, height:40, borderRadius:10, objectFit:"cover" as const, flexShrink:0 }} alt="Boarding house"/>
              <input
                value={g.label}
                onChange={e=>updateGalleryLabel(g.id, e.target.value)}
                placeholder="Name this photo (e.g. Exterior, Kitchen...)"
                style={{ flex:1, padding:"7px 10px", borderRadius:8, border:"1.5px solid #E5E7EB", background:"white", color:"#1F2937", fontSize:12, fontFamily:IN, outline:"none" }}
              />
              <button onClick={()=>removeGalleryImage(g.id)} style={{ width:26, height:26, borderRadius:8, border:"none", background:"#FEE2E2", color:"#EF4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <X size={13}/>
              </button>
            </div>
          ))}

          {/* Suggested categories — one-tap upload, pre-labeled with the category itself. */}
          {GALLERY_PRESET_LABELS.map(lbl => {
            const existing = galleryImages.find(g => g.label === lbl);
            return (
              <div key={lbl} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, background:"#F9FAFB", marginBottom:8 }}>
                <div style={{ width:40, height:40, borderRadius:10, overflow:"hidden", background:"#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {existing ? <img src={existing.url} style={{ width:"100%", height:"100%", objectFit:"cover" as const }} alt={lbl}/> : <Camera size={16} color="#9CA3AF"/>}
                </div>
                <span style={{ flex:1, fontSize:12, color:"#6B7280", fontFamily:QS }}>{lbl}</span>
                <label style={{ padding:"4px 10px", borderRadius:8, border:"1.5px solid #DDD6FE", background:"white", color:"#9772F6", fontSize:11, fontWeight:700, fontFamily:QS, cursor:"pointer" }}>
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ addGalleryImages(e.target.files, lbl); e.target.value=""; }}/>
                  {existing ? "Change" : "+ Add"}
                </label>
                {existing && (
                  <button onClick={()=>removeGalleryImage(existing.id)} style={{ width:22, height:22, borderRadius:7, border:"none", background:"#FEE2E2", color:"#EF4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <X size={11}/>
                  </button>
                )}
              </div>
            );
          })}
        </>)}

        {/* B: Amenities */}
        {sCard("Boarding House Amenities", "Select all amenities available in your boarding house.", <>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8, marginBottom:12 }}>
            {[...BH_AMENITIES, ...bhCustomAmenities].map(a => {
              const on = bhAmenities.includes(a);
              return (
                <button key={a} onClick={()=>toggleBhAmenity(a)}
                  style={{ padding:"7px 13px", borderRadius:12, border:`1.5px solid ${on?"#9772F6":"#E5E7EB"}`, background: on ? "#F5F0FF" : "white", color: on ? "#9772F6" : "#6B7280", fontSize:12, fontWeight:700, fontFamily:QS, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
                  {on && <Check size={11}/>}{a}
                </button>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={customAmenity} onChange={e=>setCustomAmenity(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter" && customAmenity.trim()){ setBhCustomAmenities(p=>[...p,customAmenity.trim()]); toggleBhAmenity(customAmenity.trim()); setCustomAmenity(""); }}}
              placeholder="Add custom amenity..." style={{ ...inputStyle(false), flex:1, fontSize:12 }}/>
            <button onClick={()=>{ if(!customAmenity.trim()) return; setBhCustomAmenities(p=>[...p,customAmenity.trim()]); toggleBhAmenity(customAmenity.trim()); setCustomAmenity(""); }}
              style={{ padding:"0 16px", borderRadius:14, border:"none", background:GRAD, color:"white", fontSize:12, fontWeight:800, fontFamily:QS, cursor:"pointer", flexShrink:0 }}>
              Add
            </button>
          </div>
        </>)}

        {/* D: Room Setup */}
        {sCard("Room Setup", "Add each room in your boarding house.", <>
          {rooms.map((r, ri) => (
            <div key={r.id} style={{ borderRadius:16, border:"1.5px solid #E5E7EB", background:"#F9FAFB", padding:14, marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:800, color:"#7549F6", fontFamily:QS }}>Room {ri+1}</span>
                <button onClick={()=>removeRoom(r.id)} style={{ width:28, height:28, borderRadius:8, border:"none", background:"#FEE2E2", color:"#EF4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={14}/>
                </button>
              </div>
              {r.confirmed ? (
                /* ── Confirmed summary view ── */
                <div style={{ pointerEvents:"none" as const, opacity:0.75 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#1F2937", margin:"0 0 4px", fontFamily:QS }}>{r.name || "Unnamed Room"}</p>
                  <p style={{ fontSize:11, color:"#6B7280", margin:"0 0 8px" }}>{r.desc}</p>
                  <p style={{ fontSize:11, color:"#9CA3AF", margin:0 }}>{r.beds.length} bed{r.beds.length!==1?"s":""} · {r.amenities.slice(0,3).join(", ")}{r.amenities.length>3?` +${r.amenities.length-3} more`:""}</p>
                </div>
              ) : (
                <>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Room Name</label>
                    <input value={r.name} onChange={e=>updateRoom(r.id,"name",e.target.value)} placeholder="Room A" style={inputStyle(false)}/>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Short Description</label>
                    <textarea value={r.desc} onChange={e=>updateRoom(r.id,"desc",e.target.value)} rows={2} placeholder="e.g. Ground floor, near entrance" style={{ ...inputStyle(false), resize:"none" as const }}/>
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Capacity</label>
                    <input type="number" min="1" value={r.cap} onChange={e=>updateRoomCap(r.id, e.target.value)} placeholder="0" style={inputStyle(false)}/>
                  </div>

                  {/* Room photo */}
                  <label style={{ ...labelStyle, marginBottom:8 }}>Room Photo</label>
                  <label style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, border:"1.5px dashed #DDD6FE", background:"#FAFAFE", cursor:"pointer", marginBottom:16 }}>
                    <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ const u=URL.createObjectURL(f); setRoomPhoto(r.id,u); }}}/>
                    {r.roomPhoto
                      ? <img src={r.roomPhoto} style={{ width:48, height:48, borderRadius:8, objectFit:"cover" as const }} alt="room"/>
                      : <div style={{ width:48, height:48, borderRadius:8, background:"#EDE9FE", display:"flex", alignItems:"center", justifyContent:"center" }}><Camera size={18} color="#9772F6"/></div>}
                    <span style={{ fontSize:12, fontWeight:700, color:"#9772F6", fontFamily:QS }}>{r.roomPhoto ? "Change Room Photo" : "Upload Room Photo"}</span>
                  </label>

                  {/* CR photo — only if Own CR is selected */}
                  {r.amenities.includes("Own CR") && (<>
                    <label style={{ ...labelStyle, marginBottom:8 }}>CR / Comfort Room Photo</label>
                    <label style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, border:"1.5px dashed #DDD6FE", background:"#FAFAFE", cursor:"pointer", marginBottom:16 }}>
                      <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ const u=URL.createObjectURL(f); setCrPhoto(r.id,u); }}}/>
                      {r.crPhoto
                        ? <img src={r.crPhoto} style={{ width:48, height:48, borderRadius:8, objectFit:"cover" as const }} alt="cr"/>
                        : <div style={{ width:48, height:48, borderRadius:8, background:"#EDE9FE", display:"flex", alignItems:"center", justifyContent:"center" }}><Camera size={18} color="#9772F6"/></div>}
                      <span style={{ fontSize:12, fontWeight:700, color:"#9772F6", fontFamily:QS }}>{r.crPhoto ? "Change CR Photo" : "Upload CR Photo"}</span>
                    </label>
                  </>)}

                  {/* Room amenities */}
                  <label style={{ ...labelStyle, marginBottom:8 }}>Room Amenities</label>
                  <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, marginBottom:10 }}>
                    {[...ROOM_AMENITIES, ...(r.customAmenities || [])].map(a => {
                      const on = r.amenities.includes(a);
                      return <button key={a} onClick={()=>toggleRoomAmenity(r.id, a)} style={{ padding:"5px 10px", borderRadius:10, border:`1.5px solid ${on?"#9772F6":"#E5E7EB"}`, background: on?"#F5F0FF":"white", color: on?"#9772F6":"#6B7280", fontSize:11, fontWeight:700, fontFamily:QS, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>{on && <Check size={10}/>}{a}</button>;
                    })}
                  </div>
                  <div style={{ display:"flex", gap:6, marginBottom:16 }}>
                    <input value={roomCustomInput[r.id]||""} onChange={e=>setRoomCustomInput(p=>({...p,[r.id]:e.target.value}))}
                      onKeyDown={e=>{ if(e.key==="Enter"){ addRoomCustomAmenity(r.id, roomCustomInput[r.id]||""); setRoomCustomInput(p=>({...p,[r.id]:""})); }}}
                      placeholder="Add custom amenity..." style={{ ...inputStyle(false), flex:1, fontSize:11 }}/>
                    <button onClick={()=>{ addRoomCustomAmenity(r.id, roomCustomInput[r.id]||""); setRoomCustomInput(p=>({...p,[r.id]:""})); }}
                      style={{ padding:"0 12px", borderRadius:12, border:"none", background:GRAD, color:"white", fontSize:11, fontWeight:800, fontFamily:QS, cursor:"pointer", flexShrink:0 }}>Add</button>
                  </div>

                  {/* Beds */}
                  {r.beds.length > 0 && (<>
                    <label style={{ ...labelStyle, marginBottom:8 }}>Bed Setup</label>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:10, marginBottom:4 }}>
                      {r.beds.map((bed, bi) => {
                        const col = bed.status==="available" ? "#16A34A" : bed.status==="occupied" ? "#EF4444" : "#D97706";
                        return (
                          <div key={bi} style={{ borderRadius:12, border:`1.5px solid ${col}`, background:"white", padding:12 }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                              <p style={{ fontSize:12, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>{bed.label}</p>
                              <button onClick={()=>setBedToRemove({ roomId:r.id, bedIndex:bi, label:bed.label })} title="Remove this bed"
                                style={{ width:24, height:24, borderRadius:8, border:"none", background:"#FEE2E2", color:"#EF4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <X size={13}/>
                              </button>
                            </div>
                            {/* Status buttons */}
                            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                              {(["available","occupied"] as const).map(s => {
                                const sc = s==="available" ? "#16A34A" : "#EF4444";
                                const sb = s==="available" ? "#DCFCE7" : "#FEE2E2";
                                const on = bed.status === s;
                                return <button key={s} onClick={()=>setBedStatus(r.id,bi,s)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:`1.5px solid ${on?sc:"#E5E7EB"}`, background: on?sb:"white", color: on?sc:"#9CA3AF", fontSize:10, fontWeight:800, fontFamily:QS, cursor:"pointer", textTransform:"capitalize" as const }}>{s}</button>;
                              })}
                            </div>
                            {/* Bed photo */}
                            <label style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10, border:"1.5px dashed #DDD6FE", background:"#FAFAFE", cursor:"pointer" }}>
                              <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ const u=URL.createObjectURL(f); setBedPhoto(r.id,bi,u); }}}/>
                              {bed.photo
                                ? <img src={bed.photo} style={{ width:36, height:36, borderRadius:6, objectFit:"cover" as const }} alt={bed.label}/>
                                : <div style={{ width:36, height:36, borderRadius:6, background:"#EDE9FE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Camera size={14} color="#9772F6"/></div>}
                              <span style={{ fontSize:11, fontWeight:700, color:"#9772F6", fontFamily:QS }}>{bed.photo ? "Change bed photo" : "Upload bed photo"}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </>)}
                </>
              )}
              {/* Confirm / Edit */}
              {r.confirmed ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:12, background:"#DCFCE7", marginTop:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <Check size={15} color="#16A34A" strokeWidth={3}/>
                    <span style={{ fontSize:12, fontWeight:700, color:"#16A34A", fontFamily:QS }}>Room confirmed</span>
                  </div>
                  <button onClick={()=>unconfirmRoom(r.id)} style={{ background:"none", border:"none", color:"#9772F6", fontSize:11, fontFamily:QS, cursor:"pointer", fontWeight:700 }}>Edit</button>
                </div>
              ) : (
                <button onClick={()=>confirmRoom(r.id)} style={{ width:"100%", marginTop:10, padding:"11px 0", borderRadius:12, border:"none", background:GRAD, color:"white", fontSize:12, fontWeight:800, fontFamily:QS, cursor:"pointer" }}>
                  Confirm Room Setup
                </button>
              )}
            </div>
          ))}
          <button onClick={addRoom} style={{ width:"100%", padding:"13px 0", borderRadius:14, border:"2px solid #DDD6FE", background:"#FAFAFE", color:"#9772F6", fontSize:13, fontWeight:800, fontFamily:QS, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Plus size={16} color="#9772F6"/>Add Room
          </button>
        </>)}

        {/* C: Statistics — auto-calculated from Room Setup */}
        {(() => {
          const totalRooms = rooms.length;
          const totalCap = rooms.reduce((s,r)=>s+r.beds.length,0);
          const totalOcc = rooms.reduce((s,r)=>s+r.beds.filter(b=>b.status==="occupied").length,0);
          const avail = totalCap - totalOcc;
          const stats = [
            { label:"Total Rooms", value: totalRooms },
            { label:"Total Capacity", value: totalCap },
            { label:"Occupied", value: totalOcc },
          ];
          return sCard("Boarding House Statistics", "Auto-calculated from your room setup.", <>
            {stats.map(s=>(
              <div key={s.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", borderRadius:14, background:"#F9FAFB", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#374151", fontFamily:QS }}>{s.label}</span>
                <span style={{ fontSize:15, fontWeight:800, color:"#7549F6", fontFamily:QS }}>{s.value}</span>
              </div>
            ))}
            <div style={{ padding:"11px 14px", borderRadius:14, background:"#F5F0FF", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#7C3AED", fontFamily:QS }}>Available Slots</span>
              <span style={{ fontSize:15, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{avail < 0 ? 0 : avail}</span>
            </div>
          </>);
        })()}

        {/* D1: Highlights & Schedule */}
        {sCard("Highlights & Schedule", "Enable the Highlights & Schedule section on your Home Dashboard to track reminders, events, and activities.", (() => {
          const Toggle = ({ on, onToggle }: { on: boolean; onToggle: ()=>void }) => (
            <div onClick={onToggle} style={{ width:44, height:24, borderRadius:12, background: on ? undefined : "#D1D5DB", backgroundImage: on ? GRAD : undefined, flexShrink:0, position:"relative" as const, cursor:"pointer", transition:"background .2s" }}>
              <div style={{ position:"absolute" as const, top:3, left: on ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"white", boxShadow:"0 1px 4px rgba(0,0,0,.2)", transition:"left .2s" }}/>
            </div>
          );
          return (
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"13px 14px", borderRadius:14, background: highlightsEnabled ? "#F5F0FF" : "#F9FAFB", border: highlightsEnabled ? "1.5px solid #E9D5FF" : "1.5px solid transparent" }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:800, color:"#1F2937", margin:"0 0 3px", fontFamily:QS }}>Enable Highlights & Schedule</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:"0 0 6px", lineHeight:1.45 }}>
                  Track reminders, events, and boarding house schedules directly on your Home Dashboard.
                </p>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, background: highlightsEnabled ? "#DCFCE7" : "#F3F4F6", fontSize:10, fontWeight:800, color: highlightsEnabled ? "#16A34A" : "#9CA3AF", fontFamily:QS }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background: highlightsEnabled ? "#16A34A" : "#9CA3AF", display:"inline-block" }}/>
                  {highlightsEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <Toggle on={highlightsEnabled} onToggle={()=>setHighlightsEnabled(!highlightsEnabled)}/>
            </div>
          );
        })())}

        {/* D2: Visitor Records Settings */}
        {(() => {
          const Toggle = ({ on, onToggle }: { on: boolean; onToggle: ()=>void }) => (
            <div onClick={onToggle} style={{ width:44, height:24, borderRadius:12, background: on ? undefined : "#D1D5DB", backgroundImage: on ? GRAD : undefined, flexShrink:0, position:"relative" as const, cursor:"pointer", transition:"background .2s" }}>
              <div style={{ position:"absolute" as const, top:3, left: on ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"white", boxShadow:"0 1px 4px rgba(0,0,0,.2)", transition:"left .2s" }}/>
            </div>
          );
          const Row = ({ title, desc, on, onToggle, disabled }: { title: string; desc: string; on: boolean; onToggle: ()=>void; disabled?: boolean }) => (
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"13px 14px", borderRadius:14, background: disabled ? "#FAFAFA" : "#F9FAFB", marginBottom:8, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : "auto" }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#1F2937", margin:"0 0 3px", fontFamily:QS }}>{title}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0, lineHeight:1.45 }}>{desc}</p>
              </div>
              <Toggle on={on} onToggle={onToggle}/>
            </div>
          );
          return sCard("Visitor Records", "Allow students to submit visitor records. Configure which fields to collect.", <>
            {/* Main enable toggle */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"13px 14px", borderRadius:14, background: visitorRecordsEnabled ? "#FCE7F3" : "#F9FAFB", marginBottom: visitorRecordsEnabled ? 14 : 8, border: visitorRecordsEnabled ? "1.5px solid #FBCFE8" : "1.5px solid transparent" }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:800, color:"#1F2937", margin:"0 0 3px", fontFamily:QS }}>Enable Visitor Records</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0, lineHeight:1.45 }}>Students can log visitors. A Visitor Log card appears on your Home Dashboard.</p>
              </div>
              <Toggle on={visitorRecordsEnabled} onToggle={()=>setVisitorRecordsEnabled(!visitorRecordsEnabled)}/>
            </div>
            {/* Per-field toggles */}
            {visitorRecordsEnabled && <>
              <p style={{ fontSize:11, fontWeight:800, color:"#9772F6", fontFamily:QS, margin:"0 0 8px", letterSpacing:0.2 }}>FIELDS TO COLLECT</p>
              <Row title="Visitor Name"     desc="Full name of the visitor."                     on={vfName}         onToggle={()=>setVfName(!vfName)}/>
              <Row title="Contact Number"   desc="Mobile number of the visitor."                 on={vfContact}      onToggle={()=>setVfContact(!vfContact)}/>
              <Row title="Relationship"     desc="Visitor's relation to the student."             on={vfRelationship} onToggle={()=>setVfRelationship(!vfRelationship)}/>
              <Row title="Purpose of Visit" desc="Reason the visitor is coming."                  on={vfPurpose}      onToggle={()=>setVfPurpose(!vfPurpose)}/>
            </>}
          </>);
        })()}

        {/* E: Stay Info Settings */}
        {(() => {
          const Toggle = ({ on, onToggle }: { on: boolean; onToggle: ()=>void }) => (
            <div onClick={onToggle} style={{ width:44, height:24, borderRadius:12, background: on ? undefined : "#D1D5DB", backgroundImage: on ? GRAD : undefined, flexShrink:0, position:"relative" as const, cursor:"pointer", transition:"background .2s" }}>
              <div style={{ position:"absolute" as const, top:3, left: on ? 23 : 3, width:18, height:18, borderRadius:"50%", background:"white", boxShadow:"0 1px 4px rgba(0,0,0,.2)", transition:"left .2s" }}/>
            </div>
          );
          const Row = ({ title, desc, on, onToggle }: { title: string; desc: string; on: boolean; onToggle: ()=>void }) => (
            <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"13px 14px", borderRadius:14, background:"#F9FAFB", marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:13, fontWeight:700, color:"#1F2937", margin:"0 0 3px", fontFamily:QS }}>{title}</p>
                <p style={{ fontSize:11, color:"#9CA3AF", margin:0, lineHeight:1.45 }}>{desc}</p>
              </div>
              <Toggle on={on} onToggle={onToggle}/>
            </div>
          );
          return sCard("Student Stay Information", "Choose which information students must fill in when registering.", <>
            <Row title="Length of Stay" desc="How long the student plans to stay (weeks or months)." on={allowLengthOfStay} onToggle={()=>setAllowLengthOfStay(!allowLengthOfStay)}/>
            <Row title="Move-In Information" desc="Preferred move-in date and expected move-out date." on={allowMoveIn} onToggle={()=>setAllowMoveIn(!allowMoveIn)}/>
            <p style={{ fontSize:11, fontWeight:800, color:"#9772F6", fontFamily:QS, margin:"12px 0 8px", letterSpacing:0.2 }}>ABOUT THE STUDENT</p>
            <Row title="Personality Traits" desc="Student's self-described personality (e.g. studious, sociable)." on={allowPersonality} onToggle={()=>setAllowPersonality(!allowPersonality)}/>
            <Row title="Hobbies & Interests" desc="What the student enjoys doing in their free time." on={allowHobbies} onToggle={()=>setAllowHobbies(!allowHobbies)}/>
            <Row title="Lifestyle" desc="Daily habits and preferences (e.g. early riser, quiet hours)." on={allowLifestyle} onToggle={()=>setAllowLifestyle(!allowLifestyle)}/>
            <Row title="Additional Notes" desc="Any extra information the student wants the landlord to know." on={allowNotes} onToggle={()=>setAllowNotes(!allowNotes)}/>
          </>);
        })()}

        {/* H: Rules */}
        {sCard("Boarding House Rules", null, <>
          <textarea value={bhRules} onChange={e=>setBhRules(e.target.value)} rows={5}
            placeholder={"Enter the rules that students must follow:\n• No smoking\n• Observe curfew\n• Keep rooms clean\n• Respect fellow tenants"}
            style={{ ...inputStyle(false), resize:"none" as const, lineHeight:1.6 }}/>
        </>)}

        {/* I: Payment Setup */}
        {sCard("Payment Setup", "Configure monthly fees for students.", <>
            {/* Monthly Rent */}
            <div style={{ borderRadius:14, border:"1.5px solid #F3F4F6", overflow:"hidden", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"white" }}>
                <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Monthly Rent</span>
                <PaymentToggle on={rentEnabled} onToggle={()=>setRentEnabled(!rentEnabled)}/>
              </div>
              {rentEnabled && <div style={{ padding:"0 14px 14px", background:"#FAFAFA" }}><PaymentAmtInput value={rentAmt} onChange={setRentAmt} placeholder="2500"/></div>}
            </div>

            {/* Electrical Bill */}
            <div style={{ borderRadius:14, border:"1.5px solid #F3F4F6", overflow:"hidden", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"white" }}>
                <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Electrical Bill</span>
                <PaymentToggle on={electricEnabled} onToggle={()=>setElectricEnabled(!electricEnabled)}/>
              </div>
              {electricEnabled && (
                <div style={{ padding:"0 14px 14px", background:"#FAFAFA" }}>
                  <PaymentTypePicker type={electricType} setType={v=>setElectricType(v as "fixed"|"metered")}/>
                  {electricType==="fixed" && <PaymentAmtInput value={electricAmt} onChange={setElectricAmt}/>}
                  {electricType==="metered" && <p style={{ fontSize:11, color:"#9CA3AF", margin:"8px 0 0", fontFamily:IN }}>Metered — billed based on actual consumption.</p>}
                </div>
              )}
            </div>

            {/* Water Bill */}
            <div style={{ borderRadius:14, border:"1.5px solid #F3F4F6", overflow:"hidden", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"white" }}>
                <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Water Bill</span>
                <PaymentToggle on={waterEnabled} onToggle={()=>setWaterEnabled(!waterEnabled)}/>
              </div>
              {waterEnabled && (
                <div style={{ padding:"0 14px 14px", background:"#FAFAFA" }}>
                  <PaymentTypePicker type={waterType} setType={v=>setWaterType(v as "fixed"|"metered")}/>
                  {waterType==="fixed" && <PaymentAmtInput value={waterAmt} onChange={setWaterAmt}/>}
                  {waterType==="metered" && <p style={{ fontSize:11, color:"#9CA3AF", margin:"8px 0 0", fontFamily:IN }}>Metered — billed based on actual consumption.</p>}
                </div>
              )}
            </div>

            {/* Internet Fee */}
            <div style={{ borderRadius:14, border:"1.5px solid #F3F4F6", overflow:"hidden", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"white" }}>
                <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Internet Fee</span>
                <PaymentToggle on={internetEnabled} onToggle={()=>setInternetEnabled(!internetEnabled)}/>
              </div>
              {internetEnabled && (
                <div style={{ padding:"0 14px 14px", background:"#FAFAFA" }}>
                  <PaymentTypePicker type={internetType} setType={v=>setInternetType(v as "fixed"|"metered")}/>
                  {internetType==="fixed" && <PaymentAmtInput value={internetAmt} onChange={setInternetAmt} placeholder="300"/>}
                  {internetType==="metered" && <p style={{ fontSize:11, color:"#9CA3AF", margin:"8px 0 0", fontFamily:IN }}>Metered — billed based on actual consumption.</p>}
                </div>
              )}
            </div>

            {/* Custom payments */}
            {extraPayments.map((ep, i) => (
              <div key={i} style={{ borderRadius:14, border:"1.5px solid #F3F4F6", overflow:"hidden", marginBottom:12 }}>
                {ep.confirmed ? (
                  /* confirmed state — header with toggle + name */
                  <>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"white" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{ep.name || "Custom Payment"}</span>
                        <button onClick={()=>setExtraPayments(prev=>prev.map((x,j)=>j===i?{...x,confirmed:false}:x))} style={{ fontSize:10, color:"#9772F6", background:"#F5F0FF", border:"none", borderRadius:6, padding:"2px 7px", fontFamily:QS, fontWeight:700, cursor:"pointer" }}>Edit</button>
                      </div>
                      <PaymentToggle on={ep.enabled} onToggle={()=>setExtraPayments(prev=>prev.map((x,j)=>j===i?{...x,enabled:!x.enabled}:x))}/>
                    </div>
                    {ep.enabled && (
                      <div style={{ padding:"0 14px 12px", background:"#FAFAFA" }}>
                        <p style={{ fontSize:11, color:"#6B7280", margin:"0 0 4px", fontFamily:IN }}>
                          {ep.type==="fixed" ? `Fixed Rate` : "Meter-Based"}
                          {ep.type==="fixed" && ep.amount ? ` · ₱${ep.amount}` : ""}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  /* editing state */
                  <div style={{ padding:"12px 14px", background:"white" }}>
                    <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                      <input value={ep.name} onChange={e=>setExtraPayments(prev=>prev.map((x,j)=>j===i?{...x,name:e.target.value}:x))} placeholder="Payment Name" style={{ ...inputStyle(false), flex:1 }}/>
                      <button onClick={()=>setExtraPayments(prev=>prev.filter((_,j)=>j!==i))} style={{ width:42, height:48, borderRadius:12, border:"none", background:"#FEE2E2", color:"#EF4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <X size={14}/>
                      </button>
                    </div>
                    <PaymentTypePicker type={ep.type} setType={v=>setExtraPayments(prev=>prev.map((x,j)=>j===i?{...x,type:v as "fixed"|"metered"}:x))}/>
                    {ep.type==="fixed" && (
                      <PaymentAmtInput value={ep.amount} onChange={v=>setExtraPayments(prev=>prev.map((x,j)=>j===i?{...x,amount:v}:x))} placeholder="0"/>
                    )}
                    {ep.type==="metered" && <p style={{ fontSize:11, color:"#9CA3AF", margin:"8px 0 0", fontFamily:IN }}>Metered — billed based on actual consumption.</p>}
                    <button onClick={()=>setExtraPayments(prev=>prev.map((x,j)=>j===i?{...x,confirmed:true}:x))}
                      style={{ width:"100%", marginTop:12, padding:"11px 0", borderRadius:12, border:"none", background:GRAD, color:"white", fontSize:12, fontWeight:800, fontFamily:QS, cursor:"pointer" }}>
                      Confirm Payment
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button onClick={addExtraPayment} style={{ width:"100%", padding:"12px 0", borderRadius:14, border:"2px solid #DDD6FE", background:"#FAFAFE", color:"#9772F6", fontSize:13, fontWeight:800, fontFamily:QS, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Plus size={16} color="#9772F6"/>Add Custom Payment
            </button>
          </>)}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={prevStep} style={{ flex:1, height:52, borderRadius:24, border:"2px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:14, fontWeight:800, fontFamily:QS, cursor:"pointer" }}>Back</button>
          <button onClick={nextStep} style={{ flex:2, height:52, borderRadius:24, border:"none", background:GRAD, color:"white", fontSize:14, fontWeight:800, fontFamily:QS, cursor:"pointer", boxShadow:"0 8px 24px rgba(151,114,246,.35)" }}>Review & Confirm</button>
        </div>
      </div>
      {bedToRemove && (
        <ConfirmDialog
          title="Remove Bed?"
          msg={`Are you sure you want to remove ${bedToRemove.label}? This will lower the room's capacity by one and cannot be undone.`}
          confirmLabel="Remove"
          onConfirm={()=>{ removeBed(bedToRemove.roomId, bedToRemove.bedIndex); setBedToRemove(null); }}
          onCancel={()=>setBedToRemove(null)}
        />
      )}
    </div>
  );

  // ── STEP 4: Review & Confirm ──────────────────────────────────────────────────
  const rvRow = (label: string, value: string) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F3F4F6" }}>
      <span style={{ fontSize:12, color:"#6B7280", fontFamily:"'Inter',sans-serif" }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS, textAlign:"right" as const, maxWidth:"55%" }}>{value || "—"}</span>
    </div>
  );
  const rvCard = (title: string, onEdit: ()=>void, children: React.ReactNode) => (
    <div style={{ background:"white", borderRadius:20, padding:"16px 18px", marginBottom:12, boxShadow:"0 2px 10px rgba(0,0,0,.05)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <span style={{ fontSize:13, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{title}</span>
        <button onClick={onEdit} style={{ padding:"4px 12px", borderRadius:10, border:"1.5px solid #DDD6FE", background:"#F5F0FF", color:"#9772F6", fontSize:11, fontWeight:800, fontFamily:QS, cursor:"pointer" }}>Edit</button>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC" }}>
      <div style={{ flexShrink:0, padding:"48px 20px 24px", backgroundImage:GRAD_H, position:"relative" as const }}>
        <button onClick={prevStep} style={{ position:"absolute" as const, top:48, left:16, background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:0 }}>
          <ChevronLeft size={24}/>
        </button>
        <h1 style={{ color:"white", fontSize:22, fontWeight:800, margin:"36px 0 4px", fontFamily:QS }}>Review & Confirm</h1>
        <p style={{ color:"rgba(255,255,255,.75)", fontSize:13, margin:0 }}>Review your information before submitting.</p>
      </div>
      <div style={{ height:16 }} />
      <ProgressBar />
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"0 16px 24px" }}>
        {rvCard("Personal Information", ()=>setStep(0), <>
          {rvRow("Full Name", [firstName, middleName, lastName].filter(Boolean).join(" "))}
          {rvRow("Contact", contact ? `+63 ${contact}` : "")}
          {rvRow("Sex", sex)}
          {rvRow("Address", address)}
        </>)}
        {rvCard("Account Information", ()=>setStep(1), <>
          {rvRow("Username", username)}
          {rvRow("Email", emailNA ? "Not Applicable" : email)}
          {rvRow("Password", "••••••••")}
        </>)}
        {rvCard("Boarding House", ()=>setStep(2), <>
          {rvRow("Name", bhName)}
          {rvRow("Formatted Address", bhAddress)}
          {rvRow("Latitude", bhLat != null ? bhLat.toFixed(6) : "")}
          {rvRow("Longitude", bhLng != null ? bhLng.toFixed(6) : "")}
          {rvRow("Location Type", bhLocationType === "existing" ? "Existing Map Location" : bhLocationType === "custom" ? "Custom Boarding House Pin" : "")}
          {rvRow("Check-In/Check-Out Radius", `${bhRadius}m`)}
          {bhComponents.street && rvRow("Street", bhComponents.street)}
          {bhComponents.purok && rvRow("Purok", bhComponents.purok)}
          {bhComponents.sitio && rvRow("Sitio", bhComponents.sitio)}
          {bhComponents.barangay && rvRow("Barangay", bhComponents.barangay)}
          {bhComponents.municipality && rvRow("Municipality/City", bhComponents.municipality)}
          {bhComponents.province && rvRow("Province", bhComponents.province)}
          {bhComponents.postalCode && rvRow("Postal Code", bhComponents.postalCode)}
          {bhComponents.country && rvRow("Country", bhComponents.country)}
          {rvRow("Landlord", bhLandlord)}
          {rvRow("Contact", bhContact ? `+63 ${bhContact}` : "")}
          {rvRow("Description", bhDesc)}
        </>)}
        {bhAmenities.length > 0 && rvCard("Amenities", ()=>setStep(2), <>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6 }}>
            {bhAmenities.map(a=><span key={a} style={{ padding:"4px 10px", borderRadius:10, background:"#F5F0FF", color:"#9772F6", fontSize:11, fontWeight:700, fontFamily:QS }}>{a}</span>)}
          </div>
        </>)}
        {rooms.length > 0 && rvCard("Rooms", ()=>setStep(2), <>
          {rooms.map((r,i)=>(
            <div key={r.id} style={{ marginBottom: i<rooms.length-1?12:0, paddingBottom: i<rooms.length-1?12:0, borderBottom: i<rooms.length-1?"1px solid #F3F4F6":"none" }}>
              <p style={{ fontSize:12, fontWeight:800, color:"#7549F6", margin:"0 0 4px", fontFamily:QS }}>{r.name}</p>
              <p style={{ fontSize:11, color:"#6B7280", margin:"0 0 6px" }}>Capacity: {r.cap || 0} · Occupied: {r.beds.filter(b=>b.status==="occupied").length}</p>
              {r.beds.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap" as const, gap:4 }}>
                  {r.beds.map((b,bi)=>{
                    const col = b.status==="available"?"#16A34A":b.status==="occupied"?"#EF4444":"#D97706";
                    const bg = b.status==="available"?"#DCFCE7":b.status==="occupied"?"#FEE2E2":"#FEF3C7";
                    return <span key={bi} style={{ padding:"3px 9px", borderRadius:8, background:bg, color:col, fontSize:10, fontWeight:700, fontFamily:QS }}>{b.label}</span>;
                  })}
                </div>
              )}
            </div>
          ))}
        </>)}
        {bhRules && rvCard("Rules", ()=>setStep(2), <>
          <p style={{ fontSize:12, color:"#374151", margin:0, lineHeight:1.6, whiteSpace:"pre-wrap" as const }}>{bhRules}</p>
        </>)}
        {rvCard("Highlights & Schedule", ()=>setStep(2), <>
          {rvRow("Feature", highlightsEnabled ? "Enabled" : "Disabled")}
        </>)}
        {rvCard("Visitor Records", ()=>setStep(2), <>
          {rvRow("Feature", visitorRecordsEnabled ? "Enabled" : "Disabled")}
          {visitorRecordsEnabled && <>
            {rvRow("Visitor Name",     vfName         ? "Collect" : "Skip")}
            {rvRow("Contact Number",   vfContact      ? "Collect" : "Skip")}
            {rvRow("Relationship",     vfRelationship ? "Collect" : "Skip")}
            {rvRow("Purpose of Visit", vfPurpose      ? "Collect" : "Skip")}
          </>}
        </>)}
        {rvCard("Stay Info Settings", ()=>setStep(2), <>
          {rvRow("Length of Stay", allowLengthOfStay ? "Enabled" : "Disabled")}
          {rvRow("Move-In Information", allowMoveIn ? "Enabled" : "Disabled")}
          {rvRow("Personality Traits", allowPersonality ? "Enabled" : "Disabled")}
          {rvRow("Hobbies & Interests", allowHobbies ? "Enabled" : "Disabled")}
          {rvRow("Lifestyle", allowLifestyle ? "Enabled" : "Disabled")}
          {rvRow("Additional Notes", allowNotes ? "Enabled" : "Disabled")}
        </>)}

        {/* Confirm button */}
        {submitError && (
          <div style={{ background:"#FEF2F2", borderRadius:16, padding:"12px 16px", marginBottom:12, border:"1px solid #FECACA" }}>
            <p style={{ fontSize:12, color:"#DC2626", margin:0, fontFamily:IN, lineHeight:1.55 }}>{submitError}</p>
          </div>
        )}
        <button onClick={finishSetup} disabled={creatingAccount}
          style={{ width:"100%", height:56, borderRadius:24, border:"none", background: creatingAccount ? "#C4B5FD" : GRAD, color:"white", fontSize:15, fontWeight:800, fontFamily:QS, cursor: creatingAccount ? "default" : "pointer", boxShadow:"0 8px 28px rgba(151,114,246,.4)", marginBottom:12 }}>
          {creatingAccount ? "Creating Account…" : "Confirm & Finish Setup"}
        </button>
        <button onClick={prevStep} disabled={creatingAccount} style={{ width:"100%", height:48, borderRadius:24, border:"2px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:14, fontWeight:800, fontFamily:QS, cursor:"pointer" }}>
          Back
        </button>
      </div>
    </div>
  );
}

// ── STUDENT SIGN UP ───────────────────────────────────────────────────────────

