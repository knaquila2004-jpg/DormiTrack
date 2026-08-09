import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Check, CheckCircle, MapPin, Phone,
  Star, Search, Filter, Plus, X, Camera, Building2, User, Layers,
  Users, Minus, AlertCircle, Clock, Navigation, House,
} from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { GRAD, GRAD_H, Screen, BoardingHouse, RoomData, RegRequest, BOARDING_HOUSES, roomStatus, BedStatus, DEFAULT_BED_PHOTO } from "./shared";
import { FullScreenBHMap } from "./components/FullScreenBHMap";

const TRAITS   = ["Friendly","Quiet","Respectful","Responsible","Organized","Independent","Studious","Outgoing","Calm","Clean","Helpful","Disciplined"];
const HOBBIES  = ["Reading","Gaming","Watching Movies","Cooking","Music","Sports","Photography","Drawing","Programming","Fitness","Traveling","Dancing","Singing","Cycling","Volunteering"];
const LIFESTYLE = ["Early Bird","Night Owl","Minimalist","Social","Private","Pet Lover","Non-Smoker"];

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 99, border: active ? "1.5px solid #9772F6" : "1.5px solid #E5E7EB",
      background: active ? "#F5F0FF" : "white", color: active ? "#9772F6" : "#6B7280",
      fontSize: 12, fontWeight: 700, fontFamily: "'Quicksand',sans-serif", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 5, transition: "all .15s",
    }}>
      {active && <Check size={13} />}{label}
    </button>
  );
}

export function ChipGroup({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(o => <Chip key={o} label={o} active={selected.includes(o)} onClick={() => onToggle(o)} />)}
    </div>
  );
}

