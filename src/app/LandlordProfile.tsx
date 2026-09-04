import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { AppInfoSection } from "./AppInfo";
import { uploadProfilePhoto, removeProfilePhoto } from "./profileStore";
import {
  User, Mail, Lock, Phone, Building2, ChevronDown, ChevronUp,
  ChevronRight, Edit3, Save, X, Camera, LogOut, Wifi, Droplet, Zap,
  BookOpen, Utensils, Shirt, Video, Car, Clock, Shield, Plus, Trash2,
  Eye, EyeOff, Check, ToggleLeft, ToggleRight, AlertCircle, Image,
  GripVertical, RefreshCw, Home, Layers, CreditCard,
  CalendarClock, UserCheck,
} from "lucide-react";
import { GRAD, GRAD_H, Screen } from "./shared";
import { GoogleMapCanvas } from "./components/GoogleMapCanvas";
import { BoardingHouseLocationPicker } from "./components/BoardingHouseLocationPicker";
import { AddressComponents } from "./components/mapGeo";
import {
  getMyLandlordAccount, updateMyPersonalInfo, changeMyPassword,
  getMyBoardingHouseFull, updateBoardingHouseInfo, updateBoardingHouseAmenities, updateBoardingHouseRules,
  updateBoardingHousePayments, addExtraFee, updateExtraFee, deleteExtraFee,
  addRoom as addRoomReal, updateRoom as updateRoomReal, deleteRoom as deleteRoomReal, updateBedStatusReal,
  addGalleryPhoto, updateGalleryPhotoLabel, removeGalleryPhoto, updateStayInfoSettings,
} from "./landlordProfileStore";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

// ── Shared micro-components ───────────────────────────────────────────────────

function SectionCard({ title, icon, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "white", borderRadius: 20, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", borderBottom: open ? "1px solid #F3F4F6" : "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "left" }}>{title}</span>
        {open ? <ChevronUp size={17} color="#9CA3AF" /> : <ChevronDown size={17} color="#9CA3AF" />}
      </button>
      {open && <div style={{ padding: "16px 18px" }}>{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid #F9FAFB" }}>
      <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 2px", fontFamily: QS, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: IN, lineHeight: 1.45 }}>{value || "—"}</p>
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder, multiline = false, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; error?: string;
}) {
  const base: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12,
    border: `1.5px solid ${error ? "#EF4444" : "#E5E7EB"}`, background: "#F9FAFB",
    color: "#1F2937", fontSize: 13, fontFamily: IN, outline: "none", resize: "none",
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 5, display: "block" }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={base} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />}
      {error && <p style={{ fontSize: 11, color: "#EF4444", margin: "4px 0 0", fontFamily: IN }}>{error}</p>}
    </div>
  );
}

function GradBtn({ children, onClick, outline = false, danger = false, small = false, disabled = false }: {
  children: React.ReactNode; onClick?: () => void; outline?: boolean; danger?: boolean; small?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      height: small ? 36 : 44, padding: small ? "0 14px" : "0 20px", borderRadius: 20,
      border: outline ? `2px solid ${danger ? "#EF4444" : "#9772F6"}` : "none",
      background: outline ? "white" : danger ? "#EF4444" : GRAD,
      color: outline ? (danger ? "#EF4444" : "#9772F6") : "white",
      fontSize: small ? 12 : 13, fontWeight: 800, fontFamily: QS, cursor: disabled ? "default" : "pointer",
      boxShadow: outline ? "none" : "0 4px 16px rgba(151,114,246,.3)",
      display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 46, height: 26, borderRadius: 13, background: value ? "#9772F6" : "#D1D5DB", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .2s" }} />
    </div>
  );
}

function Chip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${on ? "#9772F6" : "#E5E7EB"}`, background: on ? "#F5F0FF" : "white", color: on ? "#9772F6" : "#6B7280", fontSize: 11, fontWeight: 700, fontFamily: QS, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {on && <Check size={11} />}{label}
    </button>
  );
}

function BedBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string }> = {
    available:   { bg: "#DCFCE7", color: "#15803D", dot: "#16A34A" },
    occupied:    { bg: "#FEE2E2", color: "#DC2626", dot: "#EF4444" },
    reserved:    { bg: "#FEF9C3", color: "#92400E", dot: "#CA8A04" },
    maintenance: { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
  };
  const s = map[status] ?? map.available;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.bg, fontSize: 11, fontWeight: 700, color: s.color, fontFamily: QS }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Mock landlord data ────────────────────────────────────────────────────────

type BedStatus = "available" | "occupied" | "reserved" | "maintenance";
type Bed = { id: string; label: string; status: BedStatus; photo?: string };
type Room = { id: string; name: string; desc: string; cap: number; amenities: string[]; beds: Bed[]; roomPhoto?: string; crPhoto?: string };
type Payment = { id: string; label: string; amount: string; type: "fixed" | "metered" | "none"; enabled: boolean; custom?: boolean };

const phpStr = (n: number | null | undefined): string => (n == null ? "" : n.toLocaleString());
const parsePhp = (s: string | undefined): number | null => {
  if (!s) return null;
  const cleaned = s.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const ALL_AMENITIES = ["Wi-Fi", "Water Included", "Electricity", "Study Area", "Kitchen", "Laundry Area", "CCTV", "Parking", "Curfew", "Security", "Air-conditioned", "Refrigerator"];
const ROOM_AMENITIES = ["Air-conditioned", "Electric Fan", "Private CR", "Shared CR", "Study Table", "Cabinet", "Wi-Fi", "Window", "Balcony"];

const AMENITY_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  "Wi-Fi": Wifi, "Water Included": Droplet, "Electricity": Zap, "Study Area": BookOpen,
  "Kitchen": Utensils, "Laundry Area": Shirt, "CCTV": Video, "Parking": Car,
  "Curfew": Clock, "Security": Shield, "Air-conditioned": Zap, "Refrigerator": Droplet,
};

// ── Main screen ───────────────────────────────────────────────────────────────

export function LandlordProfileScreen({ go, visitorEnabled = false, setVisitorEnabled, visitorFields = { name: true, contact: true, relationship: true, purpose: true }, setVisitorFields, highlightsEnabled = true, setHighlightsEnabled }: { go: (s: Screen) => void; visitorEnabled?: boolean; setVisitorEnabled?: (v: boolean) => void; visitorFields?: { name: boolean; contact: boolean; relationship: boolean; purpose: boolean }; setVisitorFields?: (f: { name: boolean; contact: boolean; relationship: boolean; purpose: boolean }) => void; highlightsEnabled?: boolean; setHighlightsEnabled?: (v: boolean) => void }) {

  // ── Real identity — resolved once on mount, everything below is seeded from it ──
  const [uid, setUid] = useState<string | null>(null);
  const [bhId, setBhId] = useState<string | null>(null);

  // ── Personal Info ──────────────────────────────────────────────────────────
  const [editPersonal, setEditPersonal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [sex, setSex] = useState("");
  const [address, setAddress] = useState("");
  const [personalDraft, setPersonalDraft] = useState({ firstName, middleName, lastName, contact, sex, address });

  const startEditPersonal = () => { setPersonalDraft({ firstName, middleName, lastName, contact, sex, address }); setEditPersonal(true); };
  const savePersonal = async () => {
    const res = await updateMyPersonalInfo(personalDraft);
    if (res.ok === false) { showToast(res.error || "Couldn't update personal information."); return; }
    setFirstName(personalDraft.firstName); setMiddleName(personalDraft.middleName); setLastName(personalDraft.lastName);
    setContact(personalDraft.contact); setSex(personalDraft.sex); setAddress(personalDraft.address);
    setEditPersonal(false); showToast("Personal information updated.");
  };

  const fullName = [firstName, middleName ? middleName.charAt(0) + "." : "", lastName].filter(Boolean).join(" ");
  const username = [firstName, middleName ? middleName[0] : "", lastName].filter(Boolean).join("_").toLowerCase().replace(/\s+/g, "");

  // ── Account Info ───────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [showPwModal, setShowPwModal] = useState(false);
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [conPw, setConPw] = useState("");
  const [showCur, setShowCur] = useState(false); const [showNew, setShowNew] = useState(false); const [showCon, setShowCon] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const savePw = async () => {
    if (!curPw) { setPwError("Enter your current password."); return; }
    if (newPw.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (newPw !== conPw) { setPwError("Passwords do not match."); return; }
    setPwBusy(true); setPwError("");
    const res = await changeMyPassword(curPw, newPw);
    setPwBusy(false);
    if (res.ok === false) { setPwError(res.error || "Couldn't change password."); return; }
    setCurPw(""); setNewPw(""); setConPw(""); setShowPwModal(false); showToast("Password changed successfully.");
  };

  // ── BH Info ────────────────────────────────────────────────────────────────
  const [editBH, setEditBH] = useState(false);
  const [bhName, setBhName] = useState("");
  const [bhAddress, setBhAddress] = useState("");
  const [bhMunicipality, setBhMunicipality] = useState("");
  const [bhContact, setBhContact] = useState("");
  const [bhDesc, setBhDesc] = useState("");
  const [bhLat, setBhLat] = useState<number | null>(null);
  const [bhLng, setBhLng] = useState<number | null>(null);
  const [bhComponents, setBhComponents] = useState<AddressComponents>({});
  // The DB never stored whether the original pin was an "existing Google place" vs a "custom
  // pin" (no location_type/place_name/place_id columns exist) — only lat/lng/address survive.
  // Re-opening this for editing always treats it as a custom pin, which is the honest state:
  // we genuinely don't know which it originally was.
  const [bhLocationType, setBhLocationType] = useState<"existing" | "custom" | null>("custom");
  const [bhPlaceName, setBhPlaceName] = useState<string | null>(null);
  const [bhPlaceId, setBhPlaceId] = useState<string | null>(null);
  const [bhLocationConfirmed, setBhLocationConfirmed] = useState(true); // already-saved location starts confirmed
  const [bhRadius, setBhRadius] = useState(50); // the only area a student's check-in/check-out is accepted from
  const [bhDraft, setBhDraft] = useState({ bhName, bhAddress, bhContact, bhDesc, bhLat, bhLng, bhComponents, bhLocationType, bhPlaceName, bhPlaceId, bhRadius });

  const startEditBH = () => { setBhDraft({ bhName, bhAddress, bhContact, bhDesc, bhLat, bhLng, bhComponents, bhLocationType, bhPlaceName, bhPlaceId, bhRadius }); setBhLocationConfirmed(true); setEditBH(true); };
  const saveBH = async () => {
    if (!bhId || bhDraft.bhLat == null || bhDraft.bhLng == null) return;
    const res = await updateBoardingHouseInfo(bhId, {
      name: bhDraft.bhName, address: bhDraft.bhAddress, municipality: bhMunicipality,
      lat: bhDraft.bhLat, lng: bhDraft.bhLng, contact: bhDraft.bhContact, description: bhDraft.bhDesc,
      checkinRadiusMeters: bhDraft.bhRadius,
    });
    if (res.ok === false) { showToast(res.error || "Couldn't update boarding house information."); return; }
    setBhName(bhDraft.bhName); setBhAddress(bhDraft.bhAddress); setBhContact(bhDraft.bhContact); setBhDesc(bhDraft.bhDesc);
    setBhLat(bhDraft.bhLat); setBhLng(bhDraft.bhLng); setBhComponents(bhDraft.bhComponents); setBhLocationType(bhDraft.bhLocationType); setBhPlaceName(bhDraft.bhPlaceName); setBhPlaceId(bhDraft.bhPlaceId);
    setBhRadius(bhDraft.bhRadius);
    setEditBH(false); showToast("Boarding house information updated.");
  };

  // ── Amenities ──────────────────────────────────────────────────────────────
  const [amenities, setAmenities] = useState<string[]>([]);
  const [editAmenities, setEditAmenities] = useState(false);
  const [amenDraft, setAmenDraft] = useState<string[]>([]);
  const toggleAmenDraft = (a: string) => setAmenDraft(d => d.includes(a) ? d.filter(x => x !== a) : [...d, a]);
  const saveAmenities = async () => {
    if (!bhId) return;
    const res = await updateBoardingHouseAmenities(bhId, amenDraft);
    if (res.ok === false) { showToast(res.error || "Couldn't update amenities."); return; }
    setAmenities(amenDraft); setEditAmenities(false); showToast("Amenities updated.");
  };

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  const [roomDraft, setRoomDraft] = useState<Partial<Room>>({});

  const updateBedStatus = async (roomId: string, bedId: string, status: BedStatus) => {
    const res = await updateBedStatusReal(bedId, status);
    if (res.ok === false) { showToast(res.error || "Couldn't update bed status."); return; }
    setRooms(rs => rs.map(r => r.id === roomId ? { ...r, beds: r.beds.map(b => b.id === bedId ? { ...b, status } : b) } : r));
  };
  const deleteRoom = async (id: string) => {
    const res = await deleteRoomReal(id);
    if (res.ok === false) { showToast(res.error || "Couldn't delete room."); return; }
    setRooms(rs => rs.filter(r => r.id !== id));
    showToast("Room deleted.");
  };
  const startEditRoom = (r: Room) => { setEditRoomId(r.id); setRoomDraft({ ...r }); };
  const saveRoom = async () => {
    if (!editRoomId) return;
    const res = await updateRoomReal(editRoomId, { name: roomDraft.name, description: roomDraft.desc, amenities: roomDraft.amenities });
    if (res.ok === false) { showToast(res.error || "Couldn't update room."); return; }
    setRooms(rs => rs.map(r => r.id === editRoomId ? { ...r, ...roomDraft } : r));
    setEditRoomId(null); showToast("Room updated.");
  };
  const addRoom = async () => {
    if (!bhId) return;
    const name = `Room ${String.fromCharCode(65 + rooms.length)}`;
    const res = await addRoomReal(bhId, { name, capacity: 4, description: "" });
    if (res.ok === false) { showToast(res.error || "Couldn't add room."); return; }
    await loadAll(); // pick up the real generated room + default-bed ids rather than guessing them
    showToast("Room added.");
  };

  // Statistics (auto-derived)
  const totalCap = rooms.reduce((s, r) => s + r.cap, 0);
  const totalOcc = rooms.reduce((s, r) => s + r.beds.filter(b => b.status === "occupied" || b.status === "reserved").length, 0);
  const totalAvail = totalCap - totalOcc;

  // ── Gallery ────────────────────────────────────────────────────────────────
  const [gallery, setGallery] = useState<{ id: string; label: string; url: string }[]>([]);
  const [editGalleryId, setEditGalleryId] = useState<string | null>(null);
  const [newGalLabel, setNewGalLabel] = useState("");

  const addGalleryPhotoReal = async (file: File) => {
    if (!uid || !bhId) return;
    const blobUrl = URL.createObjectURL(file);
    const res = await addGalleryPhoto(uid, bhId, blobUrl, "New Photo");
    if (res.ok === false) { showToast(res.error || "Couldn't upload photo."); return; }
    setGallery(g => [...g, { id: res.id, label: "New Photo", url: res.url }]);
    showToast("Photo added.");
  };
  const saveGalleryLabel = async (id: string) => {
    const res = await updateGalleryPhotoLabel(id, newGalLabel);
    if (res.ok === false) { showToast(res.error || "Couldn't update label."); return; }
    setGallery(g => g.map(x => x.id === id ? { ...x, label: newGalLabel } : x));
    setEditGalleryId(null); showToast("Label updated.");
  };
  const deleteGalleryPhoto = async (id: string) => {
    const res = await removeGalleryPhoto(id);
    if (res.ok === false) { showToast(res.error || "Couldn't remove photo."); return; }
    setGallery(g => g.filter(x => x.id !== id));
    showToast("Photo removed.");
  };

  // ── Rules ──────────────────────────────────────────────────────────────────
  const [rules, setRules] = useState<string[]>([]);
  const [editRuleIdx, setEditRuleIdx] = useState<number | null>(null);
  const [ruleDraft, setRuleDraft] = useState("");
  const [newRule, setNewRule] = useState("");
  const [addingRule, setAddingRule] = useState(false);

  const commitRules = async (updated: string[]): Promise<boolean> => {
    if (!bhId) return false;
    const res = await updateBoardingHouseRules(bhId, updated);
    if (res.ok === false) { showToast(res.error || "Couldn't update rules."); return false; }
    setRules(updated);
    return true;
  };

  // ── Payments ───────────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editPayId, setEditPayId] = useState<string | null>(null);
  const [payDraft, setPayDraft] = useState<Partial<Payment>>({});
  const [addingPay, setAddingPay] = useState(false);
  const [newPay, setNewPay] = useState<Payment>({ id: "", label: "", amount: "", type: "fixed", enabled: true, custom: true });

  // Pushes all 4 fixed slots (rent/electric/water/internet) in one call — the schema stores them
  // as plain type+amount columns with no separate "enabled" flag, so "disabled" is represented as
  // type/amount = null (matching how LandlordSignUp's own wizard already persists a disabled fee).
  const pushFixedPayments = async (updated: Payment[]) => {
    if (!bhId) return { ok: false as const, error: "No boarding house." };
    const get = (id: string) => updated.find(p => p.id === id);
    const rent = get("rent"), electric = get("electric"), water = get("water"), internet = get("internet");
    return updateBoardingHousePayments(bhId, {
      rentAmount: rent?.enabled ? parsePhp(rent.amount) : null,
      electricType: electric?.enabled ? (electric.type === "metered" ? "metered" : "fixed") : null,
      electricAmount: electric?.enabled && electric.type !== "metered" ? parsePhp(electric.amount) : null,
      waterType: water?.enabled ? (water.type === "metered" ? "metered" : "fixed") : null,
      waterAmount: water?.enabled && water.type !== "metered" ? parsePhp(water.amount) : null,
      internetType: internet?.enabled ? (internet.type === "metered" ? "metered" : "fixed") : null,
      internetAmount: internet?.enabled && internet.type !== "metered" ? parsePhp(internet.amount) : null,
    });
  };

  const togglePayment = async (id: string) => {
    const target = payments.find(p => p.id === id);
    if (!target) return;
    if (target.custom) {
      const res = await updateExtraFee(id, { enabled: !target.enabled });
      if (res.ok === false) { showToast(res.error || "Couldn't update payment."); return; }
      setPayments(ps => ps.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
      return;
    }
    const newEnabled = !target.enabled;
    if (newEnabled && target.type !== "metered" && !parsePhp(target.amount)) {
      showToast("Enter an amount first (Edit), then enable this fee."); return;
    }
    const updatedList = payments.map(p => p.id === id ? { ...p, enabled: newEnabled } : p);
    const res = await pushFixedPayments(updatedList);
    if (res.ok === false) { showToast(res.error || "Couldn't update payment."); return; }
    setPayments(updatedList);
  };
  const savePay = async (id: string) => {
    const target = payments.find(p => p.id === id);
    if (!target) return;
    const merged: Payment = { ...target, ...payDraft };
    if (target.custom) {
      const res = await updateExtraFee(id, { name: merged.label, type: merged.type as "fixed" | "metered", amount: merged.type === "metered" ? null : parsePhp(merged.amount) });
      if (res.ok === false) { showToast(res.error || "Couldn't update payment."); return; }
    } else {
      const updatedList = payments.map(p => p.id === id ? merged : p);
      const res = await pushFixedPayments(updatedList);
      if (res.ok === false) { showToast(res.error || "Couldn't update payment."); return; }
    }
    setPayments(ps => ps.map(p => p.id === id ? merged : p));
    setEditPayId(null); showToast("Payment updated.");
  };
  const deletePay = async (id: string) => {
    const res = await deleteExtraFee(id);
    if (res.ok === false) { showToast(res.error || "Couldn't delete payment."); return; }
    setPayments(ps => ps.filter(p => p.id !== id));
    showToast("Payment removed.");
  };
  const confirmAddPay = async () => {
    if (!newPay.label.trim() || !bhId) return;
    const res = await addExtraFee(bhId, { name: newPay.label, type: newPay.type as "fixed" | "metered", amount: newPay.type === "metered" ? null : parsePhp(newPay.amount), enabled: newPay.enabled });
    if (res.ok === false) { showToast(res.error || "Couldn't add payment."); return; }
    setPayments(ps => [...ps, { ...newPay, id: res.id, custom: true }]);
    setAddingPay(false); setNewPay({ id: "", label: "", amount: "", type: "fixed", enabled: true, custom: true });
    showToast("Payment added.");
  };

  // ── Stay Info toggles ──────────────────────────────────────────────────────
  const [stayToggles, setStayToggles] = useState({ lengthOfStay: true, moveIn: true, personality: true, hobbies: true, lifestyle: true, notes: true });
  const toggleStay = async (k: keyof typeof stayToggles) => {
    if (!bhId) return;
    const updated = { ...stayToggles, [k]: !stayToggles[k] };
    const res = await updateStayInfoSettings(bhId, updated);
    if (res.ok === false) { showToast(res.error || "Couldn't update settings."); return; }
    setStayToggles(updated);
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  // ── Logout confirmation ───────────────────────────────────────────────────
  const [showLogout, setShowLogout] = useState(false);

  // ── Profile photo ──────────────────────────────────────────────────────────
  const [photo, setPhoto] = useState<string | null>(null);

  // ── Load everything real, once on mount ─────────────────────────────────────
  const loadAll = async () => {
    const account = await getMyLandlordAccount();
    if (!account) return;
    setUid(account.uid);
    setFirstName(account.firstName); setMiddleName(account.middleName); setLastName(account.lastName);
    setSex(account.sex); setContact(account.contact); setAddress(account.address); setEmail(account.email);
    setPersonalDraft({ firstName: account.firstName, middleName: account.middleName, lastName: account.lastName, contact: account.contact, sex: account.sex, address: account.address });
    if (account.photoUrl) setPhoto(account.photoUrl);

    const full = await getMyBoardingHouseFull(account.uid);
    if (!full) return;
    const { bh, extraFees, stayInfo } = full;
    setBhId(bh.id);
    setBhName(bh.name); setBhAddress(bh.address); setBhContact(bh.contact ?? ""); setBhDesc(bh.desc);
    setBhLat(bh.lat); setBhLng(bh.lng); setBhMunicipality(bh.municipality);
    setBhRadius(bh.checkinRadiusMeters);
    setBhDraft({ bhName: bh.name, bhAddress: bh.address, bhContact: bh.contact ?? "", bhDesc: bh.desc, bhLat: bh.lat, bhLng: bh.lng, bhComponents: {}, bhLocationType: "custom", bhPlaceName: null, bhPlaceId: null, bhRadius: bh.checkinRadiusMeters });

    setAmenities(bh.amenities.map(a => a.label));

    setRooms(bh.rooms.map(r => ({
      id: r.id, name: r.name, desc: r.description ?? "", cap: r.cap,
      amenities: r.roomAmenities ?? [],
      beds: (r.beds ?? []).map(b => ({ id: b.id, label: b.label, status: b.status, photo: b.photo })),
    })));
    setExpandedRoom(bh.rooms[0]?.id ?? null);

    setGallery(bh.gallery.filter((g): g is { id: string; url: string; label: string } => !!g.id));

    setRules(bh.rules ?? []);

    const p = bh.payment;
    setPayments([
      { id: "rent", label: "Monthly Rent", amount: phpStr(p?.rent.amount), type: "fixed", enabled: !!p?.rent.enabled },
      { id: "electric", label: "Electrical Bill", amount: p?.electric.type === "metered" ? "per reading" : phpStr(p?.electric.amount), type: p?.electric.type ?? "fixed", enabled: !!p?.electric.enabled },
      { id: "water", label: "Water Bill", amount: p?.water.type === "metered" ? "per reading" : phpStr(p?.water.amount), type: p?.water.type ?? "fixed", enabled: !!p?.water.enabled },
      { id: "internet", label: "Internet Fee", amount: p?.internet.type === "separate" ? phpStr(p?.internet.amount) : "", type: p?.internet.type === "separate" ? "metered" : "fixed", enabled: !!p?.internet.enabled },
      ...extraFees.map(f => ({ id: f.id, label: f.name, amount: f.type === "metered" ? "per reading" : phpStr(f.amount), type: f.type, enabled: f.enabled, custom: true })),
    ]);

    setStayToggles(stayInfo);
  };
  useEffect(() => { loadAll(); }, []);

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#F9FAFB", color: "#1F2937", fontSize: 13, fontFamily: IN, outline: "none" };
  const pwInputWrap: React.CSSProperties = { position: "relative", marginBottom: 12 };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC", position: "relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "white", borderRadius: 20, padding: "10px 20px", fontSize: 12, fontFamily: QS, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={13} color="#4ADE80" />{toast}
        </div>
      )}

      {/* Logout Confirm — matches ParentProfile.tsx's icon-less card exactly */}
      {showLogout && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowLogout(false)}>
          <div style={{ background: "white", borderRadius: 24, padding: "28px 22px", width: "100%", maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "center" as const }}>Log Out?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.5, textAlign: "center" as const }}>You will be returned to the login screen.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setShowLogout(false)} style={{ height: 44, borderRadius: 18, border: "2px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: QS }}>Cancel</button>
              <button onClick={() => { supabase.auth.signOut(); go("landing"); }} style={{ height: 44, borderRadius: 18, border: "none", background: "#EF4444", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowPwModal(false)}>
          <div style={{ background: "white", borderRadius: 24, padding: "24px 20px", width: "100%", maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Change Password</h3>
            {pwError && <div style={{ background: "#FEF2F2", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8 }}><AlertCircle size={14} color="#EF4444" /><span style={{ fontSize: 12, color: "#DC2626", fontFamily: IN }}>{pwError}</span></div>}
            {[
              { label: "Current Password", val: curPw, set: setCurPw, show: showCur, toggle: () => setShowCur(s => !s) },
              { label: "New Password",     val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(s => !s) },
              { label: "Confirm Password", val: conPw, set: setConPw, show: showCon, toggle: () => setShowCon(s => !s) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label} style={pwInputWrap}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 5, display: "block" }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input type={show ? "text" : "password"} value={val} onChange={e => set(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                  <button onClick={toggle} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                    {show ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <GradBtn outline onClick={() => { setShowPwModal(false); setPwError(""); }} disabled={pwBusy}>Cancel</GradBtn>
              <GradBtn onClick={savePw} disabled={pwBusy}>{pwBusy ? "Saving…" : "Save Password"}</GradBtn>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>

        {/* Header */}
        <div style={{ padding: "52px 20px 24px", backgroundImage: GRAD_H, textAlign: "center" }}>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 20px", fontFamily: QS, textAlign: "left" }}>My Profile</h1>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ width: 84, height: 84, borderRadius: "50%", background: photo ? "transparent" : "rgba(255,255,255,.2)", border: "3px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={38} color="white" />}
            </div>
            <label style={{ position: "absolute", bottom: -6, right: -6, width: 28, height: 28, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
              <Camera size={13} color="#9772F6" />
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPhoto(URL.createObjectURL(f)); // instant preview while the real upload runs
                const res = await uploadProfilePhoto(f);
                if (res.ok === false) showToast(res.error || "Couldn't upload photo. Please try again.");
                else setPhoto(res.url);
              }} />
            </label>
          </div>
          {photo && (
            <button onClick={async () => { setPhoto(null); const res = await removeProfilePhoto(); if (res.ok === false) showToast(res.error || "Couldn't remove photo."); }} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, cursor: "pointer", fontFamily: QS }}>Remove Photo</button>
          )}
          <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "14px 0 4px", fontFamily: QS }}>{fullName}</h2>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ background: "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "white", fontFamily: QS, fontWeight: 700 }}>@{username}</span>
            <span style={{ background: "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "white", fontFamily: QS, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}><Home size={11} /> Landlord</span>
          </div>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, margin: "8px 0 0", fontFamily: QS }}>{bhName}</p>
        </div>

        {/* Statistics quick card */}
        <div style={{ padding: "0 16px 0", marginTop: -20 }}>
          <div style={{ background: "white", borderRadius: 22, padding: 16, boxShadow: "0 8px 32px rgba(117,73,246,.14)", display: "grid", gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
            {[["Rooms", String(rooms.length)], ["Capacity", String(totalCap)], ["Occupied", String(totalOcc)], ["Available", String(totalAvail)]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#9772F6", fontFamily: QS }}>{v}</span>
                <span style={{ fontSize: 9, color: "#6B7280", fontFamily: QS, fontWeight: 700, textAlign: "center" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 16px 32px" }}>

          {/* ── Personal Information ── */}
          <SectionCard title="Personal Information" icon={<User size={16} color="#9772F6" />}>
            {!editPersonal ? (
              <>
                <InfoRow label="First Name"      value={firstName} />
                <InfoRow label="Middle Name"     value={middleName} />
                <InfoRow label="Last Name"       value={lastName} />
                <InfoRow label="Contact Number"  value={contact} />
                <InfoRow label="Sex"             value={sex} />
                <InfoRow label="Complete Address" value={address} last />
                <div style={{ marginTop: 14 }}>
                  <GradBtn small outline onClick={startEditPersonal}><Edit3 size={13} />Edit Personal Info</GradBtn>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <EditableField label="First Name" value={personalDraft.firstName} onChange={v => setPersonalDraft(d => ({ ...d, firstName: v }))} placeholder="Kyla" />
                  <EditableField label="Middle Name" value={personalDraft.middleName} onChange={v => setPersonalDraft(d => ({ ...d, middleName: v }))} placeholder="Lodripas" />
                </div>
                <EditableField label="Last Name" value={personalDraft.lastName} onChange={v => setPersonalDraft(d => ({ ...d, lastName: v }))} placeholder="Naquila" />
                <EditableField label="Contact Number" value={personalDraft.contact} onChange={v => setPersonalDraft(d => ({ ...d, contact: v }))} placeholder="09XXXXXXXXX" />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 5, display: "block" }}>Sex</label>
                  <select value={personalDraft.sex} onChange={e => setPersonalDraft(d => ({ ...d, sex: e.target.value }))} style={{ ...inputStyle, appearance: "none" }}>
                    {["Male", "Female", "Prefer not to say"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <EditableField label="Complete Address" value={personalDraft.address} onChange={v => setPersonalDraft(d => ({ ...d, address: v }))} placeholder="Purok, Barangay, Municipality, Province" multiline />
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <GradBtn small outline onClick={() => setEditPersonal(false)}><X size={13} />Cancel</GradBtn>
                  <GradBtn small onClick={savePersonal}><Save size={13} />Save Changes</GradBtn>
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Account Information ── */}
          <SectionCard title="Account Information" icon={<Mail size={16} color="#9772F6" />}>
            <InfoRow label="Username" value={`@${username}`} />
            <InfoRow label="Email Address" value={email} />
            <div style={{ padding: "10px 0 0" }}>
              <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 2px", fontFamily: QS, textTransform: "uppercase", letterSpacing: 0.5 }}>Password</p>
              <p style={{ fontSize: 14, letterSpacing: 4, color: "#1F2937", margin: "0 0 14px", fontFamily: IN }}>••••••••••</p>
              <GradBtn small outline onClick={() => setShowPwModal(true)}><Lock size={13} />Change Password</GradBtn>
            </div>
          </SectionCard>

          {/* ── Boarding House Information ── */}
          <SectionCard title="Boarding House Information" icon={<Building2 size={16} color="#9772F6" />}>
            {!editBH ? (
              <>
                <InfoRow label="Boarding House Name" value={bhName} />
                <InfoRow label="Address"             value={bhAddress} />
                <InfoRow label="Latitude"             value={bhLat != null ? bhLat.toFixed(6) : ""} />
                <InfoRow label="Longitude"            value={bhLng != null ? bhLng.toFixed(6) : ""} />
                {bhLocationType && <InfoRow label="Location Type" value={bhLocationType === "existing" ? "Existing Map Location" : "Custom Boarding House Pin"} />}
                <InfoRow label="Check-In/Check-Out Radius" value={`${bhRadius}m`} />
                <InfoRow label="Contact Number"      value={bhContact} />
                <InfoRow label="Description"         value={bhDesc} last />
                {/* Real Google Map of the boarding house's saved, pinned location — the shaded
                    circle is the actual area a student's check-in/check-out is accepted from. */}
                {bhLat != null && bhLng != null && (
                  <div style={{ marginTop: 14, borderRadius: 16, overflow: "hidden", height: 150, position: "relative" }}>
                    <GoogleMapCanvas
                      center={{ lat: bhLat, lng: bhLng }}
                      zoom={16}
                      mapType="standard"
                      markers={[{ id: "bh", variant: "bh", position: { lat: bhLat, lng: bhLng }, title: bhName }]}
                      circle={{ center: { lat: bhLat, lng: bhLng }, radiusMeters: bhRadius, color: "#9772F6" }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <GradBtn small outline onClick={startEditBH}><Edit3 size={13} />Edit BH Info</GradBtn>
                  <GradBtn small outline onClick={startEditBH}><Building2 size={13} />Edit Location</GradBtn>
                </div>
              </>
            ) : (
              <>
                <EditableField label="Boarding House Name" value={bhDraft.bhName} onChange={v => setBhDraft(d => ({ ...d, bhName: v }))} placeholder="e.g. Naquila Boarding House" />
                {/* Interactive map picker — the pin is the source of truth. An existing map place's
                    address is used exactly as its provider returns it (never reverse-geocoded); a
                    custom pin's address is typed by the landlord themselves inside the picker. */}
                <BoardingHouseLocationPicker
                  lat={bhDraft.bhLat}
                  lng={bhDraft.bhLng}
                  address={bhDraft.bhAddress}
                  locationType={bhDraft.bhLocationType}
                  placeName={bhDraft.bhPlaceName}
                  placeId={bhDraft.bhPlaceId}
                  confirmed={bhLocationConfirmed}
                  onConfirmedChange={setBhLocationConfirmed}
                  onLocationChange={r => setBhDraft(d => ({ ...d, bhLat: r.lat, bhLng: r.lng, bhAddress: r.address, bhComponents: r.components, bhLocationType: r.locationType, bhPlaceName: r.placeName, bhPlaceId: r.placeId }))}
                  radiusMeters={bhDraft.bhRadius}
                  onRadiusChange={v => setBhDraft(d => ({ ...d, bhRadius: v }))}
                />
                <EditableField label="Contact Number" value={bhDraft.bhContact} onChange={v => setBhDraft(d => ({ ...d, bhContact: v }))} placeholder="09XXXXXXXXX" />
                <EditableField label="Short Description" value={bhDraft.bhDesc} onChange={v => setBhDraft(d => ({ ...d, bhDesc: v }))} multiline />
                {!bhLocationConfirmed && (
                  <p style={{ fontSize: 11, color: "#D97706", margin: "-4px 0 12px", fontFamily: IN }}>
                    Please confirm your boarding house location on the map before saving.
                  </p>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <GradBtn small outline onClick={() => setEditBH(false)}><X size={13} />Cancel</GradBtn>
                  <GradBtn small disabled={!bhLocationConfirmed} onClick={saveBH}><Save size={13} />Save Changes</GradBtn>
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Amenities ── */}
          <SectionCard title="Boarding House Amenities" icon={<Wifi size={16} color="#9772F6" />}>
            {!editAmenities ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {amenities.length === 0 && <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>No amenities selected.</span>}
                  {amenities.map(a => {
                    const Icon = AMENITY_ICONS[a] ?? Shield;
                    return (
                      <div key={a} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F5F0FF", borderRadius: 20, padding: "6px 12px" }}>
                        <Icon size={13} color="#9772F6" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>{a}</span>
                      </div>
                    );
                  })}
                </div>
                <GradBtn small outline onClick={() => { setAmenDraft([...amenities]); setEditAmenities(true); }}><Edit3 size={13} />Edit Amenities</GradBtn>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {ALL_AMENITIES.map(a => <Chip key={a} label={a} on={amenDraft.includes(a)} onToggle={() => toggleAmenDraft(a)} />)}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <GradBtn small outline onClick={() => setEditAmenities(false)}><X size={13} />Cancel</GradBtn>
                  <GradBtn small onClick={saveAmenities}><Save size={13} />Save</GradBtn>
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Room Management ── */}
          <SectionCard title="Room Management" icon={<Layers size={16} color="#9772F6" />}>
            {rooms.map(room => {
              const occ = room.beds.filter(b => b.status === "occupied" || b.status === "reserved").length;
              const avail = room.beds.filter(b => b.status === "available").length;
              const isExpanded = expandedRoom === room.id;
              const isEditing = editRoomId === room.id;
              return (
                <div key={room.id} style={{ border: "1.5px solid #F3F4F6", borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
                  {/* Room header */}
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", background: "#FAFAFA", gap: 10 }}>
                    <button onClick={() => setExpandedRoom(isExpanded ? null : room.id)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: avail > 0 ? "#16A34A" : "#EF4444", flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, flex: 1 }}>{room.name}</span>
                      <span style={{ fontSize: 11, color: "#6B7280", fontFamily: IN }}>{avail}/{room.cap} avail.</span>
                      {isExpanded ? <ChevronUp size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#9CA3AF" />}
                    </button>
                  </div>

                  {/* Room body */}
                  {isExpanded && (
                    <div style={{ padding: "14px 14px" }}>
                      {isEditing ? (
                        <>
                          <EditableField label="Room Name" value={roomDraft.name ?? room.name} onChange={v => setRoomDraft(d => ({ ...d, name: v }))} />
                          <EditableField label="Description" value={roomDraft.desc ?? room.desc} onChange={v => setRoomDraft(d => ({ ...d, desc: v }))} multiline />
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 8, display: "block" }}>Amenities</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {ROOM_AMENITIES.map(a => {
                                const on = (roomDraft.amenities ?? room.amenities).includes(a);
                                return <Chip key={a} label={a} on={on} onToggle={() => setRoomDraft(d => { const cur = d.amenities ?? room.amenities; return { ...d, amenities: on ? cur.filter(x => x !== a) : [...cur, a] }; })} />;
                              })}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <GradBtn small outline onClick={() => setEditRoomId(null)}><X size={12} />Cancel</GradBtn>
                            <GradBtn small onClick={saveRoom}><Save size={12} />Save Room</GradBtn>
                          </div>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 10px", fontFamily: IN, lineHeight: 1.55 }}>{room.desc || "No description."}</p>
                          {/* Room amenity chips */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                            {room.amenities.map(a => <span key={a} style={{ padding: "4px 10px", borderRadius: 20, background: "#F5F0FF", color: "#9772F6", fontSize: 10, fontWeight: 700, fontFamily: QS }}>{a}</span>)}
                          </div>
                          {/* Beds */}
                          <p style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", margin: "0 0 8px", fontFamily: QS, textTransform: "uppercase", letterSpacing: 0.5 }}>Beds</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                            {room.beds.map(bed => (
                              <div key={bed.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F9FAFB", borderRadius: 12, padding: "10px 12px" }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: QS }}>{bed.label}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <BedBadge status={bed.status} />
                                  {/* "reserved" is a real, system-only status now (set the instant a
                                      student's registration goes pending, cleared on approve/reject —
                                      0047_reserve_bed_on_registration.sql) — not something to hand-pick
                                      here. Manually overriding it away would desync this bed from that
                                      real registration and let a second student book it again, so the
                                      dropdown is replaced with a read-only note while one's outstanding;
                                      resolve it from Reservation Requests instead. */}
                                  {bed.status === "reserved" ? (
                                    <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: IN, fontStyle: "italic" }}>Resolve via Reservation Requests</span>
                                  ) : (
                                    <select value={bed.status} onChange={e => updateBedStatus(room.id, bed.id, e.target.value as BedStatus)}
                                      style={{ fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB", background: "white", color: "#374151", padding: "3px 6px", fontFamily: QS, cursor: "pointer" }}>
                                      {["available", "occupied", "maintenance"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <GradBtn small outline onClick={() => startEditRoom(room)}><Edit3 size={12} />Edit Room</GradBtn>
                            <GradBtn small outline danger onClick={() => deleteRoom(room.id)}><Trash2 size={12} />Delete</GradBtn>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addRoom} style={{ width: "100%", height: 42, borderRadius: 16, border: "2px solid #9772F6", background: "white", color: "#9772F6", fontSize: 13, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Plus size={15} />Add Room
            </button>
          </SectionCard>

          {/* ── Gallery ── */}
          <SectionCard title="Boarding House Gallery" icon={<Image size={16} color="#9772F6" />}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {gallery.map(item => (
                <div key={item.id} style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid #F3F4F6", background: "#F9FAFB" }}>
                  <div style={{ height: 80, background: item.url ? undefined : "linear-gradient(135deg,#EDE9FE,#DDD6FE)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.url ? <img src={item.url} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} /> : <Image size={24} color="#9772F6" opacity={0.4} />}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    {editGalleryId === item.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={newGalLabel} onChange={e => setNewGalLabel(e.target.value)} style={{ flex: 1, fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB", padding: "4px 8px", fontFamily: IN }} />
                        <button onClick={() => saveGalleryLabel(item.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Check size={14} color="#16A34A" /></button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>{item.label}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setEditGalleryId(item.id); setNewGalLabel(item.label); }} style={{ background: "none", border: "none", cursor: "pointer" }}><Edit3 size={12} color="#9CA3AF" /></button>
                          <button onClick={() => deleteGalleryPhoto(item.id)} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color="#EF4444" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <label style={{ width: "100%", height: 40, borderRadius: 14, border: "2px solid #9772F6", background: "white", color: "#9772F6", fontSize: 12, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxSizing: "border-box" as const }}>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) addGalleryPhotoReal(f); e.target.value = ""; }} />
              <Plus size={14} />Upload More Photos
            </label>
          </SectionCard>

          {/* ── Rules ── */}
          <SectionCard title="Boarding House Rules" icon={<Shield size={16} color="#9772F6" />}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {rules.map((rule, i) => (
                <div key={i} style={{ background: "#F9FAFB", borderRadius: 12, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <GripVertical size={14} color="#D1D5DB" style={{ marginTop: 2, flexShrink: 0 }} />
                  {editRuleIdx === i ? (
                    <div style={{ flex: 1, display: "flex", gap: 6 }}>
                      <input value={ruleDraft} onChange={e => setRuleDraft(e.target.value)} style={{ flex: 1, fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB", padding: "5px 10px", fontFamily: IN }} />
                      <button onClick={async () => { if (await commitRules(rules.map((r, j) => j === i ? ruleDraft : r))) { setEditRuleIdx(null); showToast("Rule updated."); } }} style={{ background: "none", border: "none", cursor: "pointer" }}><Check size={14} color="#16A34A" /></button>
                      <button onClick={() => setEditRuleIdx(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={14} color="#9CA3AF" /></button>
                    </div>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 12, color: "#374151", fontFamily: IN, lineHeight: 1.55 }}>{rule}</span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => { setEditRuleIdx(i); setRuleDraft(rule); }} style={{ background: "none", border: "none", cursor: "pointer" }}><Edit3 size={12} color="#9CA3AF" /></button>
                        <button onClick={async () => { if (await commitRules(rules.filter((_, j) => j !== i))) showToast("Rule removed."); }} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={12} color="#EF4444" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {addingRule ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="Type a new rule..." style={{ ...inputStyle, flex: 1, fontSize: 12 }} />
                <button onClick={async () => { if (newRule.trim() && await commitRules([...rules, newRule.trim()])) { setNewRule(""); setAddingRule(false); showToast("Rule added."); } }} style={{ background: GRAD, border: "none", borderRadius: 10, color: "white", padding: "0 12px", cursor: "pointer" }}><Check size={14} /></button>
                <button onClick={() => setAddingRule(false)} style={{ background: "none", border: "1.5px solid #E5E7EB", borderRadius: 10, color: "#9CA3AF", padding: "0 10px", cursor: "pointer" }}><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setAddingRule(true)} style={{ width: "100%", height: 40, borderRadius: 14, border: "2px solid #9772F6", background: "white", color: "#9772F6", fontSize: 12, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={14} />Add New Rule
              </button>
            )}
          </SectionCard>

          {/* ── Payment Setup ── */}
          <SectionCard title="Payment Setup" icon={<CreditCard size={16} color="#9772F6" />}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {payments.map(pay => (
                <div key={pay.id} style={{ border: "1.5px solid #F3F4F6", borderRadius: 14, overflow: "hidden" }}>
                  {editPayId === pay.id ? (
                    <div style={{ padding: "12px 14px" }}>
                      <EditableField label="Payment Name" value={payDraft.label ?? pay.label} onChange={v => setPayDraft(d => ({ ...d, label: v }))} />
                      <EditableField label="Amount / Note" value={payDraft.amount ?? pay.amount} onChange={v => setPayDraft(d => ({ ...d, amount: v }))} />
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 6, display: "block" }}>Type</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          {(["fixed", "metered"] as const).map(t => (
                            <button key={t} onClick={() => setPayDraft(d => ({ ...d, type: t }))} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${(payDraft.type ?? pay.type) === t ? "#9772F6" : "#E5E7EB"}`, background: (payDraft.type ?? pay.type) === t ? "#F5F0FF" : "white", color: (payDraft.type ?? pay.type) === t ? "#9772F6" : "#6B7280", fontSize: 11, fontWeight: 700, fontFamily: QS, cursor: "pointer" }}>
                              {t === "fixed" ? "Fixed Rate" : "Meter-Based"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <GradBtn small outline onClick={() => setEditPayId(null)}><X size={12} />Cancel</GradBtn>
                        <GradBtn small onClick={() => savePay(pay.id)}><Save size={12} />Save</GradBtn>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{pay.label}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>
                          {pay.type === "metered" ? "Meter-based" : `₱${pay.amount}`} · {pay.enabled ? <span style={{ color: "#16A34A" }}>Enabled</span> : <span style={{ color: "#EF4444" }}>Disabled</span>}
                        </p>
                      </div>
                      <Toggle value={pay.enabled} onToggle={() => togglePayment(pay.id)} />
                      <button onClick={() => { setEditPayId(pay.id); setPayDraft({ label: pay.label, amount: pay.amount, type: pay.type }); }} style={{ background: "none", border: "none", cursor: "pointer" }}><Edit3 size={14} color="#9CA3AF" /></button>
                      {pay.custom && <button onClick={() => { deletePay(pay.id); showToast("Payment removed."); }} style={{ background: "none", border: "none", cursor: "pointer" }}><Trash2 size={14} color="#EF4444" /></button>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add custom payment */}
            {addingPay ? (
              <div style={{ border: "1.5px solid #9772F6", borderRadius: 14, padding: "14px 14px", marginBottom: 10 }}>
                <EditableField label="Payment Name" value={newPay.label} onChange={v => setNewPay(p => ({ ...p, label: v }))} placeholder="e.g. Garbage Fee" />
                <EditableField label="Amount" value={newPay.amount} onChange={v => setNewPay(p => ({ ...p, amount: v }))} placeholder="e.g. 50" />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 6, display: "block" }}>Type</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["fixed", "metered"] as const).map(t => (
                      <button key={t} onClick={() => setNewPay(p => ({ ...p, type: t }))} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${newPay.type === t ? "#9772F6" : "#E5E7EB"}`, background: newPay.type === t ? "#F5F0FF" : "white", color: newPay.type === t ? "#9772F6" : "#6B7280", fontSize: 11, fontWeight: 700, fontFamily: QS, cursor: "pointer" }}>
                        {t === "fixed" ? "Fixed Rate" : "Meter-Based"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <GradBtn small outline onClick={() => setAddingPay(false)}><X size={12} />Cancel</GradBtn>
                  <GradBtn small onClick={confirmAddPay}><Check size={12} />Confirm</GradBtn>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingPay(true)} style={{ width: "100%", height: 40, borderRadius: 14, border: "2px solid #9772F6", background: "white", color: "#9772F6", fontSize: 12, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Plus size={14} />Add Custom Payment
              </button>
            )}
          </SectionCard>

          {/* ── Student Stay Info ── */}
          <SectionCard title="Student Stay Information" icon={<BookOpen size={16} color="#9772F6" />}>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px", fontFamily: IN, lineHeight: 1.55 }}>
              Enable or disable which fields students must fill out when registering for a room.
            </p>
            {([
              ["lengthOfStay", "Length of Stay"],
              ["moveIn",       "Move-In Information"],
              ["personality",  "Personality Traits"],
              ["hobbies",      "Hobbies & Interests"],
              ["lifestyle",    "Lifestyle"],
              ["notes",        "Additional Notes"],
            ] as [keyof typeof stayToggles, string][]).map(([key, label], i, arr) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: stayToggles[key] ? "#16A34A" : "#9CA3AF", fontFamily: IN }}>{stayToggles[key] ? "Enabled" : "Disabled"}</p>
                </div>
                <Toggle value={stayToggles[key]} onToggle={() => toggleStay(key)} />
              </div>
            ))}
          </SectionCard>

          {/* ── Announcements & Schedule Settings ── */}
          <SectionCard title="Announcements & Schedule Settings" icon={<CalendarClock size={16} color="#9772F6" />}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Enable Announcements & Schedule</p>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "#6B7280", fontFamily: IN, lineHeight: 1.5 }}>
                  Show the Announcements & Schedule section on your Home Dashboard to track reminders, events, and boarding house activities.
                </p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: highlightsEnabled ? "#DCFCE7" : "#F3F4F6", fontSize: 10, fontWeight: 800, color: highlightsEnabled ? "#16A34A" : "#9CA3AF", fontFamily: QS }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: highlightsEnabled ? "#16A34A" : "#9CA3AF", display: "inline-block" }} />
                  {highlightsEnabled ? "Announcements Enabled" : "Announcements Disabled"}
                </span>
              </div>
              <Toggle value={highlightsEnabled} onToggle={() => setHighlightsEnabled && setHighlightsEnabled(!highlightsEnabled)} />
            </div>
          </SectionCard>

          {/* ── Visitor Records Settings ── */}
          <SectionCard title="Visitor Records Settings" icon={<UserCheck size={16} color="#9772F6" />}>
            {/* Main enable toggle */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Enable Visitor Records</p>
                <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontFamily: IN, lineHeight: 1.5 }}>
                  Allow students to submit visitor records. The Visitor Log card appears on your Home Dashboard.
                </p>
              </div>
              <Toggle value={visitorEnabled} onToggle={() => setVisitorEnabled && setVisitorEnabled(!visitorEnabled)} />
            </div>
            {/* Per-field toggles */}
            <div style={{ opacity: visitorEnabled ? 1 : 0.45, pointerEvents: visitorEnabled ? "auto" : "none" }}>
              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", fontFamily: QS, textTransform: "uppercase" as const }}>Fields to Collect</p>
              {([
                { key: "name",         label: "Visitor Name",     desc: "Full name of the visitor" },
                { key: "contact",      label: "Contact Number",   desc: "Mobile number of visitor" },
                { key: "relationship", label: "Relationship",     desc: "Relation to the student" },
                { key: "purpose",      label: "Purpose of Visit", desc: "Reason for visiting" },
              ] as const).map(({ key, label, desc }, i, arr) => {
                const enabled = visitorFields[key];
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: enabled ? "#1F2937" : "#9CA3AF", fontFamily: QS }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{desc}</p>
                    </div>
                    <Toggle value={enabled} onToggle={() => setVisitorFields && setVisitorFields({ ...visitorFields, [key]: !enabled })} />
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ── App Info ── */}
          <AppInfoSection />

          {/* ── Logout ── */}
          <button onClick={() => setShowLogout(true)} style={{ width: "100%", background: "white", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #FEE2E2", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}><LogOut size={16} color="#DC2626" /></div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#DC2626", fontFamily: QS }}>Log Out</span>
          </button>

        </div>
      </div>
    </div>
  );
}