export function BoardingRegistrationScreen({ go, onSubmit, studentName }: { go: (s: Screen) => void; onSubmit: (r: RegRequest) => void; studentName: string }) {
  const QS = "'Quicksand',sans-serif"; const IN = "'Inter',sans-serif";
  const [view, setView] = useState<"welcome" | "list" | "details" | "roomDetails" | "allRooms" | "map" | "allRules">("welcome");
  const [roomDetailsFrom, setRoomDetailsFrom] = useState<"details" | "allRooms">("details");
  const [house, setHouse] = useState<BoardingHouse | null>(null);
  const [carousel, setCarousel] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const scrollGallery = (i: number) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const [roomId, setRoomId] = useState<string | null>(null);
  const [bedId, setBedId] = useState<string | null>(null);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [roomCarousel, setRoomCarousel] = useState(0);
  const roomGalleryRef = useRef<HTMLDivElement | null>(null);
  const scrollRoomGallery = (i: number) => {
    const el = roomGalleryRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const availableRoomsRef = useRef<HTMLDivElement | null>(null);
  const scrollToRoomsRef = useRef(false);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const [stayUnit, setStayUnit] = useState<"Weeks" | "Months">("Months");
  const [stayCount, setStayCount] = useState("1");
  const [moveIn, setMoveIn] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // After confirming a room & bed, land back on the "Available Rooms" section
  // instead of the top of the boarding house page.
  useEffect(() => {
    if (view === "details" && scrollToRoomsRef.current) {
      scrollToRoomsRef.current = false;
      requestAnimationFrame(() => {
        availableRoomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [view]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const selectedRoom = house?.rooms.find(r => r.id === roomId) ?? null;
  const pendingRoom = house?.rooms.find(r => r.id === pendingRoomId) ?? null;
  const selectedBedLabel = selectedRoom?.beds?.find(b => b.id === bedId)?.label ?? null;
  const dateInvalid = moveIn && moveOut && new Date(moveOut) <= new Date(moveIn);

  const openHouse = (h: BoardingHouse) => {
    setHouse(h); setCarousel(0); setRoomId(null); setBedId(null); setView("details");
    setErrors([]);
  };

  const openRoomDetails = (r: RoomData) => {
    setPendingRoomId(r.id); setSelectedBed(null); setRoomCarousel(0); setRoomDetailsFrom("details"); setView("roomDetails");
  };

  const confirmRoomAndBed = () => {
    if (!selectedBed) return;
    setRoomId(pendingRoomId);
    setBedId(selectedBed);
    setPendingRoomId(null);
    setSelectedBed(null);
    scrollToRoomsRef.current = true;
    setView("details");
  };

  const handleSubmit = () => {
    const e: string[] = [];
    if (!house) e.push("Select a boarding house");
    if (!selectedRoom) e.push("Select an available room");
    if (!bedId) e.push("Select a bed in the chosen room");
    if (!stayCount || Number(stayCount) < 1) e.push("Enter stay duration");
    if (!moveIn) e.push("Select a move-in date");
    if (!moveOut) e.push("Select an expected move-out date");
    if (dateInvalid) e.push("Move-out date must be later than move-in date");
    setErrors(e);
    if (e.length === 0 && house && selectedRoom && bedId) {
      onSubmit({
        studentName, house, room: selectedRoom, bed: selectedBedLabel ?? bedId,
        moveIn, moveOut, stayUnit, stayCount,
        traits, hobbies, lifestyle, notes,
        submittedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      });
    }
  };

  // ── WELCOME (non-dismissible gate) ──────────────────────────────────────────
  if (view === "welcome") {
    return (
      <div style={{ height: "100%", backgroundImage: GRAD_H, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ width: 92, height: 92, borderRadius: 30, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <Building2 size={44} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: "0 0 12px", fontFamily: QS }}>Choose your Boarding House!</h1>
          <p style={{ color: "rgba(255,255,255,.82)", fontSize: 14, lineHeight: 1.6, margin: "0 0 8px", fontFamily: IN }}>
            Welcome to DormiTrack, {studentName.split(" ")[0]}!
          </p>
          <p style={{ color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px", fontFamily: IN }}>
            Before you can explore the app, you need to register to a boarding house. Choose where you'll be staying and send a request to the landlord.
          </p>
          <button onClick={() => setView("list")} style={{ width: "100%", padding: "16px 0", borderRadius: 24, background: "white", color: "#9772F6", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // ── ROOM DETAILS + BED SELECTION ──────────────────────────────────────────
  if (view === "roomDetails" && house && pendingRoom) {
    const roomPhotos = pendingRoom.photos?.length ? pendingRoom.photos : [pendingRoom.photo];
    const beds = pendingRoom.beds ?? [];
    const st = roomStatus(pendingRoom);
    const left = pendingRoom.cap - pendingRoom.occ;
    const bedColors: Record<BedStatus, { bg: string; border: string; text: string; label: string }> = {
      available:   { bg: "#DCFCE7", border: "#16A34A", text: "#15803D", label: "Available"   },
      occupied:    { bg: "#FEE2E2", border: "#EF4444", text: "#B91C1C", label: "Occupied"    },
      reserved:    { bg: "#FEF3C7", border: "#D97706", text: "#92400E", label: "Reserved"    },
      maintenance: { bg: "#F3F4F6", border: "#9CA3AF", text: "#6B7280", label: "Maintenance" },
    };

    return (
      <div style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
        {/* Room photo carousel */}
        <div style={{ position: "relative", height: 240 }}>
          <div ref={roomGalleryRef}
            onScroll={e => setRoomCarousel(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", height: "100%", scrollbarWidth: "none" as const, WebkitOverflowScrolling: "touch", touchAction: "pan-x", overscrollBehaviorX: "contain" }}>
            {roomPhotos.map((url, i) => (
              <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "start", position: "relative" }}>
                <ImageWithFallback src={url} alt={`${pendingRoom.name} photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.4) 0%,transparent 35%,transparent 65%,rgba(0,0,0,.45) 100%)" }} />
              </div>
            ))}
          </div>
          {/* Back button */}
          <button onClick={() => setView(roomDetailsFrom)} style={{ position: "absolute", top: 50, left: 16, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5, padding: 4 }}>
            <ChevronLeft size={22} color="white" />
          </button>
          {/* Image counter */}
          <span style={{ position: "absolute", top: 50, right: 16, background: "rgba(0,0,0,.45)", color: "white", fontSize: 11, fontWeight: 700, fontFamily: QS, padding: "5px 11px", borderRadius: 99, zIndex: 5 }}>
            {roomCarousel + 1} / {roomPhotos.length}
          </span>
          {/* Nav arrows */}
          {roomCarousel > 0 && (
            <button onClick={() => scrollRoomGallery(roomCarousel - 1)} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,.38)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
              <ChevronLeft size={16} color="white" />
            </button>
          )}
          {roomCarousel < roomPhotos.length - 1 && (
            <button onClick={() => scrollRoomGallery(roomCarousel + 1)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,.38)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
              <ChevronRight size={16} color="white" />
            </button>
          )}
          {/* Dot indicators */}
          {roomPhotos.length > 1 && (
            <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 5 }}>
              {roomPhotos.map((_, i) => (
                <div key={i} onClick={() => scrollRoomGallery(i)} style={{ width: i === roomCarousel ? 18 : 6, height: 6, borderRadius: 6, background: i === roomCarousel ? "white" : "rgba(255,255,255,.5)", transition: "width .2s", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 16px 24px" }}>
          {/* Room info card */}
          <div style={{ background: "white", borderRadius: 22, padding: 16, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h1 style={{ color: "#1F2937", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: QS }}>{pendingRoom.name}</h1>
              <span style={{ padding: "3px 11px", borderRadius: 99, background: st.bg, color: st.color, fontSize: 11, fontWeight: 800, fontFamily: QS }}>{st.label}</span>
            </div>
            {pendingRoom.description && (
              <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 14px", lineHeight: 1.6 }}>{pendingRoom.description}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Capacity", value: pendingRoom.cap, color: "#3B82F6", bg: "#EFF6FF", isAvailStat: false, isCapStat: true },
                { label: "Occupants", value: pendingRoom.occ, color: "#F59E0B", bg: "#FEF3C7", isAvailStat: false, isCapStat: false },
                { label: "Available", value: Math.max(0, left), color: "#16A34A", bg: "#DCFCE7", isAvailStat: true, isCapStat: false },
              ].map(({ label, value, color, bg, isAvailStat, isCapStat }) => (
                <div key={label} style={{ background: bg, borderRadius: 16, padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {isAvailStat ? (
                    <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                      <rect x="1" y="6" width="18" height="9" rx="3" fill={color} opacity=".7"/>
                      <rect x="2" y="1" width="16" height="8" rx="3" fill={color} opacity=".4"/>
                      <rect x="3" y="2" width="5" height="5" rx="2.5" fill="white" opacity=".9"/>
                    </svg>
                  ) : isCapStat ? (
                    <Users size={18} color={color} />
                  ) : (
                    <User size={18} color={color} />
                  )}
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#1F2937", fontFamily: QS, lineHeight: 1 }}>{value}</span>
                  <span style={{ fontSize: 10, color: "#6B7280" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Room amenities */}
          {pendingRoom.roomAmenities && pendingRoom.roomAmenities.length > 0 && (
            <div style={{ background: "white", borderRadius: 22, padding: 16, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
              <p style={{ color: "#9772F6", fontSize: 13, fontWeight: 800, fontFamily: QS, margin: "0 0 12px" }}>Room Amenities</p>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                {pendingRoom.roomAmenities.map(a => (
                  <div key={a} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 12, background: "#F5F0FF" }}>
                    <Check size={11} color="#9772F6" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#7549F6", fontFamily: QS }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bed selection */}
          <div style={{ background: "white", borderRadius: 22, padding: 16, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
            <div style={{ marginBottom: 4 }}>
              <p style={{ color: "#9772F6", fontSize: 13, fontWeight: 800, fontFamily: QS, margin: 0 }}>Select Your Bed</p>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
              {(["available","occupied","reserved"] as BedStatus[]).map(s => {
                const c = bedColors[s];
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c.border }} />
                    <span style={{ fontSize: 10, color: "#6B7280", fontFamily: QS, fontWeight: 600, textTransform: "capitalize" as const }}>{c.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {beds.filter(bed => bed.status !== "maintenance").map(bed => {
                const c = bedColors[bed.status];
                const isAvail = bed.status === "available";
                const isSel = selectedBed === bed.id;
                return (
                  <button key={bed.id} disabled={!isAvail} onClick={() => setSelectedBed(isSel ? null : bed.id)}
                    style={{
                      borderRadius: 20,
                      border: isSel ? "2.5px solid #9772F6" : isAvail ? "2px solid #16A34A" : `2px solid ${c.border}`,
                      background: isSel ? "linear-gradient(145deg,#F5F0FF,#EDE9FE)" : isAvail ? "white" : c.bg,
                      cursor: isAvail ? "pointer" : "not-allowed", opacity: isAvail ? 1 : 0.6,
                      display: "flex", flexDirection: "column" as const, alignItems: "center",
                      padding: "16px 8px 12px", position: "relative",
                      transition: "all .18s ease",
                      boxShadow: isSel ? "0 6px 22px rgba(151,114,246,.28)" : isAvail ? "0 2px 8px rgba(22,163,74,.1)" : "none",
                    }}>
                    {/* Check badge */}
                    {isSel && (
                      <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(151,114,246,.4)", zIndex: 2 }}>
                        <Check size={12} color="white" strokeWidth={3} />
                      </div>
                    )}
                    {/* Bed photo — landlord-uploaded when available, else a clean default */}
                    <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 14, overflow: "hidden", marginBottom: 10, position: "relative", background: "#F3F4F6", border: isSel ? "1.5px solid #C4B5FD" : "1px solid rgba(0,0,0,.05)" }}>
                      <ImageWithFallback
                        src={bed.photo || pendingRoom.photo || DEFAULT_BED_PHOTO}
                        alt={`${bed.label} photo`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: isAvail ? "none" : "grayscale(55%)", opacity: isAvail ? 1 : 0.7, transition: "all .18s ease" }}
                      />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: isSel ? "#7549F6" : "#1F2937", fontFamily: QS, marginBottom: 5 }}>{bed.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isSel ? "#9772F6" : c.text, background: isSel ? "rgba(151,114,246,.1)" : c.bg, border: `1px solid ${isSel ? "rgba(151,114,246,.3)" : c.border + "55"}`, padding: "3px 10px", borderRadius: 99, fontFamily: QS }}>
                      {isSel ? "Selected" : c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selection summary */}
          {selectedBed && (() => {
            const bed = beds.find(b => b.id === selectedBed);
            return (
              <div style={{ background: "linear-gradient(135deg,#F5F0FF,#EDE9FE)", borderRadius: 20, padding: "16px", marginBottom: 14, border: "1.5px solid #DDD6FE" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckCircle size={16} color="white" />
                  </div>
                  <p style={{ color: "#7549F6", fontSize: 13, fontWeight: 800, fontFamily: QS, margin: 0 }}>Your Selection</p>
                </div>
                {[
                  ["Selected Room", pendingRoom.name],
                  ["Selected Bed", bed?.label ?? ""],
                  ["Bed Type", pendingRoom.bedType === "double-deck" ? "Double Deck" : "Single Bed"],
                  ["Capacity", `${pendingRoom.cap} Students`],
                  ["Available Beds", String(Math.max(0, left))],
                ].map(([k, v], i, arr) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(167,139,250,.2)" : "none" }}>
                    <span style={{ fontSize: 12, color: "#7C3AED", fontFamily: QS }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#7549F6", fontFamily: QS }}>{v}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Confirm button */}
          <button onClick={confirmRoomAndBed} disabled={!selectedBed}
            style={{ width: "100%", height: 56, borderRadius: 24, border: "none", cursor: selectedBed ? "pointer" : "not-allowed", fontFamily: QS, fontSize: 15, fontWeight: 800, letterSpacing: .3, color: selectedBed ? "white" : "#9CA3AF", background: selectedBed ? GRAD : "#E5E7EB", boxShadow: selectedBed ? "0 8px 28px rgba(151,114,246,.4)" : "none", transition: "all .22s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Confirm Room & Bed
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 1: LIST ────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
        <div style={{ flexShrink: 0, padding: "52px 20px 24px", backgroundImage: GRAD_H, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "0 0 6px", fontFamily: QS }}>Choose Your Boarding House</h1>
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, margin: 0, fontFamily: IN, lineHeight: 1.5 }}>Select the boarding house where you will be staying.</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 16px 28px" }}>
          {BOARDING_HOUSES.map(h => {
            const avail = h.rooms.filter(r => r.cap - r.occ > 0).length;
            return (
              <div key={h.id} style={{ background: "white", borderRadius: 24, overflow: "hidden", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.07)" }}>
                <div style={{ position: "relative", height: 150 }}>
                  <ImageWithFallback src={h.cover} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,.55)", borderRadius: 99, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                    <Star size={12} color="#FBBF24" fill="#FBBF24" />
                    <span style={{ color: "white", fontSize: 12, fontWeight: 700, fontFamily: QS }}>{h.rating}</span>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <h2 style={{ color: "#1F2937", fontSize: 16, fontWeight: 800, margin: "0 0 4px", fontFamily: QS }}>{h.name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                    <MapPin size={12} color="#9772F6" />
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{h.address}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
                    <User size={12} color="#9CA3AF" />
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{h.landlord}{h.contact ? ` · ${h.contact}` : ""}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px", lineHeight: 1.5 }}>{h.desc}</p>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 800, fontFamily: QS, background: "#DCFCE7", borderRadius: 99, padding: "4px 10px" }}>{avail} rooms available</span>
                  </div>
                  <button onClick={() => openHouse(h)} style={{ width: "100%", padding: "12px 0", borderRadius: 16, backgroundImage: GRAD, color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, boxShadow: "0 4px 14px rgba(151,114,246,.28)" }}>
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ALL ROOMS ───────────────────────────────────────────────────────────────
  if (view === "allRooms" && house) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
        <div style={{ flexShrink: 0, padding: "52px 20px 20px", backgroundImage: GRAD_H, position: "relative" }}>
          <button onClick={() => setView("details")} style={{ position: "absolute", top: 50, left: 16, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4 }}>
            <ChevronLeft size={20} color="white" />
          </button>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: QS, paddingLeft: 36 }}>All Rooms</h1>
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 12, margin: 0, fontFamily: IN, paddingLeft: 36 }}>{house.name} · {house.rooms.length} rooms total</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 16px 28px" }}>
          {house.rooms.map(r => {
            const st = roomStatus(r); const left = r.cap - r.occ; const full = left <= 0;
            return (
              <div key={r.id} style={{ borderRadius: 16, marginBottom: 10, border: "2px solid #F3F4F6", background: "white", overflow: "hidden", opacity: full ? .6 : 1 }}>
                <div style={{ display: "flex", gap: 12, padding: 10 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                    <ImageWithFallback src={r.photo} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{r.name}</span>
                      <span style={{ padding: "2px 9px", borderRadius: 99, background: st.bg, color: st.color, fontSize: 10, fontWeight: 800, fontFamily: QS }}>{st.label}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                      {[
                        { lbl: "Cap", val: r.cap, c: "#3B82F6", bg: "#EFF6FF", isBed: false, isUser: true },
                        { lbl: "Occ", val: r.occ, c: "#F59E0B", bg: "#FEF3C7", isBed: false, isUser: false },
                        { lbl: "Avail", val: Math.max(0, left), c: "#16A34A", bg: "#DCFCE7", isBed: true, isUser: false },
                      ].map(({ lbl, val, c, bg, isBed, isUser }) => (
                        <div key={lbl} style={{ background: bg, borderRadius: 8, padding: "4px 0", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 1 }}>
                          {isBed ? (
                            <svg width="12" height="9" viewBox="0 0 20 16"><rect x="1" y="6" width="18" height="9" rx="3" fill={c} opacity=".7"/><rect x="2" y="1" width="16" height="8" rx="3" fill={c} opacity=".4"/><rect x="3" y="2" width="5" height="5" rx="2.5" fill="white" opacity=".9"/></svg>
                          ) : isUser ? <Users size={11} color={c} /> : <User size={11} color={c} />}
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#1F2937", fontFamily: QS, lineHeight: 1 }}>{val}</span>
                          <span style={{ fontSize: 9, color: "#6B7280" }}>{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {!full && (
                  <button onClick={() => { setPendingRoomId(r.id); setSelectedBed(null); setRoomCarousel(0); setRoomDetailsFrom("allRooms"); setView("roomDetails"); }}
                    style={{ margin: "0 10px 10px", padding: "10px 0", borderRadius: 12, backgroundImage: GRAD, border: "none", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: QS, width: "calc(100% - 20px)", display: "block", boxShadow: "0 3px 10px rgba(151,114,246,.25)" }}>
                    View Room Details
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── MAP VIEW ────────────────────────────────────────────────────────────────
  if (view === "map" && house) {
    return (
      <FullScreenBHMap
        bh={{ name: house.name, address: house.address, landlord: house.landlord, contact: house.contact, lat: house.lat, lng: house.lng }}
        onClose={() => setView("details")}
      />
    );
  }

  // ── ALL RULES ────────────────────────────────────────────────────────────────
  if (view === "allRules" && house) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
        <div style={{ flexShrink: 0, padding: "52px 20px 20px", backgroundImage: GRAD_H, position: "relative" as const }}>
          <button onClick={() => setView("details")} style={{ position: "absolute" as const, top: 50, left: 16, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4 }}>
            <ChevronLeft size={20} color="white" />
          </button>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: QS, paddingLeft: 36 }}>Boarding House Rules</h1>
          <p style={{ color: "rgba(255,255,255,.75)", fontSize: 12, margin: 0, fontFamily: IN, paddingLeft: 36 }}>{house.name} · {house.rules?.length ?? 0} rules</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 16px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {(house.rules ?? []).map((rule, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 16, background: "white", boxShadow: "0 1px 6px rgba(0,0,0,.05)" }}>
                <div style={{ width: 26, height: 26, borderRadius: 9, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#9772F6", fontFamily: QS }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, paddingTop: 3 }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DETAILS + FORM ──────────────────────────────────────────────────────────
  if (!house) return null;
  const cap = house.rooms.reduce((s, r) => s + r.cap, 0);
  const occ = house.rooms.reduce((s, r) => s + r.occ, 0);
  const stats = [
    { label: "Total Rooms", value: house.rooms.length, Icon: Layers, color: "#9772F6", bg: "#F5F0FF" },
    { label: "Total Capacity", value: cap, Icon: Building2, color: "#3B82F6", bg: "#EFF6FF" },
    { label: "Current Occupants", value: occ, Icon: Users, color: "#F59E0B", bg: "#FEF3C7" },
    { label: "Available Slots", value: cap - occ, Icon: null, color: "#16A34A", bg: "#DCFCE7" },
  ];
  const sec: React.CSSProperties = { color: "#9772F6", fontSize: 13, fontWeight: 800, fontFamily: QS, margin: "0 0 12px", letterSpacing: .2 };
  const card: React.CSSProperties = { background: "white", borderRadius: 22, padding: 16, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,.05)" };

  return (
    <div style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      {/* Image carousel */}
      <div style={{ position: "relative", height: 260 }}>
        <div ref={galleryRef} onScroll={e => setCarousel(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", height: "100%", scrollbarWidth: "none" as const, WebkitOverflowScrolling: "touch", touchAction: "pan-x", cursor: "grab", overscrollBehaviorX: "contain" }}>
          {house.gallery.map((g, i) => (
            <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "start", position: "relative" }}>
              <ImageWithFallback src={g.url} alt={g.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.35) 0%,transparent 30%,transparent 60%,rgba(0,0,0,.4) 100%)" }} />
              <span style={{ position: "absolute", bottom: 40, left: 16, color: "white", fontSize: 12, fontWeight: 700, fontFamily: QS, background: "rgba(0,0,0,.4)", padding: "3px 10px", borderRadius: 99 }}>{g.label}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setView("list")} style={{ position: "absolute", top: 50, left: 16, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5, padding: 4 }}>
          <ChevronLeft size={22} color="white" />
        </button>
        <span style={{ position: "absolute", top: 50, right: 16, background: "rgba(0,0,0,.45)", color: "white", fontSize: 11, fontWeight: 700, fontFamily: QS, padding: "5px 11px", borderRadius: 99, zIndex: 5 }}>
          {carousel + 1} / {house.gallery.length}
        </span>
        {carousel > 0 && (
          <button onClick={() => scrollGallery(carousel - 1)} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,.4)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
            <ChevronLeft size={18} color="white" />
          </button>
        )}
        {carousel < house.gallery.length - 1 && (
          <button onClick={() => scrollGallery(carousel + 1)} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,.4)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
            <ChevronRight size={18} color="white" />
          </button>
        )}
        <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 5 }}>
          {house.gallery.map((_, i) => (
            <div key={i} onClick={() => scrollGallery(i)} style={{ width: i === carousel ? 20 : 6, height: 6, borderRadius: 6, background: i === carousel ? "white" : "rgba(255,255,255,.5)", transition: "width .2s", cursor: "pointer" }} />
          ))}
        </div>
      </div>

      <div style={{ padding: "18px 16px 32px" }}>
        {/* House info */}
        <div style={{ ...card }}>
          {/* Name + rating */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
            <h1 style={{ color: "#1F2937", fontSize: 19, fontWeight: 800, margin: 0, fontFamily: QS, flex: 1, paddingRight: 8 }}>{house.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#FEF3C7", borderRadius: 99, padding: "3px 9px", flexShrink: 0 }}>
              <Star size={12} color="#D97706" fill="#D97706" />
              <span style={{ color: "#D97706", fontSize: 12, fontWeight: 800, fontFamily: QS }}>{house.rating}</span>
            </div>
          </div>
          {/* Contact number directly under name */}
          {house.contact && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <Phone size={12} color="#16A34A" />
              <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, fontFamily: QS }}>{house.contact}</span>
            </div>
          )}
          {/* Address */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
            <MapPin size={13} color="#9772F6" /><span style={{ fontSize: 12, color: "#6B7280" }}>{house.address}</span>
          </div>
          {/* Landlord row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: "#F9FAFB", marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User size={16} color="white" />
            </div>
            <div>
              <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0 }}>Landlord</p>
              <p style={{ fontSize: 13, color: "#1F2937", fontWeight: 700, margin: 0, fontFamily: QS }}>{house.landlord}</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{house.desc}</p>
        </div>

        {/* Amenities */}
        <div style={card}>
          <p style={sec}>Amenities</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {house.amenities.map(a => (
              <div key={a.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 14, background: "#F5F0FF" }}>
                <a.Icon size={15} color="#9772F6" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#7549F6", fontFamily: QS }}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div style={card}>
          <p style={sec}>Boarding House Statistics</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {stats.map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "#F9FAFB" }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {s.Icon ? <s.Icon size={19} color={s.color} /> : (
                    <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                      <rect x="0" y="5" width="3" height="10" rx="1.5" fill={s.color} opacity=".6"/>
                      <rect x="17" y="5" width="3" height="10" rx="1.5" fill={s.color} opacity=".6"/>
                      <rect x="0" y="4" width="20" height="3" rx="1.5" fill={s.color}/>
                      <rect x="3" y="7" width="14" height="7" rx="2" fill={s.color} opacity=".25"/>
                      <rect x="4" y="8" width="5" height="4" rx="2" fill="white" opacity=".9"/>
                      <rect x="0" y="13" width="20" height="3" rx="1.5" fill={s.color} opacity=".7"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#1F2937", margin: 0, lineHeight: 1, fontFamily: QS }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: "#6B7280", margin: "3px 0 0" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={card}>
          <p style={sec}>Location</p>
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 12, position: "relative" as const, height: 160, background: "linear-gradient(135deg,#E0E7FF,#EDE9FE)" }}>
            <svg width="100%" height="160" style={{ position: "absolute" as const, inset: 0 }}>
              {[0,1,2,3,4,5,6].map(i => (
                <line key={`h${i}`} x1="0" y1={i*27} x2="100%" y2={i*27} stroke="rgba(139,92,246,.15)" strokeWidth="1"/>
              ))}
              {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                <line key={`v${i}`} x1={i*30} y1="0" x2={i*30} y2="160" stroke="rgba(139,92,246,.15)" strokeWidth="1"/>
              ))}
              <rect x="0" y="68" width="100%" height="10" fill="rgba(167,139,250,.25)"/>
              <rect x="150" y="0" width="10" height="160" fill="rgba(167,139,250,.25)"/>
            </svg>
            <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%,-80%)", display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(151,114,246,.45)" }}>
                <MapPin size={18} color="white" fill="white" />
              </div>
              <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #7549F6", marginTop: -1 }} />
            </div>
            <div style={{ position: "absolute" as const, bottom: 10, left: 10, background: "white", borderRadius: 10, padding: "4px 10px", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#7549F6", fontFamily: QS }}>{house.address}</span>
            </div>
            <div style={{ position: "absolute" as const, top: 10, right: 10, background: "rgba(255,255,255,.9)", borderRadius: 10, padding: "4px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", fontFamily: QS }}>~5 min from BISU</span>
            </div>
          </div>
          <button onClick={() => setView("map")} style={{ width: "100%", height: 48, borderRadius: 24, border: "none", background: GRAD, color: "white", fontSize: 13, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>
            <MapPin size={16} color="white" />
            Show Map
          </button>
        </div>

        {/* Boarding House Rules */}
        <div style={card}>
          <p style={sec}>Boarding House Rules</p>
          {house.rules && house.rules.length > 0 ? (
            <>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {house.rules.slice(0, 5).map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 14, background: "#F9FAFB" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 8, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#9772F6", fontFamily: QS }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.55 }}>{rule}</span>
                  </div>
                ))}
              </div>
              {house.rules.length > 5 && (
                <button onClick={() => setView("allRules")}
                  style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: "2px solid #E5E7EB", background: "white", color: "#9772F6", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <ChevronRight size={16} color="#9772F6" />
                  See All {house.rules.length} Rules
                </button>
              )}
            </>
          ) : (
            <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" as const, margin: 0 }}>No boarding house rules have been provided.</p>
          )}
        </div>

        {/* Payment Setup */}
        {house.payment && (() => {
          const p = house.payment!;
          const isMetered = p.electric.type === "metered" || p.water.type === "metered";
          const electricAmt = p.electric.type === "fixed" ? (p.electric.amount ?? 0) : null;
          const waterAmt = p.water.type === "fixed" ? (p.water.amount ?? 0) : null;
          const internetAmt = p.internet.type === "separate" ? (p.internet.amount ?? 0) : 0;
          const fixedTotal = p.rent + (electricAmt ?? 0) + (waterAmt ?? 0) + internetAmt;
          const rows: [string, string][] = [
            ["Monthly Rent", `₱${p.rent.toLocaleString()}`],
            ["Electricity", p.electric.type === "fixed" ? `₱${p.electric.amount?.toLocaleString()} / Month` : "Meter-Based"],
            ["Water", p.water.type === "fixed" ? `₱${p.water.amount?.toLocaleString()} / Month` : "Meter-Based"],
            ["Internet", p.internet.type === "included" ? "Included" : `₱${p.internet.amount?.toLocaleString()} / Month`],
          ];
          return (
            <div style={card}>
              <p style={sec}>Payment Setup</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 0, marginBottom: 14, borderRadius: 14, overflow: "hidden", border: "1.5px solid #F3F4F6" }}>
                {rows.map(([label, val], i) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: i % 2 === 0 ? "white" : "#FAFAFA", borderBottom: i < rows.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: label === "Monthly Rent" ? "#9772F6" : "#1F2937", fontFamily: QS }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "linear-gradient(135deg,#F5F0FF,#EDE9FE)", borderRadius: 16, padding: "14px 16px", border: "1.5px solid #DDD6FE" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", margin: "0 0 10px", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: .5 }}>Estimated Monthly Cost</p>
                {rows.map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#7C3AED" }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#7549F6", fontFamily: QS }}>{val}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: "rgba(167,139,250,.3)", margin: "10px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#7549F6", fontFamily: QS }}>Estimated Total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#9772F6", fontFamily: QS }}>₱{fixedTotal.toLocaleString()}{isMetered ? "+" : ""} / Month</span>
                </div>
                {isMetered && (
                  <p style={{ fontSize: 10, color: "#9CA3AF", margin: "8px 0 0", fontStyle: "italic" as const, lineHeight: 1.5 }}>* Utility charges may vary based on actual consumption.</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Available rooms */}
        <div ref={availableRoomsRef} style={card}>
          <p style={sec}>Available Rooms</p>
          {(() => {
            // ── If a room is confirmed → show ONLY that room ──────────────────
            if (roomId) {
              const r = house.rooms.find(rm => rm.id === roomId);
              if (!r) return null;
              const st = roomStatus(r);
              return (
                <div style={{ borderRadius: 16, border: "2px solid #E5E7EB", background: "#F9FAFB", overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 12, padding: 12 }}>
                    <div style={{ width: 76, height: 76, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                      <ImageWithFallback src={r.photo} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <CheckCircle size={15} color="#16A34A" />
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{r.name}</span>
                        <span style={{ marginLeft: "auto", padding: "2px 9px", borderRadius: 99, background: st.bg, color: st.color, fontSize: 10, fontWeight: 800, fontFamily: QS }}>{st.label}</span>
                      </div>
                      {/* Mini stats: Cap / Occ / Avail */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                        {[
                          { lbl: "Capacity", val: r.cap, c: "#3B82F6", bg: "#EFF6FF", isBed: false, isUser: true },
                          { lbl: "Occupants", val: r.occ, c: "#F59E0B", bg: "#FEF3C7", isBed: false, isUser: false },
                          { lbl: "Available", val: Math.max(0, r.cap - r.occ), c: "#16A34A", bg: "#DCFCE7", isBed: true, isUser: false },
                        ].map(({ lbl, val, c, bg, isBed, isUser }) => (
                          <div key={lbl} style={{ background: bg, borderRadius: 10, padding: "6px 0", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                            {isBed ? (
                              <svg width="14" height="11" viewBox="0 0 20 16"><rect x="1" y="6" width="18" height="9" rx="3" fill={c} opacity=".7"/><rect x="2" y="1" width="16" height="8" rx="3" fill={c} opacity=".4"/><rect x="3" y="2" width="5" height="5" rx="2.5" fill="white" opacity=".9"/></svg>
                            ) : isUser ? <Users size={12} color={c} /> : <User size={12} color={c} />}
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, lineHeight: 1 }}>{val}</span>
                            <span style={{ fontSize: 9, color: "#6B7280" }}>{lbl}</span>
                          </div>
                        ))}
                      </div>
                      {/* Selected bed — left-aligned */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <CheckCircle size={12} color="#16A34A" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", fontFamily: QS }}>Selected Bed: {selectedBedLabel}</span>
                      </div>
                    </div>
                  </div>
                  {/* Change Room — gradient green */}
                  <button onClick={() => { setRoomId(null); setBedId(null); }}
                    style={{ margin: "0 12px 12px", padding: "11px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#22C55E,#16A34A)", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: QS, width: "calc(100% - 24px)", boxShadow: "0 4px 14px rgba(22,163,74,.3)", display: "block" }}>
                    Change Room
                  </button>
                </div>
              );
            }
            // ── No room confirmed → show first 3 + See More ───────────────────
            const visible = house.rooms.slice(0, 3);
            const hasMore = house.rooms.length > 3;
            return (
              <>
                {visible.map(r => {
                  const st = roomStatus(r); const left = r.cap - r.occ; const full = left <= 0;
                  return (
                    <div key={r.id} style={{ borderRadius: 16, marginBottom: 10, border: "2px solid #F3F4F6", background: "white", overflow: "hidden", opacity: full ? .6 : 1 }}>
                      <div style={{ display: "flex", gap: 12, padding: 10 }}>
                        <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                          <ImageWithFallback src={r.photo} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{r.name}</span>
                            <span style={{ padding: "2px 9px", borderRadius: 99, background: st.bg, color: st.color, fontSize: 10, fontWeight: 800, fontFamily: QS }}>{st.label}</span>
                          </div>
                          {/* Mini stats */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 6 }}>
                            {[
                              { lbl: "Cap", val: r.cap, c: "#3B82F6", bg: "#EFF6FF", isBed: false, isUser: true },
                              { lbl: "Occ", val: r.occ, c: "#F59E0B", bg: "#FEF3C7", isBed: false, isUser: false },
                              { lbl: "Avail", val: Math.max(0, left), c: "#16A34A", bg: "#DCFCE7", isBed: true, isUser: false },
                            ].map(({ lbl, val, c, bg, isBed, isUser }) => (
                              <div key={lbl} style={{ background: bg, borderRadius: 8, padding: "4px 0", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 1 }}>
                                {isBed ? (
                                  <svg width="12" height="9" viewBox="0 0 20 16"><rect x="1" y="6" width="18" height="9" rx="3" fill={c} opacity=".7"/><rect x="2" y="1" width="16" height="8" rx="3" fill={c} opacity=".4"/><rect x="3" y="2" width="5" height="5" rx="2.5" fill="white" opacity=".9"/></svg>
                                ) : isUser ? <Users size={11} color={c} /> : <User size={11} color={c} />}
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#1F2937", fontFamily: QS, lineHeight: 1 }}>{val}</span>
                                <span style={{ fontSize: 9, color: "#6B7280" }}>{lbl}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {!full && (
                        <button onClick={() => openRoomDetails(r)}
                          style={{ margin: "0 10px 10px", padding: "10px 0", borderRadius: 12, backgroundImage: GRAD, border: "none", color: "white", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: QS, width: "calc(100% - 20px)", display: "block", boxShadow: "0 3px 10px rgba(151,114,246,.25)" }}>
                          View Room Details
                        </button>
                      )}
                    </div>
                  );
                })}
                {hasMore && (
                  <button onClick={() => setView("allRooms")}
                    style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "2px solid #E5E7EB", background: "white", color: "#9772F6", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ChevronRight size={16} color="#9772F6" />
                    See All {house.rooms.length} Rooms
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Stay information */}
        <div style={card}>
          <p style={sec}>Stay Information</p>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 8 }}>Length of Stay</label>
          <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 14, padding: 4, marginBottom: 14 }}>
            {(["Weeks", "Months"] as const).map(u => (
              <button key={u} onClick={() => setStayUnit(u)} style={{
                flex: 1, padding: "10px 0", borderRadius: 11, border: "none", cursor: "pointer",
                background: stayUnit === u ? "white" : "transparent", color: stayUnit === u ? "#9772F6" : "#6B7280",
                fontSize: 13, fontWeight: 800, fontFamily: QS, boxShadow: stayUnit === u ? "0 2px 8px rgba(0,0,0,.08)" : "none",
              }}>{u}</button>
            ))}
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 8 }}>Number of {stayUnit}</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setStayCount(String(Math.max(1, Number(stayCount) - 1)))} style={{ width: 44, height: 44, borderRadius: 13, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={18} color="#9772F6" /></button>
            <input value={stayCount} onChange={e => setStayCount(e.target.value.replace(/\D/g, ""))} style={{ flex: 1, textAlign: "center", padding: "12px 0", borderRadius: 13, border: "1.5px solid #E5E7EB", background: "#F9FAFB", fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS, outline: "none" }} />
            <button onClick={() => setStayCount(String(Number(stayCount || "0") + 1))} style={{ width: 44, height: 44, borderRadius: 13, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} color="#9772F6" /></button>
          </div>
        </div>

        {/* Move-in information */}
        <div style={card}>
          <p style={sec}>Move-in Information</p>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 6 }}>Move-in Date</label>
          <input type="date" value={moveIn} onChange={e => setMoveIn(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "#F9FAFB", fontSize: 14, color: moveIn ? "#1F2937" : "#9CA3AF", fontFamily: IN, outline: "none", marginBottom: 14 }} />
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 6 }}>Expected Move-out Date</label>
          <input type="date" value={moveOut} onChange={e => setMoveOut(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 14, border: `1.5px solid ${dateInvalid ? "#EF4444" : "#E5E7EB"}`, background: "#F9FAFB", fontSize: 14, color: moveOut ? "#1F2937" : "#9CA3AF", fontFamily: IN, outline: "none" }} />
          {dateInvalid && <p style={{ fontSize: 11, color: "#EF4444", margin: "6px 0 0", fontFamily: IN }}>Move-out date must be later than move-in date.</p>}
        </div>

        {/* Student profile for landlord */}
        <div style={card}>
          <p style={sec}>Tell the Landlord About Yourself</p>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>This information helps the landlord know more about you before approving your registration.</p>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 10 }}>Personality Traits</label>
          <div style={{ marginBottom: 18 }}><ChipGroup options={TRAITS} selected={traits} onToggle={toggle(setTraits)} /></div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 10 }}>Hobbies & Interests</label>
          <div style={{ marginBottom: 18 }}><ChipGroup options={HOBBIES} selected={hobbies} onToggle={toggle(setHobbies)} /></div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 10 }}>Lifestyle</label>
          <div style={{ marginBottom: 18 }}><ChipGroup options={LIFESTYLE} selected={lifestyle} onToggle={toggle(setLifestyle)} /></div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, display: "block", marginBottom: 8 }}>Additional Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Tell the landlord anything else you'd like them to know..."
            style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "#F9FAFB", fontSize: 13, color: "#1F2937", fontFamily: IN, outline: "none", resize: "none" as const, lineHeight: 1.55 }} />
        </div>

        {/* Registration summary */}
        <div style={{ ...card, border: "1.5px solid #EDE4FF", background: "#FBF9FF" }}>
          <p style={sec}>Registration Summary</p>
          {[
            ["Boarding House", house.name],
            ["Selected Room", selectedRoom ? selectedRoom.name : "Not selected"],
            ["Selected Bed", selectedBedLabel ?? (bedId ? bedId : "Not selected")],
            ["Move-in Date", moveIn || "—"],
            ["Move-out Date", moveOut || "—"],
            ["Length of Stay", `${stayCount || "—"} ${stayUnit}`],
            ["Personality Traits", traits.length ? traits.join(", ") : "—"],
            ["Hobbies", hobbies.length ? hobbies.join(", ") : "—"],
            ["Lifestyle", lifestyle.length ? lifestyle.join(", ") : "—"],
          ].map(([k, v], i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #F0EAFB" : "none" }}>
              <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0, fontFamily: IN }}>{k}</span>
              <span style={{ fontSize: 12, color: "#1F2937", fontWeight: 700, textAlign: "right", fontFamily: QS }}>{v}</span>
            </div>
          ))}
        </div>

        {errors.length > 0 && (
          <div style={{ background: "#FEF2F2", borderRadius: 16, padding: "12px 16px", marginBottom: 14, border: "1px solid #FECACA" }}>
            {errors.map(e => (
              <div key={e} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <AlertCircle size={13} color="#EF4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#DC2626", fontFamily: IN }}>{e}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleSubmit} style={{ width: "100%", padding: "16px 0", borderRadius: 24, backgroundImage: GRAD, color: "white", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, boxShadow: "0 8px 24px rgba(151,114,246,.32)", letterSpacing: .3 }}>
          Submit Registration Request
        </button>
      </div>
    </div>
  );
}

// ── PENDING VERIFICATION GATE ─────────────────────────────────────────────────

