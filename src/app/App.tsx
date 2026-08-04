import React, { useState, useEffect, useRef } from "react";
import {
  Home, Map, Bell, User, Eye, EyeOff, Search, Shield, CreditCard,
  MapPin, Users, Building2, CheckCircle, AlertCircle, Clock, Phone,
  Mail, LogOut, Camera, GraduationCap, Lock, Settings, Info,
  HelpCircle, FileText, Megaphone, Calendar, ChevronRight, ChevronLeft,
  Navigation, Signal, Wifi, Battery, RefreshCcw, Filter,
  Globe, MessageCircle, Layers, Smartphone, Heart, Check, Star,
  BarChart2, UserCheck, Wallet, Flag,
  Droplet, Zap, Utensils, Car, BookOpen, Video, Shirt, Plus, Minus, X,
  Sparkles, DoorOpen, Hourglass,
} from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import {
  GRAD, GRAD_H, Screen, NavTab, Role,
  BedStatus, BedData, RoomData, Amenity, BoardingHouse, RegRequest, StudentProfile,
  AMENITIES, BOARDING_HOUSES, roomStatus, IMG,
} from "./shared";
import { LandlordOccupantsScreen } from "./LandlordOccupants";
import { LandlordSignUpScreen } from "./LandlordSignUp";
import { StudentSignUpScreen } from "./StudentSignUp";
import { ParentSignUpScreen, ParentLinkingScreen } from "./ParentSignUp";
import { LandlordProfileScreen } from "./LandlordProfile";
import { HighlightsDashboardSection, Highlight, INITIAL_HIGHLIGHTS, HL_TODAY } from "./LandlordHighlights";
import { LandlordPaymentsScreen } from "./LandlordPayments";
import { StudentHomeScreen } from "./StudentHome";
import { getReports, updateReport as updateStudentReport, CATEGORY_META, PRIORITY_META, STATUS_META, StudentReport, ReportStatus } from "./reportStore";
import { StudentPaymentsScreen } from "./StudentPayments";
import { StudentRoomOccupantsScreen } from "./StudentOccupants";
import { StudentMapScreen } from "./StudentMap";
import { StudentProfileScreen } from "./StudentProfile";
import { ParentHomeScreen } from "./ParentHome";
import { ParentBoardingHouseScreen } from "./ParentBoardingHouse";
import { ParentMapScreen } from "./ParentMap";
import { ParentPaymentsScreen } from "./ParentPayments";
import { ParentProfileScreen } from "./ParentProfile";
import { AppInfoSection } from "./AppInfo";
import { AdminDashboardScreen } from "./AdminDashboard";
import { AdminUsersScreen as AdminUsersScreenFull } from "./AdminUsers";
import { AdminMapScreen } from "./AdminMap";
import { AdminReportsScreen as AdminReportsScreenFull } from "./AdminReports";
import { AdminSystemScreen } from "./AdminSystem";
import { AdminProfileScreen as AdminProfileScreenFull } from "./AdminProfile";
import { Chip, ChipGroup, BoardingRegistrationScreen } from "./BoardingReg";

// ── Logo ──────────────────────────────────────────────────────────────────────

function DormiLogo({ size = 72, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 80 72" fill="none">
      <defs>
        <linearGradient id="dg" x1="0" y1="0" x2="80" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9772F6" /><stop offset="1" stopColor="#7549F6" />
        </linearGradient>
      </defs>
      <path d="M8 8 L8 64 L36 64 C53.673 64 66 52.837 66 36 C66 19.163 53.673 8 36 8 Z"
        fill={white ? "rgba(255,255,255,0.95)" : "url(#dg)"} />
      <path d="M36 20 C49 20 57 27.5 57 36 C57 44.5 49 52 36 52 Z"
        fill={white ? "rgba(151,114,246,0.25)" : "white"} opacity={white ? 1 : 0.95} />
      <circle cx="50" cy="36" r="2.5" fill={white ? "rgba(255,255,255,0.5)" : "url(#dg)"} />
      <ellipse cx="37" cy="69" rx="20" ry="2.5" fill={white ? "rgba(255,255,255,0.18)" : "url(#dg)"} opacity="0.3" />
    </svg>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function useIsRealMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 500 : false,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function MobileShell({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  const isRealMobile = useIsRealMobile();

  if (isRealMobile) {
    // Real phone browser: fill the actual viewport edge-to-edge instead of
    // drawing a fake device frame — the OS/browser already provides the
    // status bar and notch, so we just respect safe-area insets.
    return (
      <>
        <style>{`.dt-real-shell{height:100vh;height:100dvh}`}</style>
        <div className="dt-real-shell" style={{
          width: "100vw", overflow: "hidden", position: "relative",
          fontFamily: "'Inter',sans-serif", background: "#F7F8FC",
          display: "flex", flexDirection: "column",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}>
          <div style={{ flex: 1, overflow: "hidden", opacity: visible ? 1 : 0, transition: "opacity 0.18s ease", display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#DCDCE6,#C4C4D4)" }}>
      <div style={{
        width: 390, height: 844, borderRadius: 52, overflow: "hidden", position: "relative",
        boxShadow: "0 50px 100px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset, 0 0 0 2px rgba(0,0,0,0.15)",
        fontFamily: "'Inter',sans-serif", background: "#F7F8FC",
        display: "flex", flexDirection: "column",
      }}>
        {/* Dynamic Island */}
        <div style={{ position: "absolute", top: 13, left: "50%", transform: "translateX(-50%)", width: 118, height: 30, background: "black", borderRadius: 15, zIndex: 70 }} />
        {/* Status bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px", zIndex: 60, pointerEvents: "none", color: "white", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>9:41</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Signal size={11} /><Wifi size={11} /><Battery size={13} />
          </div>
        </div>
        {/* Screen */}
        <div style={{ flex: 1, overflow: "hidden", opacity: visible ? 1 : 0, transition: "opacity 0.18s ease", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function GradBtn({ children, onClick, disabled = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.97] select-none"
      style={{ background: disabled ? "#E5E7EB" : GRAD, color: disabled ? "#9CA3AF" : "white", boxShadow: disabled ? "none" : "0 8px 24px rgba(151,114,246,0.32)", fontFamily: "'Quicksand',sans-serif", letterSpacing: 0.3, border: "none", cursor: disabled ? "default" : "pointer" }}>
      {children}
    </button>
  );
}

function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full py-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.97] select-none"
      style={{ border: "2px solid #9772F6", color: "#9772F6", background: "transparent", fontFamily: "'Quicksand',sans-serif" }}>
      {children}
    </button>
  );
}

function Input({ label, placeholder, type = "text", value, onChange, right }: {
  label?: string; placeholder: string; type?: string; value: string; onChange: (v: string) => void; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-4">
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7549F6", marginBottom: 6, fontFamily: "'Quicksand',sans-serif" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: "100%", boxSizing: "border-box", padding: "14px 44px 14px 16px", borderRadius: 16, border: `2px solid ${focused ? "#9772F6" : "#E5E7EB"}`, background: "#F7F8FC", color: "#1F2937", fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", transition: "border-color 0.2s" }} />
        {right && <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }}>{right}</div>}
      </div>
    </div>
  );
}

function Badge({ status }: { status: "paid" | "pending" | "overdue" }) {
  const m = { paid: { bg: "#DCFCE7", c: "#16A34A", t: "Paid" }, pending: { bg: "#FEF3C7", c: "#D97706", t: "Pending" }, overdue: { bg: "#FEE2E2", c: "#DC2626", t: "Overdue" } }[status];
  return <span style={{ padding: "2px 10px", borderRadius: 99, background: m.bg, color: m.c, fontSize: 11, fontWeight: 700 }}>{m.t}</span>;
}

function ToggleSwitch({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: value ? undefined : "#D1D5DB", flexShrink: 0, position: "relative", cursor: "pointer", backgroundImage: value ? GRAD : undefined, transition: "background 0.2s" }}>
      <div style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s ease" }} />
    </div>
  );
}

// ── Default tab sets per role ─────────────────────────────────────────────────

const LANDLORD_LEFT:  NavTab[] = [
  { id: "dashboard", Icon: Home,  label: "Home"      },
  { id: "occupants", Icon: Users, label: "Occupants" },
];
const LANDLORD_RIGHT: NavTab[] = [
  { id: "payments",  Icon: CreditCard, label: "Payments"  },
  { id: "profile",   Icon: User,       label: "Profile"   },
];

const ADMIN_LEFT:  NavTab[] = [
  { id: "dashboard",  Icon: Home,      label: "Home"  },
  { id: "adminUsers", Icon: UserCheck, label: "Users" },
];
const ADMIN_RIGHT: NavTab[] = [
  { id: "adminReports", Icon: BarChart2, label: "Reports" },
  { id: "adminSystem",  Icon: Settings,  label: "System"  },
];

const STUDENT_LEFT:  NavTab[] = [
  { id: "dashboard", Icon: Home,   label: "Home"      },
  { id: "occupants", Icon: Users,  label: "My Dorm" },
];
const STUDENT_RIGHT: NavTab[] = [
  { id: "payments",  Icon: Wallet, label: "Payments"  },
  { id: "profile",   Icon: User,   label: "Profile"   },
];

const PARENT_LEFT: NavTab[] = [
  { id: "dashboard", Icon: Home,      label: "Home"           },
  { id: "occupants", Icon: Building2, label: "Boarding House" },
];
const PARENT_RIGHT: NavTab[] = [
  { id: "payments",  Icon: Wallet, label: "Payments" },
  { id: "profile",   Icon: User,   label: "Profile"  },
];

function navTabsForRole(role: Role): { left: NavTab[]; right: NavTab[] } {
  if (role === "admin")   return { left: ADMIN_LEFT,    right: ADMIN_RIGHT    };
  if (role === "student") return { left: STUDENT_LEFT,  right: STUDENT_RIGHT  };
  if (role === "parent")  return { left: PARENT_LEFT,   right: PARENT_RIGHT   };
  /* landlord default */   return { left: LANDLORD_LEFT, right: LANDLORD_RIGHT };
}

function BottomNav({
  active, go,
  leftTabs  = LANDLORD_LEFT,
  rightTabs = LANDLORD_RIGHT,
}: {
  active: Screen;
  go: (s: Screen) => void;
  leftTabs?:  NavTab[];
  rightTabs?: NavTab[];
}) {
  const LEFT  = leftTabs;
  const RIGHT = rightTabs;
  const mapActive = active === "map";

  // ── Geometry ──────────────────────────────────────────────────────────────
  //
  //          ●     ← FAB 64 px; bottom ~22 px inside U-cut (34% overlap)
  //         ╱ ╲
  //  ───────╯   ╰───────   ← bar flat top shoulders (y = 0)
  //              U-notch: perfect semicircle, radius 38, width 76 px
  //  ████████████████████   ← pill bar H=72, corner C=28
  //
  const W   = 358;  // bar width  (390 − 16×2 margins)
  const H   = 72;   // bar height
  const C   = 28;   // corner radius — premium pill, not a full capsule
  const cx  = W / 2;

  // Semicircle notch: nh = nd = arcR  →  76 px wide, 38 px deep.
  // FAB 64 px fits with 6 px clearance at the tightest point.
  // Wide shallow arc — notch is 104 px wide, only 18 px deep (not a semicircle).
  const nh   = 15;  // half-width of the notch span from center
  const nd   = 38;  // notch depth (sagitta)
  const q    = 50;  // how far the slope extends beyond nh on each side

  // Three segments: left slope + flat bottom + right slope.
  // Horizontal tangents guaranteed at every junction — true U shape, not V.
  const flat = 5;   // half-width of the flat bottom (10 px total)
  const ent  = 20;  // how far right the left slope lingers near y=0 before diving
  const sout = 25;  // outset before the flat bottom — controls wall steepness

  const shape = [
    `M ${C} 0`,
    `L ${cx - nh - q} 0`,
    `C ${cx - nh - q + ent} 0 ${cx - flat - sout} ${nd} ${cx - flat} ${nd}`,
    `L ${cx + flat} ${nd}`,
    `C ${cx + flat + sout} ${nd} ${cx + nh + q - ent} 0 ${cx + nh + q} 0`,
    `L ${W - C} 0`,
    `Q ${W} 0 ${W} ${C}`,
    `L ${W} ${H - C}`,
    `Q ${W} ${H} ${W - C} ${H}`,
    `L ${C} ${H}`,
    `Q 0 ${H} 0 ${H - C}`,
    `L 0 ${C}`,
    `Q 0 0 ${C} 0`,
    `Z`,
  ].join(" ");

  // FAB: center 10 px above bar flat top → bottom 22 px inside shallow notch.
  const FAB_D  = 64;
  const FAB_R  = 32;
  const fabTop = -(FAB_R + 7); // = −39 px

  return (
    <div style={{ flexShrink: 0, padding: "0 16px 20px", position: "relative" }}>
      <style>{`
        @keyframes fabGlow{
          0%,100%{box-shadow:0 8px 28px rgba(151,114,246,.5),0 3px 10px rgba(117,73,246,.35),0 0 0 0 rgba(151,114,246,.2)}
          55%{box-shadow:0 8px 28px rgba(151,114,246,.5),0 3px 10px rgba(117,73,246,.35),0 0 0 10px rgba(151,114,246,0)}
        }
        @keyframes fabGlowActive{
          0%,100%{box-shadow:0 10px 36px rgba(151,114,246,.68),0 3px 12px rgba(117,73,246,.44),0 0 0 0 rgba(151,114,246,.28)}
          55%{box-shadow:0 10px 36px rgba(151,114,246,.68),0 3px 12px rgba(117,73,246,.44),0 0 0 14px rgba(151,114,246,0)}
        }
      `}</style>

      {/* ── Pill bar — SVG so the drop-shadow traces the notched outline ── */}
      <div style={{ position: "relative", height: H }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: H,
            overflow: "visible", pointerEvents: "none",
            filter: [
              "drop-shadow(0 -1px 0px rgba(255,255,255,.9))",
              "drop-shadow(0 4px 16px rgba(117,73,246,.10))",
              "drop-shadow(0 1px 4px rgba(0,0,0,.05))",
            ].join(" "),
          }}
        >
          <defs>
            <radialGradient id="notchDepth" cx="50%" cy="20%" r="70%">
              <stop offset="0%"   stopColor="rgba(151,114,246,0.07)" />
              <stop offset="100%" stopColor="rgba(151,114,246,0.00)" />
            </radialGradient>
          </defs>
          {/* White pill body */}
          <path d={shape} fill="rgba(255,255,255,0.97)" />
          {/* Subtle purple tint inside the U-cup — gives depth under the FAB */}
          <ellipse cx={cx} cy={nd * 0.7} rx={nh * 0.8} ry={nd * 0.6} fill="url(#notchDepth)" />
        </svg>

        {/* ── Tab buttons ── */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", zIndex: 1 }}>
          {LEFT.map(({ id, Icon, label }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => go(id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "8px 0 6px", background: "none", border: "none", cursor: "pointer",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: on ? "linear-gradient(135deg,rgba(151,114,246,.13),rgba(117,73,246,.08))" : "transparent",
                  transition: "background .22s ease",
                }}>
                  <Icon size={21} color={on ? "#9772F6" : "#9CA3AF"} strokeWidth={on ? 2.4 : 1.8} style={{ transition: "color .22s ease" }} />
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: on ? 700 : 500,
                  color: on ? "#9772F6" : "#9CA3AF",
                  fontFamily: "'Quicksand',sans-serif",
                  letterSpacing: on ? 0.1 : 0,
                  transition: "color .22s ease, font-weight .22s ease",
                }}>{label}</span>
              </button>
            );
          })}

          {/* Center gap — clears the FAB (64 px + margins) */}
          <div style={{ width: FAB_D + 20, flexShrink: 0 }} />

          {RIGHT.map(({ id, Icon, label }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => go(id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "8px 0 6px", background: "none", border: "none", cursor: "pointer",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: on ? "linear-gradient(135deg,rgba(151,114,246,.13),rgba(117,73,246,.08))" : "transparent",
                  transition: "background .22s ease",
                }}>
                  <Icon size={21} color={on ? "#9772F6" : "#9CA3AF"} strokeWidth={on ? 2.4 : 1.8} style={{ transition: "color .22s ease" }} />
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: on ? 700 : 500,
                  color: on ? "#9772F6" : "#9CA3AF",
                  fontFamily: "'Quicksand',sans-serif",
                  letterSpacing: on ? 0.1 : 0,
                  transition: "color .22s ease, font-weight .22s ease",
                }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center FAB — overlaps into the U-cut, purple gradient, no label ── */}
      <button
        onClick={() => go("map")}
        style={{
          position: "absolute",
          top: fabTop,
          left: "50%",
          transform: mapActive
            ? "translateX(-50%) scale(1.08)"
            : "translateX(-50%) scale(1)",
          width: FAB_D,
          height: FAB_D,
          borderRadius: "50%",
          backgroundImage: "linear-gradient(150deg,#D060F8 0%,#9772F6 40%,#5A0CA8 80%,#7549F6 100%)",
          border: "3px solid rgba(255,255,255,0.95)",
          boxShadow: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          animation: mapActive
            ? "fabGlowActive 2.2s ease-in-out infinite"
            : "fabGlow 3s ease-in-out infinite",
          transition: "transform 0.28s cubic-bezier(.34,1.56,.64,1)",
          zIndex: 10,
        }}
      >
        <MapPin size={26} color="white" fill="rgba(255,255,255,.2)" strokeWidth={2} />
      </button>
    </div>
  );
}

// ── SPLASH ────────────────────────────────────────────────────────────────────

function SplashScreen({ done }: { done: () => void }) {
  useEffect(() => { const t = setTimeout(done, 2600); return () => clearTimeout(t); }, [done]);
  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", backgroundImage: GRAD_H, overflow: "hidden" }}>
      <style>{`
        @keyframes sP{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes sD{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}
        @keyframes sFU{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ position: "absolute", top: 80, right: 24, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(232,100,255,.3),transparent)" }} />
      <div style={{ position: "absolute", bottom: 140, left: 10, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,140,255,.2),transparent)" }} />
      <div style={{ animation: "sP 2.4s ease-in-out infinite", marginBottom: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 28, padding: 20, boxShadow: "0 0 60px rgba(216,180,254,0.4)" }}>
          <DormiLogo size={80} white />
        </div>
      </div>
      <h1 style={{ color: "white", fontSize: 36, fontWeight: 800, fontFamily: "'Quicksand',sans-serif", margin: "0 0 8px", animation: "sFU .7s ease .3s both" }}>DormiTrack</h1>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, animation: "sFU .7s ease .5s both", margin: 0 }}>Smart Boarding House Monitoring</p>
      <div style={{ position: "absolute", bottom: 30, display: "flex", gap: 8 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "white", animation: `sD 1.3s ease-in-out ${i * 0.22}s infinite` }} />)}
      </div>
    </div>
  );
}

// ── LANDING ───────────────────────────────────────────────────────────────────

function LandingIllustration() {
  return (
    <svg width="300" height="190" viewBox="0 0 300 190" fill="none">
      <ellipse cx="150" cy="148" rx="122" ry="40" fill="rgba(255,255,255,0.07)" />
      {/* Building */}
      <rect x="55" y="65" width="108" height="110" rx="5" fill="white" fillOpacity=".9" />
      <rect x="62" y="54" width="94" height="20" rx="4" fill="white" fillOpacity=".75" />
      {[0,1,2].map(r=>[0,1,2].map(c=><rect key={`${r}${c}`} x={65+c*32} y={77+r*27} width={19} height={19} rx="3" fill="#9772F6" fillOpacity={.18+r*.05}/>))}
      <rect x="97" y="145" width="22" height="30" rx="3" fill="#7549F6" fillOpacity=".55" />
      <circle cx="115" cy="161" r="2" fill="white" fillOpacity=".8" />
      {/* Trees */}
      <ellipse cx="30" cy="115" rx="15" ry="19" fill="#22C55E" fillOpacity=".65" />
      <rect x="28" y="130" width="5" height="16" fill="#15803D" fillOpacity=".6" />
      <ellipse cx="272" cy="120" rx="13" ry="16" fill="#22C55E" fillOpacity=".5" />
      <rect x="270" y="132" width="5" height="13" fill="#15803D" fillOpacity=".5" />
      {/* Student */}
      <circle cx="195" cy="102" r="12" fill="#FDE68A" fillOpacity=".9" />
      <rect x="186" y="115" width="19" height="27" rx="4" fill="#DDD6FE" fillOpacity=".9" />
      <rect x="201" y="124" width="9" height="14" rx="2" fill="#9772F6" fillOpacity=".85" />
      <rect x="202" y="126" width="7" height="10" rx="1" fill="#E9D5FF" fillOpacity=".9" />
      {[0,1,2].map(i=><path key={i} d={`M211 ${119-i*7} C216 ${114-i*7} 222 ${114-i*7} 227 ${119-i*7}`} stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity={.7-i*.18}/>)}
      {/* Parent */}
      <circle cx="240" cy="106" r="11" fill="#FCA5A5" fillOpacity=".9" />
      <rect x="231" y="118" width="18" height="24" rx="4" fill="#FECDD3" fillOpacity=".75" />
      {/* Map pin */}
      <path d="M255 60 C255 49 264 43 273 43 C282 43 291 49 291 60 C291 71 273 84 273 84 C273 84 255 71 255 60Z" fill="#EF4444" fillOpacity=".85" />
      <circle cx="273" cy="60" r="5.5" fill="white" />
      {/* Shield */}
      <path d="M14 70 L28 64 L42 70 L42 82 C42 91 28 99 28 99 C28 99 14 91 14 82Z" fill="#7549F6" fillOpacity=".75" />
      <path d="M22 82 L26.5 86.5 L35 77" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Float card 1 */}
      <rect x="16" y="138" width="66" height="40" rx="10" fill="white" fillOpacity=".92" style={{filter:"drop-shadow(0 4px 10px rgba(0,0,0,.12))"}} />
      <circle cx="29" cy="153" r="7" fill="#9772F6" fillOpacity=".28" />
      <rect x="40" y="148" width="32" height="5" rx="2.5" fill="#D1D5DB" />
      <rect x="40" y="157" width="22" height="4" rx="2" fill="#E5E7EB" />
      <rect x="16" y="168" width="66" height="10" rx="5" fill="#9772F6" fillOpacity=".6" />
      {/* Float card 2 */}
      <rect x="218" y="136" width="58" height="36" rx="9" fill="white" fillOpacity=".88" style={{filter:"drop-shadow(0 4px 10px rgba(0,0,0,.1))"}} />
      <rect x="225" y="144" width="25" height="4" rx="2" fill="#D1D5DB" />
      <rect x="225" y="152" width="18" height="3.5" rx="1.75" fill="#E5E7EB" />
      <rect x="225" y="160" width="44" height="7" rx="3.5" fill="#22C55E" fillOpacity=".7" />
    </svg>
  );
}

function LandingScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" as const }}>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 60, paddingBottom: 24, position: "relative", backgroundImage: GRAD_H, minHeight: 400, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(232,100,255,.12),transparent)", transform: "translate(30%,-30%)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 20, padding: 12 }}>
            <DormiLogo size={38} white />
          </div>
          <span style={{ color: "white", fontSize: 28, fontWeight: 800, fontFamily: "'Quicksand',sans-serif" }}>DormiTrack</span>
        </div>
        <LandingIllustration />
        <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, textAlign: "center", padding: "12px 36px 0", lineHeight: 1.6, margin: 0 }}>
          Smart Boarding House Monitoring for a Safer Student Experience
        </p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "32px 32px 0 0", marginTop: -20, padding: "28px 24px 36px" }}>
        <h2 style={{ color: "#1F2937", fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 10px", fontFamily: "'Quicksand',sans-serif" }}>Welcome to DormiTrack</h2>
        <p style={{ color: "#6B7280", fontSize: 13, textAlign: "center", lineHeight: 1.65, margin: "0 0 24px" }}>
          Monitor boarding house information, stay connected with parents and landlords, manage payments, and experience secure student accommodation — all in one app.
        </p>
        <GradBtn onClick={() => go("login")}>Log In</GradBtn>
        <div style={{ marginTop: 12 }}><OutlineBtn onClick={() => go("roleSelect")}>Sign Up</OutlineBtn></div>
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "#9CA3AF" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <span style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>
            <span>·</span>
            <span style={{ textDecoration: "underline", cursor: "pointer" }}>Terms & Conditions</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROLE SELECT ───────────────────────────────────────────────────────────────

function RoleSelectScreen({ go, onRole }: { go: (s: Screen) => void; onRole: (r: Role) => void }) {
  const roles: { Icon: typeof Home; title: string; desc: string; grad: string; shadow: string; role: Role }[] = [
    { Icon: GraduationCap, title: "Student",          desc: "Track your boarding house, payments & visits",    grad: "linear-gradient(135deg,#9772F6,#7C3AED)", shadow: "rgba(151,114,246,.3)", role: "student"  },
    { Icon: Heart,         title: "Parent / Guardian",desc: "Stay connected with your child's accommodation", grad: "linear-gradient(135deg,#EC4899,#8B5CF6)", shadow: "rgba(236,72,153,.3)", role: "parent"   },
    { Icon: Building2,     title: "Landlord",          desc: "Manage your dormitories and occupants",          grad: "linear-gradient(135deg,#3B82F6,#6366F1)", shadow: "rgba(59,130,246,.3)", role: "landlord" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "56px 24px 32px", backgroundImage: GRAD_H }}>
        <button onClick={() => go("landing")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", padding: 0, marginBottom: 16 }}><ChevronLeft size={24} /></button>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>I am a…</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>Choose your role to continue</p>
      </div>
      <div style={{ padding: "20px 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {roles.map(({ Icon, title, desc, grad, shadow, role }) => (
          <button key={title} onClick={() => { onRole(role); go(role === "student" ? "studentSignup" : role === "landlord" ? "landlordSignup" : role === "parent" ? "parentSignup" : "login"); }}
            style={{ background: "white", borderRadius: 24, padding: 16, display: "flex", alignItems: "center", gap: 16, textAlign: "left", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.07)", transition: "transform .15s", width: "100%" }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(.98)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}>
            <div style={{ width: 56, height: 56, borderRadius: 18, backgroundImage: grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 6px 18px ${shadow}` }}>
              <Icon size={26} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#1F2937", fontWeight: 800, fontSize: 15, margin: "0 0 3px", fontFamily: "'Quicksand',sans-serif" }}>{title}</p>
              <p style={{ color: "#6B7280", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{desc}</p>
            </div>
            <ChevronRight size={17} color="#D1D5DB" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────

function LoginScreen({ go, onAdminLogin }: { go: (s: Screen) => void; onAdminLogin?: () => void }) {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState(""); const [show, setShow] = useState(false); const [rem, setRem] = useState(false); const [err, setErr] = useState("");
  const handleLogin = () => {
    if (email.trim() === "admin" && pass === "123456") { onAdminLogin?.(); go("dashboard"); }
    else { setErr(""); go("dashboard"); }
  };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "56px 24px 40px", backgroundImage: GRAD_H, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        <button onClick={() => go("roleSelect")} style={{ position: "absolute", left: 24, top: 56, background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer" }}><ChevronLeft size={24} /></button>
        <div style={{ background: "rgba(255,255,255,.13)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <DormiLogo size={52} white />
        </div>
        <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>Welcome Back!</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>Sign in to your DormiTrack account</p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "32px 32px 0 0", marginTop: -20, padding: "28px 24px 32px" }}>
        <Input label="Username or Email Address" placeholder="Enter your username or email" type="text" value={email} onChange={setEmail} right={<Mail size={17} />} />
        <Input label="Password" placeholder="Enter your password" type={show ? "text" : "password"} value={pass} onChange={setPass}
          right={<button onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9CA3AF" }}>{show ? <Eye size={17} /> : <EyeOff size={17} />}</button>} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div onClick={() => setRem(r => !r)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${rem ? "#9772F6" : "#D1D5DB"}`, backgroundImage: rem ? GRAD : "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {rem && <Check size={11} color="white" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 13, color: "#6B7280" }}>Remember Me</span>
          </label>
          <button onClick={() => go("forgotPassword")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#9772F6", fontFamily: "'Quicksand',sans-serif" }}>Forgot Password?</button>
        </div>
        {err && <p style={{ textAlign:"center", fontSize:12, color:"#DC2626", marginBottom:12 }}>{err}</p>}
        <GradBtn onClick={handleLogin}>Log In</GradBtn>
        <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 20 }}>
          {"Don't have an account? "}
          <button onClick={() => go("signup")} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#9772F6", fontSize: 13, fontFamily: "'Quicksand',sans-serif" }}>Create Account</button>
        </p>
      </div>
    </div>
  );
}

// ── SIGNUP ────────────────────────────────────────────────────────────────────

function SignUpScreen({ go }: { go: (s: Screen) => void }) {
  const [step, setStep] = useState(1);
  const STEPS = ["Personal Info", "Contact Info", "Student Details", "Credentials", "Review"];
  const [f, setF] = useState({ firstName: "", lastName: "", dob: "", gender: "", phone: "", email: "", address: "", studentId: "", university: "", course: "", username: "", password: "", confirm: "" });
  const u = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));

  const steps = [
    <>
      <Input label="First Name" placeholder="Juan" value={f.firstName} onChange={u("firstName")} />
      <Input label="Last Name" placeholder="Dela Cruz" value={f.lastName} onChange={u("lastName")} />
      <Input label="Date of Birth" placeholder="YYYY-MM-DD" value={f.dob} onChange={u("dob")} right={<Calendar size={17} />} />
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7549F6", marginBottom: 6, fontFamily: "'Quicksand',sans-serif" }}>Gender</label>
        <div style={{ display: "flex", gap: 8 }}>
          {["Male", "Female", "Other"].map(g => (
            <button key={g} onClick={() => u("gender")(g)} style={{ flex: 1, padding: "12px 0", borderRadius: 16, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `2px solid ${f.gender === g ? "#9772F6" : "#E5E7EB"}`, color: f.gender === g ? "#9772F6" : "#6B7280", background: f.gender === g ? "#F5F0FF" : "white", transition: "all .2s" }}>{g}</button>
          ))}
        </div>
      </div>
    </>,
    <>
      <Input label="Phone Number" placeholder="+63 9XX XXX XXXX" value={f.phone} onChange={u("phone")} right={<Phone size={17} />} />
      <Input label="Email Address" placeholder="juan@email.com" type="email" value={f.email} onChange={u("email")} right={<Mail size={17} />} />
      <Input label="Home Address" placeholder="Street, Barangay, City" value={f.address} onChange={u("address")} />
    </>,
    <>
      <Input label="Student ID" placeholder="BISU-2024-0001" value={f.studentId} onChange={u("studentId")} />
      <Input label="University" placeholder="Bohol Island State University" value={f.university} onChange={u("university")} />
      <Input label="Course / Program" placeholder="BS Information Technology" value={f.course} onChange={u("course")} />
    </>,
    <>
      <Input label="Username" placeholder="Choose a username" value={f.username} onChange={u("username")} right={<User size={17} />} />
      <Input label="Password" placeholder="Min. 8 characters" type="password" value={f.password} onChange={u("password")} right={<Lock size={17} />} />
      <Input label="Confirm Password" placeholder="Re-enter password" type="password" value={f.confirm} onChange={u("confirm")} right={<Lock size={17} />} />
      <div style={{ padding: 12, borderRadius: 16, background: "#F5F0FF", border: "1px solid #EDE9FE" }}>
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Must be 8+ characters with uppercase, number, and symbol.</p>
      </div>
    </>,
    <div key="review">
      {([["Full Name", `${f.firstName || "—"} ${f.lastName}`], ["Date of Birth", f.dob || "—"], ["Gender", f.gender || "—"], ["Phone", f.phone || "—"], ["Email", f.email || "—"], ["Student ID", f.studentId || "—"], ["University", f.university || "—"], ["Username", f.username || "—"]] as [string, string][]).map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{k}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: 12, borderRadius: 16, background: "#DCFCE7", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 8 }}>
        <CheckCircle size={15} color="#16A34A" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: "#15803D", margin: 0 }}>Review your information before creating your account.</p>
      </div>
    </div>,
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "56px 24px 24px", backgroundImage: GRAD_H }}>
        <button onClick={step > 1 ? () => setStep(s => s - 1) : () => go("login")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", marginBottom: 12, padding: 0 }}><ChevronLeft size={24} /></button>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 12, margin: "0 0 2px" }}>Step {step} of {STEPS.length}</p>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 12px", fontFamily: "'Quicksand',sans-serif" }}>{STEPS[step - 1]}</h1>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.2)" }}>
          <div style={{ height: "100%", borderRadius: 3, background: "white", width: `${(step / STEPS.length) * 100}%`, transition: "width .5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          {STEPS.map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < step ? "white" : "rgba(255,255,255,.3)", transition: "background .3s" }} />)}
        </div>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "32px 32px 0 0", marginTop: -16, padding: "28px 24px 32px" }}>
        {steps[step - 1]}
        <div style={{ marginTop: 8 }}>
          <GradBtn onClick={step < STEPS.length ? () => setStep(s => s + 1) : () => go("dashboard")}>
            {step < STEPS.length ? "Continue" : "Create Account"}
          </GradBtn>
        </div>
        {step === 1 && <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 16 }}>Already have an account? <button onClick={() => go("login")} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#9772F6", fontSize: 13, fontFamily: "'Quicksand',sans-serif" }}>Log In</button></p>}
      </div>
    </div>
  );
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────

function ForgotPasswordScreen({ go }: { go: (s: Screen) => void }) {
  type Ph = "email" | "code" | "newpass";
  const [phase, setPhase] = useState<Ph>("email");
  const [email, setEmail] = useState(""); const [code, setCode] = useState(["", "", "", "", "", ""]); const [np, setNp] = useState("");
  const meta: Record<Ph, { title: string; desc: string }> = {
    email: { title: "Forgot Password", desc: "Enter your email to receive a verification code" },
    code: { title: "Verify Code", desc: `Code sent to ${email || "your email"}` },
    newpass: { title: "New Password", desc: "Create a strong new password for your account" },
  };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "56px 24px 40px", backgroundImage: GRAD_H }}>
        <button onClick={() => phase === "email" ? go("login") : setPhase(phase === "newpass" ? "code" : "email")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", marginBottom: 16, padding: 0 }}><ChevronLeft size={24} /></button>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,.14)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Lock size={28} color="white" />
        </div>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>{meta[phase].title}</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>{meta[phase].desc}</p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "32px 32px 0 0", marginTop: -20, padding: "28px 24px 32px" }}>
        {phase === "email" && <><Input label="Email Address" placeholder="your@email.com" type="email" value={email} onChange={setEmail} right={<Mail size={17} />} /><GradBtn onClick={() => setPhase("code")}>Send Verification Code</GradBtn></>}
        {phase === "code" && <>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>Enter the 6-digit code sent to your email.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {code.map((v, i) => (
              <input key={i} maxLength={1} value={v} onChange={e => { const c = [...code]; c[i] = e.target.value; setCode(c); }}
                style={{ flex: 1, height: 56, textAlign: "center", fontSize: 20, fontWeight: 800, borderRadius: 16, border: `2px solid ${v ? "#9772F6" : "#E5E7EB"}`, background: "#F7F8FC", color: "#1F2937", outline: "none", fontFamily: "'Quicksand',sans-serif" }} />
            ))}
          </div>
          <GradBtn onClick={() => setPhase("newpass")}>Verify Code</GradBtn>
          <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 16 }}>{"Didn't receive it? "}<span onClick={() => {}} style={{ fontWeight: 700, color: "#9772F6", cursor: "pointer", fontFamily: "'Quicksand',sans-serif" }}>Resend</span></p>
        </>}
        {phase === "newpass" && <>
          <Input label="New Password" placeholder="Min. 8 characters" type="password" value={np} onChange={setNp} right={<Lock size={17} />} />
          <Input label="Confirm Password" placeholder="Re-enter new password" type="password" value="" onChange={() => {}} right={<Lock size={17} />} />
          <GradBtn onClick={() => go("login")}>Reset Password</GradBtn>
        </>}
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

type VisitorRecord = {
  id: string;
  studentName: string; room: string;           // always shown (auto-linked)
  visitorName?: string; contact?: string;
  relationship?: string; purpose?: string; visitDate?: string;
  date: string;                                 // always stored for filtering
  timeIn?: string; timeOut?: string;
  status: "inside" | "left";
};
type VisitorFields = { name: boolean; contact: boolean; relationship: boolean; purpose: boolean; visitDate: boolean };

function DashboardScreen({ go, role = "landlord", notifCount = 0, visitorEnabled = false, visitorFields = { name:true, contact:true, relationship:true, purpose:true, visitDate:true }, highlightsEnabled = true }: { go: (s: Screen) => void; role?: Role; notifCount?: number; visitorEnabled?: boolean; visitorFields?: VisitorFields; highlightsEnabled?: boolean }) {
  const QS = "'Quicksand',sans-serif";
  const IN = "'Inter',sans-serif";

  const [activityFilter, setActivityFilter] = useState<"all"|"landlord"|"student"|"parent"|"admin"|"visitor">("all");
  const [chatOpen, setChatOpen] = useState(false);

  // ── Visitor Records state ────────────────────────────────────────────────────
  const [visitors, setVisitors] = useState<VisitorRecord[]>([
    { id: "v1", studentName: "Lara Mendoza",  room: "Room B", visitorName: "Rose Mendoza",  contact: "09171110001", relationship: "Mother",  purpose: "Bring food & supplies", visitDate: "Dec 18, 2024", date: "Dec 18", timeIn: "10:08 AM", status: "inside" },
    { id: "v2", studentName: "Maria Santos",  room: "Room A", visitorName: "Carl Reyes",    contact: "09221110002", relationship: "Friend",  purpose: "Help with thesis",      visitDate: "Dec 18, 2024", date: "Dec 18", timeIn: "2:03 PM",  status: "inside" },
    { id: "v3", studentName: "Kevin Cruz",    room: "Room C", visitorName: "Ben Torres",    contact: "09331110003", relationship: "Father",  purpose: "Personal visit",        visitDate: "Dec 17, 2024", date: "Dec 17", timeIn: "9:05 AM",  timeOut: "10:58 AM", status: "left" },
    { id: "v4", studentName: "John Doe",      room: "Room A", visitorName: "Mark dela Cruz",contact: "09551110005", relationship: "Brother", purpose: "Bring appliances",      visitDate: "Dec 16, 2024", date: "Dec 16", timeIn: "1:03 PM",  timeOut: "2:50 PM",  status: "left" },
    { id: "v5", studentName: "Sofia Castillo",room: "Room D", visitorName: "Ana Gomez",     contact: "09441110004", relationship: "Cousin",  purpose: "Birthday cake",         visitDate: "Dec 15, 2024", date: "Dec 15", timeIn: "4:10 PM",  timeOut: "5:45 PM",  status: "left" },
  ]);
  const [visitorFilter, setVisitorFilter] = useState<"all"|"today"|"week"|"month"|"inside"|"left">("all");
  const [visitorSearch, setVisitorSearch] = useState("");
  const [visitorSort, setVisitorSort] = useState<"newest"|"oldest">("newest");
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [studentReports, setStudentReports] = useState<StudentReport[]>(()=>getReports().filter(r=>r.boardingHouse==="Naquila BH"||r.boardingHouse==="Naquila Boarding House"));
  const [selectedStudentReport, setSelectedStudentReport] = useState<StudentReport|null>(null);
  const [reportResponseText, setReportResponseText] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all"|ReportStatus>("all");
  const [activityDateFilter, setActivityDateFilter] = useState<"all"|"today"|"week"|"month">("all");
  const [chatMsg, setChatMsg] = useState("");
  const [chatThread, setChatThread] = useState([
    { from: "student", name: "Maria Santos", msg: "Hi po! Kailan po yung next inspection?", time: "9:12 AM" },
    { from: "landlord", name: "You", msg: "Sa December 22 po, 9AM. Salamat!", time: "9:15 AM" },
    { from: "student", name: "Maria Santos", msg: "Thank you po!", time: "9:16 AM" },
  ]);
  const [reqStates, setReqStates] = useState<Record<string,"pending"|"accepted"|"rejected">>({
    "2024-0041": "pending", "2024-0042": "pending", "2024-0043": "pending",
  });
  const chatRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // 8 summary cards
  const summaryCards = [
    { label: "Total Rooms",       value: "8",   Icon: Layers,      color: "#9772F6", bg: "#F5F0FF" },
    { label: "Current Occupants", value: "31",  Icon: Users,       color: "#3B82F6", bg: "#EFF6FF" },
    { label: "Available Beds",    value: "9",   Icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7" },
    { label: "Total Capacity",    value: "40",  Icon: Building2,   color: "#6366F1", bg: "#EEF2FF" },
    { label: "Fully Occupied",    value: "3",   Icon: AlertCircle, color: "#EF4444", bg: "#FEE2E2" },
    { label: "Available Rooms",   value: "5",   Icon: DoorOpen,    color: "#10B981", bg: "#D1FAE5" },
    { label: "Pending Requests",  value: "3",   Icon: Hourglass,   color: "#F59E0B", bg: "#FEF3C7" },
    { label: "Occupancy Rate",    value: "78%", Icon: BarChart2,   color: "#8B5CF6", bg: "#EDE9FE" },
  ];

  const requests = [
    { name: "Lara Mendoza",     id: "2024-0041", room: "Room B", course: "BS Nursing",   year: "2nd Year" },
    { name: "Mark Villanueva",  id: "2024-0042", room: "Room D", course: "BS CompSci",   year: "3rd Year" },
    { name: "Sofia Castillo",   id: "2024-0043", room: "Room D", course: "BS Education", year: "1st Year" },
  ];

  const [allActivities, setAllActivities] = useState([
    { role: "visitor",   msg: "Visitor Rose Mendoza arrived to visit Lara Mendoza.",        time: "10:08 AM",  date: "Dec 18", Icon: UserCheck,    color: "#EC4899", bar: "#EC4899" },
    { role: "visitor",   msg: "Visitor Carl Reyes arrived to visit Maria Santos.",          time: "2:03 PM",   date: "Dec 18", Icon: UserCheck,    color: "#EC4899", bar: "#EC4899" },
    { role: "student",   msg: "Maria Santos paid her December rent.",                       time: "Just now",  date: "Dec 18", Icon: CreditCard,   color: "#16A34A", bar: "#16A34A" },
    { role: "landlord",  msg: "You updated Room B capacity to 6 beds.",                    time: "2h ago",    date: "Dec 18", Icon: Layers,       color: "#9772F6", bar: "#9772F6" },
    { role: "student",   msg: "Kevin Cruz submitted a registration request.",               time: "3h ago",    date: "Dec 18", Icon: Users,        color: "#3B82F6", bar: "#16A34A" },
    { role: "parent",    msg: "Rosa Cruz checked on Kevin's stay status.",                  time: "5h ago",    date: "Dec 18", Icon: Phone,        color: "#F59E0B", bar: "#F59E0B" },
    { role: "visitor",   msg: "Visitor Ben Torres left the boarding house.",                time: "10:58 AM",  date: "Dec 17", Icon: Navigation,   color: "#EC4899", bar: "#EC4899" },
    { role: "landlord",  msg: "You published a water interruption notice.",                 time: "Yesterday", date: "Dec 17", Icon: Megaphone,    color: "#9772F6", bar: "#9772F6" },
    { role: "visitor",   msg: "Visitor Mark dela Cruz left the boarding house.",            time: "2:50 PM",   date: "Dec 16", Icon: Navigation,   color: "#EC4899", bar: "#EC4899" },
    { role: "admin",     msg: "Admin verified Naquila Boarding House.",                     time: "Dec 16",    date: "Dec 16", Icon: Shield,       color: "#3B82F6", bar: "#3B82F6" },
    { role: "student",   msg: "John Doe checked into Room A.",                              time: "Dec 15",    date: "Dec 15", Icon: CheckCircle,  color: "#16A34A", bar: "#16A34A" },
    { role: "parent",    msg: "Ana Reyes messaged you about her daughter.",                 time: "Dec 14",    date: "Dec 14", Icon: MessageCircle,color: "#F59E0B", bar: "#F59E0B" },
  ]);
  const addActivity = (msg: string, Icon: React.ElementType) => {
    const t = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    setAllActivities(prev => [{ role:"landlord", msg, time:t, date:"Today", Icon: Icon as typeof Layers, color:"#9772F6", bar:"#9772F6" }, ...prev]);
  };
  const [hlItems, setHlItems] = useState<Highlight[]>(INITIAL_HIGHLIGHTS);
  const filtered = activityFilter === "all" ? allActivities : allActivities.filter(a => a.role === activityFilter);

  const notifications = [
    { icon: Bell,        color: "#9772F6", bg: "#F5F0FF", title: "Rent reminder sent",           sub: "All occupants notified",           time: "2h ago"    },
    { icon: UserCheck,   color: "#16A34A", bg: "#DCFCE7", title: "Lara Mendoza approved",         sub: "Moved into Room B",                time: "5h ago"    },
    { icon: AlertCircle, color: "#EF4444", bg: "#FEE2E2", title: "Room C is now full",            sub: "No available beds",                time: "Yesterday" },
    { icon: MessageCircle,color:"#3B82F6", bg: "#EFF6FF", title: "New message from Maria Santos", sub: "About the inspection schedule",    time: "Dec 17"    },
    { icon: Megaphone,   color: "#D97706", bg: "#FEF3C7", title: "Your notice was published",     sub: "Water interruption Dec 20",        time: "Dec 15"    },
  ];


  const quickActions = [
    { Icon: Users,       label: "View Occupants", color: "#9772F6", bg: "#F5F0FF",  action: () => go("occupants")  },
    { Icon: Layers,      label: "Manage Rooms",   color: "#3B82F6", bg: "#EFF6FF",  action: () => go("rooms")      },
    { Icon: MapPin,      label: "BH on Map",      color: "#16A34A", bg: "#DCFCE7",  action: () => go("map")        },
    { Icon: Megaphone,   label: "Announce",       color: "#D97706", bg: "#FEF3C7",  action: () => {}               },
    { Icon: Calendar,   label: "Home Visit",      color: "#8B5CF6", bg: "#EDE9FE",  action: () => go("homeVisit")  },
    { Icon: Settings,    label: "Settings",       color: "#6B7280", bg: "#F3F4F6",  action: () => go("settings")   },
  ];

  function sendChat() {
    if (!chatMsg.trim()) return;
    setChatThread(t => [...t, { from: "landlord", name: "You", msg: chatMsg.trim(), time: new Date().toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"}) }]);
    setChatMsg("");
    setTimeout(() => { chatRef.current?.scrollTo({ top: 9999, behavior: "smooth" }); }, 60);
  }

  // visitor helpers
  const vStatusMeta = (s: "inside"|"left") => s === "inside"
    ? { label: "Inside", color: "#3B82F6", bg: "#EFF6FF" }
    : { label: "Left",   color: "#6B7280", bg: "#F3F4F6" };

  const confirmLeft = (id: string) => {
    const t = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    setVisitors(vs => vs.map(v => v.id === id ? { ...v, status: "left", timeOut: t } : v));
  };

  const filteredVisitors = visitors.filter(v => {
    const q = visitorSearch.toLowerCase();
    const matchQ = !q || (v.visitorName ?? "").toLowerCase().includes(q) || v.studentName.toLowerCase().includes(q);
    const matchF =
      visitorFilter === "all"    ? true :
      visitorFilter === "today"  ? v.date === "Dec 18" :
      visitorFilter === "week"   ? ["Dec 18","Dec 17","Dec 16","Dec 15","Dec 14"].includes(v.date) :
      visitorFilter === "month"  ? true :
      visitorFilter === "inside" ? v.status === "inside" :
      visitorFilter === "left"   ? v.status === "left" : true;
    return matchQ && matchF;
  }).sort((a, b) => visitorSort === "oldest" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id));

  const vSummary = {
    today: visitors.filter(v => v.date === "Dec 18").length,
    week:  visitors.filter(v => ["Dec 18","Dec 17","Dec 16","Dec 15","Dec 14"].includes(v.date)).length,
    inside: visitors.filter(v => v.status === "inside").length,
  };

  const rolePill = (r: string) => {
    const map: Record<string,{label:string;color:string;bg:string}> = {
      landlord: { label: "Landlord", color: "#9772F6", bg: "#F5F0FF" },
      student:  { label: "Student",  color: "#16A34A", bg: "#DCFCE7" },
      parent:   { label: "Parent",   color: "#F59E0B", bg: "#FEF3C7" },
      admin:    { label: "Admin",    color: "#3B82F6", bg: "#EFF6FF" },
      visitor:  { label: "Visitor",  color: "#EC4899", bg: "#FCE7F3" },
    };
    const m = map[r] ?? map.admin;
    return <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: m.bg, color: m.color, fontFamily: QS }}>{m.label}</span>;
  };

  const SH = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ color: "#1F2937", fontSize: 14, fontWeight: 800, margin: 0, fontFamily: QS }}>{title}</h2>
      {action && <button onClick={onAction} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>{action}</button>}
    </div>
  );

  if (role !== "landlord") {
    // ── Student / Admin / Parent fallback ─────────────────────────────────
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F3F4F8", position: "relative" }}>
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
          {/* Header with notif + chat */}
          <div style={{ backgroundImage: GRAD_H, paddingTop: 48, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
            {/* Icon row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DormiLogo size={28} white />
                <span style={{ color: "white", fontSize: 16, fontWeight: 800, fontFamily: QS, letterSpacing: -0.3 }}>DormiTrack</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => go("notifications")} style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,.14)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                  <Bell size={20} color="white" />
                  {notifCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#EF4444", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{notifCount > 9 ? "9+" : notifCount}</span>}
                </button>
                <button onClick={() => setChatOpen(true)} style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,.14)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                  <MessageCircle size={20} color="white" />
                  <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#22C55E", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                </button>
              </div>
            </div>
            {/* Welcome */}
            <div style={{ padding: "6px 16px 20px" }}>
              <p style={{ color: "rgba(255,255,255,.65)", fontSize: 11, margin: "0 0 2px", fontFamily: IN }}>{dateStr}</p>
              <p style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 1px", fontFamily: QS }}>{greeting}! 👋</p>
              <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, margin: 0, fontFamily: IN }}>Welcome back to DormiTrack</p>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ background: "white", borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,.06)", textAlign: "center" }}>
              <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>Your dashboard is ready.</p>
            </div>
          </div>
        </div>
        <BottomNav active="dashboard" go={go} leftTabs={navTabsForRole(role).left} rightTabs={navTabsForRole(role).right} />
        {/* Chat panel shared */}
        {chatOpen && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ background: "white", borderRadius: "24px 24px 0 0", height: "72%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 13, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><User size={17} color="white" /></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: QS }}>Messages</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontFamily: IN }}>Chat with your landlord</p>
                </div>
                <button onClick={() => setChatOpen(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} color="#6B7280" /></button>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 13, color: "#9CA3AF", fontFamily: IN }}>No messages yet.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F3F4F8", position: "relative" }}>

      {/* ── TOP NAV ─────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, backgroundImage: GRAD_H, paddingTop: 48, position: "relative", overflow: "hidden" }}>
        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />

        {/* Icon row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DormiLogo size={28} white />
            <span style={{ color: "white", fontSize: 16, fontWeight: 800, fontFamily: QS, letterSpacing: -0.3 }}>DormiTrack</span>
          </div>
          {/* Right icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => go("notifications")} style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,.14)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              <Bell size={20} color="white" />
              <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#EF4444", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
            </button>
            <button onClick={() => setChatOpen(true)} style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,.14)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              <MessageCircle size={20} color="white" />
              <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#22C55E", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
            </button>
          </div>
        </div>

        {/* Welcome banner */}
        <div style={{ padding: "6px 16px 20px" }}>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 11, margin: "0 0 2px", fontFamily: IN }}>{dateStr}</p>
          <p style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 1px", fontFamily: QS }}>{greeting}, Kyla! 👋</p>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, margin: 0, fontFamily: IN }}>Naquila Boarding House · Calape, Bohol</p>
        </div>
      </div>

      {/* ── SCROLL BODY ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>

        {/* ── 8 SUMMARY CARDS ─────────────────────────────────────────────── */}
        <div style={{ padding: "16px 16px 0" }}>
          <SH title="Boarding House Overview" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {summaryCards.map(({ label, value, Icon, color, bg }) => {
              const isOcc = label === "Occupancy Rate";
              const pct = 78;
              const r = 16, circ = 2 * Math.PI * r;
              return (
                <div key={label} style={{ background: "white", borderRadius: 18, padding: "14px 14px", boxShadow: "0 2px 10px rgba(0,0,0,.05)", display: "flex", alignItems: "center", gap: 12 }}>
                  {isOcc ? (
                    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                      <svg width={44} height={44} viewBox="0 0 44 44">
                        <circle cx={22} cy={22} r={r} fill="none" stroke="#F3F4F6" strokeWidth={4} />
                        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
                          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
                          strokeLinecap="round" transform="rotate(-90 22 22)" />
                      </svg>
                      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color, fontFamily: QS }}>{pct}%</span>
                    </div>
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={20} color={color} />
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: isOcc ? 18 : 22, fontWeight: 800, color: "#1F2937", margin: 0, lineHeight: 1, fontFamily: QS }}>{isOcc ? `${pct}%` : value}</p>
                    <p style={{ fontSize: 10, color: "#6B7280", margin: "3px 0 0", lineHeight: 1.3, fontFamily: IN }}>{label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── HIGHLIGHTS & SCHEDULE ────────────────────────────────────────── */}
        {role === "landlord" && highlightsEnabled && (
          <HighlightsDashboardSection
            highlights={hlItems}
            today={HL_TODAY}
            onAdd={h => setHlItems(prev => [...prev, { ...h, id: `hl${Date.now()}` }])}
            onEdit={h => setHlItems(prev => prev.map(x => x.id === h.id ? h : x))}
            onDelete={id => setHlItems(prev => prev.filter(x => x.id !== id))}
            onActivity={addActivity}
          />
        )}

        {/* ── RESERVATION REQUESTS ─────────────────────────────────────────── */}
        <div style={{ padding: "0 16px 0" }}>
          <SH title="Reservation Requests" action={`View All (${requests.length})`} onAction={() => go("occupants")} />
          <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 20 }}>
            {requests.map((r, i) => {
              const st = reqStates[r.id];
              return (
                <div key={r.id} style={{ padding: "14px 16px", borderBottom: i < requests.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 13, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <User size={17} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: QS }}>{r.name}</p>
                        {st !== "pending" && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: st === "accepted" ? "#DCFCE7" : "#FEE2E2", color: st === "accepted" ? "#16A34A" : "#EF4444", fontFamily: QS }}>{st === "accepted" ? "Accepted" : "Rejected"}</span>}
                      </div>
                      <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0, fontFamily: IN }}>{r.id} · {r.course} · {r.year}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: "#F5F0FF", color: "#9772F6", fontFamily: QS }}>{r.room}</span>
                  </div>
                  {st === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setReqStates(s => ({ ...s, [r.id]: "accepted" }))} style={{ flex: 1, padding: "9px 0", borderRadius: 12, background: "#DCFCE7", color: "#16A34A", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS }}>✓ Accept</button>
                      <button onClick={() => setReqStates(s => ({ ...s, [r.id]: "rejected" }))} style={{ flex: 1, padding: "9px 0", borderRadius: 12, background: "#FEE2E2", color: "#EF4444", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS }}>✗ Reject</button>
                      <button style={{ width: 38, padding: "9px 0", borderRadius: 12, background: "#EFF6FF", color: "#3B82F6", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MessageCircle size={14} color="#3B82F6" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── VISITOR RECORDS (compact logbook card) ───────────────────────── */}
        {visitorEnabled && (
          <div style={{ padding: "0 16px 0" }}>
            <SH title="Visitor Records" />
            <div style={{ background: "white", borderRadius: 20, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 20 }}>
              {/* Logbook icon + title */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 15, background: "#FCE7F3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BookOpen size={20} color="#EC4899" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Visitor Log</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>Student-submitted visitor records</p>
                </div>
              </div>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Today",         value: vSummary.today,  color: "#EC4899", bg: "#FCE7F3" },
                  { label: "This Week",     value: vSummary.week,   color: "#9772F6", bg: "#F5F0FF" },
                  { label: "Inside Now",    value: vSummary.inside, color: "#3B82F6", bg: "#EFF6FF" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ borderRadius: 14, padding: "10px 0", textAlign: "center", background: bg }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color, fontFamily: QS }}>{value}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 9, color: "#6B7280", fontFamily: IN }}>{label}</p>
                  </div>
                ))}
              </div>
              {/* View button */}
              <button onClick={() => setShowVisitorModal(true)} style={{ width: "100%", padding: "12px 0", borderRadius: 14, backgroundImage: "linear-gradient(135deg,#EC4899,#9772F6)", color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(236,72,153,.3)" }}>
                <BookOpen size={15} color="white" />
                View Visitor Records
              </button>
            </div>
          </div>
        )}

        {/* ── STUDENT CONCERNS ─────────────────────────────────────────────── */}
        {(() => {
          const QS2 = "'Quicksand',sans-serif";
          const IN2 = "'Inter',sans-serif";
          const GRAD2 = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
          const filtered2 = reportStatusFilter === "all" ? studentReports : studentReports.filter(r=>r.status===reportStatusFilter);
          const pendingCount = studentReports.filter(r=>r.status==="pending").length;

          const handleUpdateStatus = (id: string, status: ReportStatus, response?: string) => {
            const now = new Date();
            const dateStr = now.toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
            const updates: Partial<StudentReport> = { status };
            if (response) { updates.landlordResponse = response; updates.landlordResponseDate = now.toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}); }
            const report = studentReports.find(r=>r.id===id);
            if (report) {
              updates.statusHistory = [...report.statusHistory, { status, date: dateStr, note: response ? "Landlord responded" : undefined }];
            }
            updateStudentReport(id, updates);
            setStudentReports(getReports().filter(r=>r.boardingHouse==="Naquila BH"||r.boardingHouse==="Naquila Boarding House"));
            setSelectedStudentReport(null);
            setReportResponseText("");
          };

          return (
            <div style={{ padding: "0 16px 0" }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS2 }}>Student Concerns</p>
                  {pendingCount>0 && <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"#FEE2E2", color:"#EF4444", fontFamily:QS2 }}>{pendingCount} pending</span>}
                </div>
                <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"#F5F0FF", color:"#9772F6", fontFamily:QS2 }}>{studentReports.length} total</span>
              </div>
              {/* Status filters */}
              <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto" as const, scrollbarWidth:"none" as const }}>
                {(["all","pending","in-progress","resolved","closed"] as const).map(s=>(
                  <button key={s} onClick={()=>setReportStatusFilter(s)} style={{ flexShrink:0, padding:"5px 13px", borderRadius:20, border:"none", cursor:"pointer", fontSize:10, fontWeight:800, fontFamily:QS2,
                    background: reportStatusFilter===s ? GRAD2 : "white",
                    color: reportStatusFilter===s ? "white" : "#6B7280",
                    boxShadow: reportStatusFilter===s ? "0 2px 8px rgba(151,114,246,.25)" : "0 1px 4px rgba(0,0,0,.06)",
                  }}>{s==="all"?"All":s==="in-progress"?"In Progress":s.charAt(0).toUpperCase()+s.slice(1)}</button>
                ))}
              </div>
              {filtered2.length===0 ? (
                <div style={{ background:"white", borderRadius:18, padding:"24px 16px", textAlign:"center" as const, boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
                  <p style={{ margin:0, fontSize:13, color:"#9CA3AF", fontFamily:IN2 }}>No concerns in this category</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column" as const, gap:10, marginBottom:16 }}>
                  {filtered2.map(r=>{
                    const cm = CATEGORY_META[r.category];
                    const pm = PRIORITY_META[r.priority];
                    const sm = STATUS_META[r.status];
                    return (
                      <div key={r.id} onClick={()=>{ setSelectedStudentReport(r); setReportResponseText(r.landlordResponse||""); }} style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", cursor:"pointer", borderLeft:`4px solid ${cm.color}` }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" as const }}>
                              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS2, display:"flex", alignItems:"center", gap:3 }}>
                                <div style={{ width:4, height:4, borderRadius:"50%", background:sm.dot }}/>{sm.label}
                              </span>
                              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS2 }}>{cm.label}</span>
                              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS2 }}>{pm.emoji} {pm.label}</span>
                            </div>
                            <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS2, lineHeight:1.3 }}>{r.title}</p>
                            <p style={{ margin:"0 0 1px", fontSize:11, color:"#9CA3AF", fontFamily:IN2 }}>{r.studentName} · {r.roomNumber}</p>
                            <p style={{ margin:0, fontSize:10, color:"#C4C9D4", fontFamily:IN2 }}>{r.dateSubmitted}</p>
                          </div>
                          <div style={{ fontSize:14, color:"#D1D5DB" }}>›</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Report Detail Panel */}
              {selectedStudentReport && (()=>{
                const r = selectedStudentReport;
                const cm = CATEGORY_META[r.category];
                const pm = PRIORITY_META[r.priority];
                const sm = STATUS_META[r.status];
                return (
                  <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:500, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setSelectedStudentReport(null)}>
                    <div style={{ background:"#F7F8FC", borderRadius:"28px 28px 0 0", maxHeight:"90%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
                      <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:10 }}>
                        <div onClick={()=>setSelectedStudentReport(null)} style={{ width:34, height:34, borderRadius:11, background:"#F3F4F6", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const, marginBottom:3 }}>
                            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS2 }}>{sm.label}</span>
                            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS2 }}>{pm.emoji} {pm.label}</span>
                            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS2 }}>{cm.label}</span>
                          </div>
                          <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS2, lineHeight:1.3 }}>{r.title}</p>
                        </div>
                      </div>
                      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 18px 36px" }}>
                        {/* Student info */}
                        <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                          {([["Student",r.studentName],["Student ID",r.studentId],["Room",r.roomNumber],["Bed",r.bedNumber],["Date Submitted",r.dateSubmitted],["Time",r.timeSubmitted]] as [string,string][]).map(([l,v])=>(
                            <div key={l}>
                              <p style={{ margin:"0 0 1px", fontSize:9, color:"#9CA3AF", fontFamily:QS2, fontWeight:700, textTransform:"uppercase" as const }}>{l}</p>
                              <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#1F2937", fontFamily:QS2 }}>{v}</p>
                            </div>
                          ))}
                        </div>
                        {/* Description */}
                        <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                          <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS2, textTransform:"uppercase" as const }}>Description</p>
                          <p style={{ margin:0, fontSize:12, color:"#374151", fontFamily:IN2, lineHeight:1.7 }}>{r.description}</p>
                        </div>
                        {/* Update status */}
                        <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                          <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS2, textTransform:"uppercase" as const }}>Update Status</p>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, marginBottom:12 }}>
                            {(["in-progress","resolved","closed"] as ReportStatus[]).map(s=>{
                              const ssm = STATUS_META[s];
                              return (
                                <button key={s} onClick={()=>handleUpdateStatus(r.id, s)} style={{ padding:"7px 14px", borderRadius:14, border:`2px solid ${r.status===s?ssm.color:"#E5E7EB"}`, background:r.status===s?ssm.bg:"white", color:r.status===s?ssm.color:"#6B7280", fontSize:11, fontWeight:800, fontFamily:QS2, cursor:"pointer" }}>
                                  {s==="in-progress"?"In Progress":s.charAt(0).toUpperCase()+s.slice(1)}
                                </button>
                              );
                            })}
                          </div>
                          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS2 }}>Your Response</p>
                          <div style={{ background:"#F9FAFB", borderRadius:11, padding:"9px 12px", border:"1.5px solid #E5E7EB", marginBottom:9 }}>
                            <textarea value={reportResponseText} onChange={e=>setReportResponseText(e.target.value)} placeholder="Write your response to the student..." rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:12, fontFamily:IN2, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
                          </div>
                          <button onClick={()=>handleUpdateStatus(r.id, r.status==="pending"?"in-progress":r.status, reportResponseText)} style={{ width:"100%", height:44, borderRadius:16, backgroundImage:GRAD2, border:"none", cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS2, boxShadow:"0 4px 14px rgba(151,114,246,.3)" }}>
                            Send Response
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ── RECENT ACTIVITY ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 16px 0" }}>
          <SH title="Recent Activity" action="View All" onAction={() => setShowAllActivity(true)} />
          {/* Role filters */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" as const }}>
            {(["all","landlord","student","parent","admin","visitor"] as const).map(f => (
              <button key={f} onClick={() => setActivityFilter(f)} style={{ flexShrink: 0, padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: QS,
                background: activityFilter === f ? GRAD : "white",
                color: activityFilter === f ? "white" : "#6B7280",
                boxShadow: activityFilter === f ? "0 2px 8px rgba(151,114,246,.25)" : "0 1px 4px rgba(0,0,0,.06)",
              }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 20 }}>
            {filtered.slice(0, 6).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 0, padding: "12px 0 12px 0", borderBottom: i < Math.min(filtered.length, 6) - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
                {/* Role color bar */}
                <div style={{ width: 4, alignSelf: "stretch", background: a.bar, borderRadius: "0 2px 2px 0", flexShrink: 0, minHeight: 40 }} />
                <div style={{ display: "flex", gap: 10, flex: 1, padding: "0 14px" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: a.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <a.Icon size={15} color={a.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      {rolePill(a.role)}
                      <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{a.time}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#374151", fontWeight: 600, margin: 0, lineHeight: 1.4, fontFamily: IN }}>{a.msg}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav active="dashboard" go={go} leftTabs={navTabsForRole(role).left} rightTabs={navTabsForRole(role).right} />

      {/* ── ALL ACTIVITY MODAL ───────────────────────────────────────────────── */}
      {showAllActivity && (() => {
        const DATE_LABELS: Record<string,string> = { "Dec 18": "Today", "Dec 17": "Yesterday", "Dec 16": "Dec 16", "Dec 15": "Dec 15", "Dec 14": "Dec 14" };
        const dateOk = (date: string) => {
          if (activityDateFilter === "all")   return true;
          if (activityDateFilter === "today") return date === "Dec 18";
          if (activityDateFilter === "week")  return ["Dec 18","Dec 17","Dec 16","Dec 15","Dec 14"].includes(date);
          if (activityDateFilter === "month") return true;
          return true;
        };
        const modalFiltered = allActivities.filter(a =>
          (activityFilter === "all" || a.role === activityFilter) && dateOk(a.date)
        );
        // group by date
        const groups: Record<string, typeof allActivities> = {};
        modalFiltered.forEach(a => {
          if (!groups[a.date]) groups[a.date] = [];
          groups[a.date].push(a);
        });
        const dates = Object.keys(groups).sort((x, y) => y.localeCompare(x));

        return (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ background: "#F3F4F8", borderRadius: "24px 24px 0 0", height: "90%", display: "flex", flexDirection: "column" }}>

              {/* Header */}
              <div style={{ flexShrink: 0, background: "white", borderRadius: "24px 24px 0 0", padding: "18px 20px 0", borderBottom: "1px solid #F3F4F6" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Recent Activity</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{modalFiltered.length} entries</p>
                  </div>
                  <button onClick={() => setShowAllActivity(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={15} color="#6B7280" />
                  </button>
                </div>

                {/* Date filter */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {([
                    { id: "all",   label: "All Time" },
                    { id: "today", label: "Today"    },
                    { id: "week",  label: "This Week" },
                    { id: "month", label: "This Month"},
                  ] as const).map(d => (
                    <button key={d.id} onClick={() => setActivityDateFilter(d.id)} style={{ flexShrink: 0, padding: "5px 13px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: QS,
                      background: activityDateFilter === d.id ? "#9772F6" : "#F3F4F6",
                      color: activityDateFilter === d.id ? "white" : "#6B7280",
                      boxShadow: activityDateFilter === d.id ? "0 2px 8px rgba(151,114,246,.25)" : "none",
                    }}>{d.label}</button>
                  ))}
                </div>

                {/* Role filter */}
                <div style={{ display: "flex", gap: 6, paddingBottom: 12, overflowX: "auto", scrollbarWidth: "none" as const }}>
                  {(["all","landlord","student","parent","admin","visitor"] as const).map(f => (
                    <button key={f} onClick={() => setActivityFilter(f)} style={{ flexShrink: 0, padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: QS,
                      background: activityFilter === f ? "#7549F6" : "#F3F4F6",
                      color: activityFilter === f ? "white" : "#6B7280",
                    }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                  ))}
                </div>
              </div>

              {/* Grouped list */}
              <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "14px 16px 28px" }}>
                {dates.length === 0 ? (
                  <div style={{ textAlign: "center", paddingTop: 40 }}>
                    <p style={{ fontSize: 13, color: "#9CA3AF", fontFamily: IN }}>No activity matches your filters.</p>
                  </div>
                ) : dates.map(date => (
                  <div key={date}>
                    {/* Date label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", fontFamily: QS, flexShrink: 0 }}>{DATE_LABELS[date] ?? date}</span>
                      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                    </div>
                    <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.04)", marginBottom: 14 }}>
                      {groups[date].map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 0, padding: "11px 0", borderBottom: i < groups[date].length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
                          <div style={{ width: 4, alignSelf: "stretch", background: a.bar, borderRadius: "0 2px 2px 0", flexShrink: 0, minHeight: 36 }} />
                          <div style={{ display: "flex", gap: 10, flex: 1, padding: "0 14px" }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: a.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                              <a.Icon size={14} color={a.color} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                {rolePill(a.role)}
                                <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{a.time}</span>
                              </div>
                              <p style={{ fontSize: 12, color: "#374151", fontWeight: 600, margin: 0, lineHeight: 1.4, fontFamily: IN }}>{a.msg}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── VIEW VISITORS MODAL ──────────────────────────────────────────────── */}
      {showVisitorModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "#F3F4F8", borderRadius: "24px 24px 0 0", height: "90%", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "18px 20px 14px", background: "white", borderRadius: "24px 24px 0 0", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 13, background: "#FCE7F3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BookOpen size={17} color="#EC4899" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: QS }}>Visitor Records</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontFamily: IN }}>{filteredVisitors.length} {filteredVisitors.length === 1 ? "record" : "records"}</p>
              </div>
              <button onClick={() => { setShowVisitorModal(false); setVisitorSearch(""); setVisitorFilter("all"); }} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#6B7280" />
              </button>
            </div>
            {/* Filters */}
            <div style={{ padding: "12px 16px 0", background: "white", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Search size={13} color="#9CA3AF" />
                  <input value={visitorSearch} onChange={e => setVisitorSearch(e.target.value)} placeholder="Search visitor or student name…" style={{ flex: 1, border: "none", outline: "none", fontSize: 12, fontFamily: IN, color: "#1F2937", background: "transparent" }} />
                </div>
                <select value={visitorSort} onChange={e => setVisitorSort(e.target.value as typeof visitorSort)} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 11, fontFamily: QS, color: "#374151", background: "white", cursor: "pointer", outline: "none" }}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 6, paddingBottom: 12, overflowX: "auto", scrollbarWidth: "none" as const }}>
                {(["all","today","week","month","inside","left"] as const).map(f => (
                  <button key={f} onClick={() => setVisitorFilter(f)} style={{ flexShrink: 0, padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: QS,
                    background: visitorFilter === f ? "#EC4899" : "#F3F4F6",
                    color: visitorFilter === f ? "white" : "#6B7280",
                  }}>
                    {f === "all" ? "All" : f === "today" ? "Today" : f === "week" ? "This Week" : f === "month" ? "This Month" : f === "inside" ? "Inside" : "Left"}
                  </button>
                ))}
              </div>
            </div>
            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "12px 16px 24px" }}>
              {filteredVisitors.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 40 }}>
                  <BookOpen size={36} color="#D1D5DB" />
                  <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 10, fontFamily: IN }}>No records match your filter.</p>
                </div>
              ) : filteredVisitors.map((v) => {
                const sm = vStatusMeta(v.status);
                return (
                  <div key={v.id} style={{ background: "white", borderRadius: 18, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                    {/* Row 1: visitor name + status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FCE7F3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <User size={16} color="#EC4899" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
                          {visitorFields.name && v.visitorName && <span style={{ fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{v.visitorName}</span>}
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: sm.bg, color: sm.color, fontFamily: QS }}>{sm.label}</span>
                        </div>
                        <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0, fontFamily: IN }}>
                          {visitorFields.relationship && v.relationship ? `${v.relationship} · ` : ""}{v.studentName} · {v.room}
                        </p>
                      </div>
                    </div>
                    {/* Row 2: detail fields */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginBottom: 10 }}>
                      {visitorFields.contact && v.contact && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <Phone size={10} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 9, color: "#C4C9D4", margin: 0, fontFamily: IN }}>Contact</p>
                            <p style={{ fontSize: 10, color: "#374151", fontWeight: 600, margin: 0, fontFamily: IN }}>{v.contact}</p>
                          </div>
                        </div>
                      )}
                      {visitorFields.purpose && v.purpose && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <Info size={10} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 9, color: "#C4C9D4", margin: 0, fontFamily: IN }}>Purpose</p>
                            <p style={{ fontSize: 10, color: "#374151", fontWeight: 600, margin: 0, fontFamily: IN }}>{v.purpose}</p>
                          </div>
                        </div>
                      )}
                      {visitorFields.visitDate && v.visitDate && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <Calendar size={10} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 9, color: "#C4C9D4", margin: 0, fontFamily: IN }}>Visit Date</p>
                            <p style={{ fontSize: 10, color: "#374151", fontWeight: 600, margin: 0, fontFamily: IN }}>{v.visitDate}</p>
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                        <Clock size={10} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 9, color: "#C4C9D4", margin: 0, fontFamily: IN }}>Time In</p>
                          <p style={{ fontSize: 10, color: "#374151", fontWeight: 600, margin: 0, fontFamily: IN }}>{v.timeIn ?? "—"}</p>
                        </div>
                      </div>
                      {v.timeOut && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <Clock size={10} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 9, color: "#C4C9D4", margin: 0, fontFamily: IN }}>Time Out</p>
                            <p style={{ fontSize: 10, color: "#374151", fontWeight: 600, margin: 0, fontFamily: IN }}>{v.timeOut}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Action */}
                    {v.status === "inside" && (
                      <button onClick={() => confirmLeft(v.id)} style={{ padding: "6px 14px", borderRadius: 10, background: "#F3F4F6", color: "#6B7280", fontSize: 10, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS }}>
                        Visitor Has Left
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT PANEL ───────────────────────────────────────────────────────── */}
      {chatOpen && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", height: "72%", display: "flex", flexDirection: "column" }}>
            {/* Chat header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 13, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={17} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: QS }}>Maria Santos</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontFamily: IN }}>Room A · Active tenant</p>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#6B7280" />
              </button>
            </div>
            {/* Messages */}
            <div ref={chatRef} style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {chatThread.map((m, i) => {
                const isMe = m.from === "landlord";
                return (
                  <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "72%", padding: "9px 13px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isMe ? GRAD : "#F3F4F6" }}>
                      <p style={{ fontSize: 13, color: isMe ? "white" : "#1F2937", margin: "0 0 3px", fontFamily: IN, lineHeight: 1.4 }}>{m.msg}</p>
                      <p style={{ fontSize: 9, color: isMe ? "rgba(255,255,255,.6)" : "#9CA3AF", margin: 0, textAlign: "right", fontFamily: IN }}>{m.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Input */}
            <div style={{ padding: "12px 16px 20px", borderTop: "1px solid #F3F4F6", display: "flex", gap: 10 }}>
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Type a message…"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 14, border: "1.5px solid #E5E7EB", outline: "none", fontSize: 13, fontFamily: IN, color: "#1F2937" }}
              />
              <button onClick={sendChat} style={{ width: 42, height: 42, borderRadius: 14, backgroundImage: GRAD, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Navigation size={17} color="white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ROOMS ─────────────────────────────────────────────────────────────────────

function RoomsScreen({ go, role = "landlord" }: { go: (s: Screen) => void; role?: Role }) {
  const QS = "'Quicksand',sans-serif";
  const rooms = [
    { name: "Room A", cap: 6, occ: 6, students: ["Juan Dela Cruz","Maria Santos","Kevin Cruz","Lena Reyes","Ben Torres","Clara Lim"], desc: "Ground floor, near entrance" },
    { name: "Room B", cap: 6, occ: 4, students: ["Dan Cruz","Eva Santos","Faye Gomez","Gil Navarro"], desc: "Ground floor, garden view" },
    { name: "Room C", cap: 5, occ: 5, students: ["Harry Uy","Iris Bautista","Jake Flores","Kim Santos","Leo Tan"], desc: "Second floor, corner room" },
    { name: "Room D", cap: 5, occ: 2, students: ["Mia Cruz","Ned Reyes"], desc: "Second floor, street view" },
    { name: "Room E", cap: 4, occ: 3, students: ["Ona Torres","Paul Diaz","Ria Santos"], desc: "Third floor, spacious" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "52px 20px 20px", backgroundImage: GRAD_H, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center" }}><ChevronLeft size={24} /></button>
        <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: QS }}>Room Management</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>Sunshine Dormitories · {rooms.length} rooms</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 16px 0" }}>
        <button style={{ width: "100%", padding: "13px 0", borderRadius: 16, backgroundImage: GRAD, color: "white", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, marginBottom: 16, boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>+ Add New Room</button>
        {rooms.map((r) => {
          const pct = Math.round((r.occ / r.cap) * 100);
          const full = r.occ >= r.cap;
          return (
            <div key={r.name} style={{ background: "white", borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{r.name}</span>
                    <span style={{ padding: "2px 10px", borderRadius: 20, background: full ? "#FEE2E2" : "#DCFCE7", color: full ? "#EF4444" : "#16A34A", fontSize: 10, fontWeight: 800 }}>{full ? "Full" : `${r.cap - r.occ} slots`}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{r.desc}</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ width: 30, height: 30, borderRadius: 10, background: "#F5F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Settings size={14} color="#9772F6" /></button>
                  <button style={{ width: 30, height: 30, borderRadius: 10, background: "#FEE2E2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><AlertCircle size={14} color="#EF4444" /></button>
                </div>
              </div>
              {/* Occupancy bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 6, background: "#F3F4F6", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: full ? "#EF4444" : "linear-gradient(90deg,#9772F6,#7549F6)" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: full ? "#EF4444" : "#9772F6", fontFamily: QS, flexShrink: 0 }}>{r.occ}/{r.cap}</span>
              </div>
              {/* Students */}
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                {r.students.map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 12, background: "#F9FAFB" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><User size={10} color="white" /></div>
                    <span style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>{s}</span>
                  </div>
                ))}
                <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 12, background: "#F5F0FF", border: "none", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: "#9772F6", fontWeight: 700 }}>+ Add</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav active="rooms" go={go} leftTabs={navTabsForRole(role).left} rightTabs={navTabsForRole(role).right} />
    </div>
  );
}

// ── DORM INFO ─────────────────────────────────────────────────────────────────

function DormInfoScreen({ go }: { go: (s: Screen) => void }) {
  const amenities = ["WiFi", "Air Conditioning", "Hot Shower", "Laundry", "CCTV", "24/7 Security", "Parking", "Kitchen", "Study Room"];
  return (
    <div style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ height: 220, backgroundImage: GRAD_H, position: "relative", display: "flex", alignItems: "flex-end" }}>
        <button onClick={() => go("dashboard")} style={{ position: "absolute", top: 56, left: 20, width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronLeft size={20} color="white" /></button>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: .12 }}><Building2 size={110} color="white" /></div>
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 12, background: "rgba(255,255,255,.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.2)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
            <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>2 rooms available</span>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 20px 32px" }}>
        <div style={{ background: "white", borderRadius: 24, padding: 20, marginTop: -20, marginBottom: 16, boxShadow: "0 8px 32px rgba(117,73,246,.12)" }}>
          <h1 style={{ color: "#1F2937", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>Sunshine Dormitories</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><MapPin size={13} color="#9772F6" /><span style={{ fontSize: 12, color: "#6B7280" }}>Cangumba, San Isidro, Calape, Bohol</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ padding: "4px 12px", borderRadius: 99, background: "#F5F0FF", color: "#9772F6", fontSize: 12, fontWeight: 800 }}>Room 204</span>
            <span style={{ padding: "4px 12px", borderRadius: 99, background: "#DCFCE7", color: "#16A34A", fontSize: 12, fontWeight: 800 }}>Active Tenant</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 1 }}>{[1,2,3,4,5].map(s => <Star key={s} size={12} color="#F59E0B" fill="#F59E0B" />)}</div>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 20, padding: 16, marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", margin: "0 0 12px", fontFamily: "'Quicksand',sans-serif" }}>Landlord</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><User size={22} color="white" /></div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, color: "#1F2937", fontSize: 14, margin: "0 0 2px" }}>Robert Landlord</p>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Manager · Sunshine Dormitories</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[Phone, Mail].map((Ic, i) => <button key={i} style={{ width: 36, height: 36, borderRadius: 12, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}><Ic size={15} color="#9772F6" /></button>)}
            </div>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 20, padding: 16, marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1F2937", margin: "0 0 12px", fontFamily: "'Quicksand',sans-serif" }}>Amenities</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {amenities.map(a => (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 12, background: "#F5F0FF" }}>
                <Check size={11} color="#9772F6" style={{ flexShrink: 0 }} /><span style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.3 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ flex: 1, padding: "14px 0", borderRadius: 18, border: "2px solid #9772F6", color: "#9772F6", fontWeight: 800, fontSize: 13, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Quicksand',sans-serif" }}><Phone size={15} />Call Landlord</button>
          <button onClick={() => go("map")} style={{ flex: 1, padding: "14px 0", borderRadius: 18, backgroundImage: GRAD, color: "white", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Quicksand',sans-serif" }}><MapPin size={15} />View Map</button>
        </div>
      </div>
    </div>
  );
}

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

function PaymentsScreen({ go, role = "landlord" }: { go: (s: Screen) => void; role?: Role }) {
  const payments: { month: string; amount: string; status: "paid" | "pending" | "overdue"; date: string; method: string }[] = [
    { month: "December 2024", amount: "₱3,500", status: "pending", date: "Dec 1, 2024", method: "—" },
    { month: "November 2024", amount: "₱3,500", status: "paid", date: "Nov 1, 2024", method: "GCash" },
    { month: "October 2024", amount: "₱3,500", status: "paid", date: "Oct 1, 2024", method: "Cash" },
    { month: "September 2024", amount: "₱3,500", status: "paid", date: "Sep 1, 2024", method: "GCash" },
    { month: "August 2024", amount: "₱2,800", status: "overdue", date: "Aug 1, 2024", method: "—" },
  ];
  const iconC = { paid: "#16A34A", pending: "#D97706", overdue: "#DC2626" };
  const iconB = { paid: "#DCFCE7", pending: "#FEF3C7", overdue: "#FEE2E2" };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
        <div style={{ padding: "56px 20px 64px", backgroundImage: GRAD_H }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h1 style={{ color: "white", fontWeight: 800, fontSize: 18, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>Payment Monitoring</h1>
            <button style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer" }}><RefreshCcw size={18} /></button>
          </div>
          <div style={{ borderRadius: 24, padding: 20, background: "rgba(255,255,255,.14)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.2)" }}>
            <p style={{ color: "rgba(255,255,255,.65)", fontSize: 12, margin: "0 0 2px" }}>Outstanding Balance</p>
            <p style={{ color: "white", fontSize: 30, fontWeight: 800, margin: "0 0 16px", fontFamily: "'Quicksand',sans-serif" }}>₱3,500.00</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div><p style={{ color: "rgba(255,255,255,.55)", fontSize: 11, margin: "0 0 2px" }}>Due Date</p><p style={{ color: "white", fontWeight: 800, fontSize: 13, margin: 0 }}>December 1, 2024</p></div>
              <button style={{ padding: "10px 20px", borderRadius: 14, background: "white", color: "#9772F6", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "'Quicksand',sans-serif" }}>Pay Now</button>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 20px 24px", marginTop: -32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
            {([{ label: "Paid", count: "3", color: "#16A34A", bg: "#DCFCE7" }, { label: "Pending", count: "1", color: "#D97706", bg: "#FEF3C7" }, { label: "Overdue", count: "1", color: "#DC2626", bg: "#FEE2E2" }] as const).map(({ label, count, color, bg }) => (
              <div key={label} style={{ borderRadius: 18, padding: "14px 0", textAlign: "center", background: bg }}>
                <p style={{ fontSize: 24, fontWeight: 800, color, margin: "0 0 2px", fontFamily: "'Quicksand',sans-serif" }}>{count}</p>
                <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, background: "white", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, border: "1px solid #E5E7EB" }}>
              <Search size={15} color="#9CA3AF" /><span style={{ fontSize: 13, color: "#9CA3AF" }}>Search payments…</span>
            </div>
            <button style={{ width: 40, height: 40, background: "white", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #E5E7EB", cursor: "pointer" }}><Filter size={15} color="#6B7280" /></button>
          </div>
          <h2 style={{ color: "#1F2937", fontSize: 14, fontWeight: 800, margin: "0 0 12px", fontFamily: "'Quicksand',sans-serif" }}>Payment History</h2>
          <div style={{ background: "white", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
            {payments.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < payments.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: iconB[p.status], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CreditCard size={17} color={iconC[p.status]} /></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#1F2937", margin: "0 0 2px", fontFamily: "'Quicksand',sans-serif" }}>{p.month}</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{p.date}{p.method !== "—" ? ` · via ${p.method}` : ""}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#1F2937", margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>{p.amount}</p>
                  <Badge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav active="payments" go={go} leftTabs={navTabsForRole(role).left} rightTabs={navTabsForRole(role).right} />
    </div>
  );
}

// ── HOME VISIT ────────────────────────────────────────────────────────────────

function HomeVisitScreen({ go }: { go: (s: Screen) => void }) {
  const [checked, setChecked] = useState(false);
  const history = [
    { action: "Check In", date: "Nov 28, 2024", time: "08:15 AM" },
    { action: "Check Out", date: "Nov 25, 2024", time: "06:30 PM" },
    { action: "Check In", date: "Nov 22, 2024", time: "09:00 AM" },
    { action: "Check Out", date: "Nov 18, 2024", time: "04:45 PM" },
  ];
  return (
    <div style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ padding: "56px 20px 40px", background: "linear-gradient(160deg,#EC4899 0%,#9772F6 55%,#7549F6 100%)" }}>
        <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", marginBottom: 16, padding: 0 }}><ChevronLeft size={24} /></button>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>Home Visit Verification</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>Track your check-ins and check-outs</p>
      </div>
      <div style={{ padding: "0 20px 32px", marginTop: -20 }}>
        <div style={{ background: "white", borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: "0 8px 32px rgba(117,73,246,.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: checked ? "#DCFCE7" : "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {checked ? <CheckCircle size={24} color="#16A34A" /> : <Clock size={24} color="#D97706" />}
            </div>
            <div>
              <p style={{ fontWeight: 800, color: "#1F2937", fontSize: 15, margin: "0 0 2px", fontFamily: "'Quicksand',sans-serif" }}>{checked ? "Checked In" : "Not Checked In"}</p>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>{checked ? "Currently at the boarding house" : "Tap Check In when you arrive"}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, background: "#F7F8FC", border: "1px solid #E5E7EB", marginBottom: 16 }}>
            <Navigation size={15} color="#9772F6" />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#1F2937", margin: "0 0 1px" }}>GPS Location Active</p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>Cangumba, San Isidro, Calape, Bohol</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setChecked(true)} style={{ flex: 1, padding: "14px 0", borderRadius: 18, background: !checked ? "linear-gradient(135deg,#22C55E,#16A34A)" : "#F3F4F6", color: !checked ? "white" : "#9CA3AF", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", boxShadow: !checked ? "0 4px 16px rgba(34,197,94,.3)" : "none", fontFamily: "'Quicksand',sans-serif" }}>Check In</button>
            <button onClick={() => setChecked(false)} style={{ flex: 1, padding: "14px 0", borderRadius: 18, background: checked ? "linear-gradient(135deg,#EF4444,#B91C1C)" : "#F3F4F6", color: checked ? "white" : "#9CA3AF", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", boxShadow: checked ? "0 4px 16px rgba(239,68,68,.3)" : "none", fontFamily: "'Quicksand',sans-serif" }}>Check Out</button>
          </div>
        </div>
        <h2 style={{ color: "#1F2937", fontSize: 14, fontWeight: 800, margin: "0 0 12px", fontFamily: "'Quicksand',sans-serif" }}>Verification History</h2>
        <div style={{ background: "white", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
          {history.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < history.length - 1 ? "1px solid #F9FAFB" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: h.action === "Check In" ? "#DCFCE7" : "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {h.action === "Check In" ? <CheckCircle size={15} color="#16A34A" /> : <AlertCircle size={15} color="#DC2626" />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#1F2937", margin: "0 0 2px" }}>{h.action}</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{h.date} · {h.time}</p>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 99, background: "#DCFCE7", color: "#16A34A", fontSize: 11, fontWeight: 800 }}>Verified</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── OCCUPANTS ─────────────────────────────────────────────────────────────────

function OccupantsScreen({ go, role = "landlord" }: { go: (s: Screen) => void; role?: Role }) {
  const occupants = [
    { name: "Maria Santos", room: "Room 201", course: "BS Nursing", initials: "MS" },
    { name: "Carlo Reyes", room: "Room 202", course: "BS Engineering", initials: "CR" },
    { name: "Ana Lim", room: "Room 203", course: "BS Education", initials: "AL" },
    { name: "Juan Dela Cruz", room: "Room 204", course: "BS IT", initials: "JD" },
    { name: "Petra Villanueva", room: "Room 205", course: "BS Accountancy", initials: "PV" },
    { name: "Rico Mendoza", room: "Room 206", course: "BS Agriculture", initials: "RM" },
  ];
  const grads = ["linear-gradient(135deg,#9772F6,#7C3AED)", "linear-gradient(135deg,#3B82F6,#6366F1)", "linear-gradient(135deg,#10B981,#0EA5E9)", "linear-gradient(135deg,#EC4899,#9772F6)", "linear-gradient(135deg,#F59E0B,#EF4444)", "linear-gradient(135deg,#8B5CF6,#7549F6)"];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
        <div style={{ padding: "56px 20px 32px", background: "linear-gradient(160deg,#3B82F6 0%,#6366F1 55%,#7549F6 100%)" }}>
          <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center" }}><ChevronLeft size={24} /></button>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>Housing Occupants</h1>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>6 occupants · Sunshine Dormitories</p>
        </div>
        <div style={{ padding: "20px 20px 24px" }}>
          <div style={{ background: "white", borderRadius: 18, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, border: "1px solid #E5E7EB", marginBottom: 20 }}>
            <Search size={15} color="#9CA3AF" /><span style={{ fontSize: 13, color: "#9CA3AF" }}>Search occupants…</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {occupants.map((o, i) => (
              <div key={i} style={{ background: "white", borderRadius: 24, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, backgroundImage: grads[i], display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14, fontFamily: "'Quicksand',sans-serif" }}>{o.initials}</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 800, color: "#1F2937", fontSize: 13, margin: "0 0 2px", fontFamily: "'Quicksand',sans-serif" }}>{o.name}</p>
                  <p style={{ fontSize: 10, color: "#9CA3AF", margin: "0 0 1px" }}>{o.room}</p>
                  <p style={{ fontSize: 10, color: "#6B7280", margin: 0 }}>{o.course}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[Phone, MessageCircle].map((Ic, j) => <button key={j} style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}><Ic size={13} color="#9772F6" /></button>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav active="occupants" go={go} leftTabs={navTabsForRole(role).left} rightTabs={navTabsForRole(role).right} />
    </div>
  );
}

// ── MAP ───────────────────────────────────────────────────────────────────────

function MapScreen({ go, role = "landlord", notifCount = 0 }: { go: (s: Screen) => void; role?: Role; notifCount?: number }) {
  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Full-bleed map SVG */}
      <svg width="390" height="844" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <rect width="390" height="844" fill="#E8E3DB" />
        {/* Green areas */}
        <rect x="0" y="0" width="100" height="140" rx="0" fill="#D4EDDA" opacity=".9" />
        <rect x="260" y="60" width="130" height="100" rx="0" fill="#D4EDDA" opacity=".85" />
        <rect x="0" y="520" width="120" height="180" rx="0" fill="#D4EDDA" opacity=".7" />
        <rect x="200" y="600" width="190" height="140" rx="0" fill="#D4EDDA" opacity=".75" />
        {/* Main roads */}
        <rect x="0" y="200" width="390" height="22" fill="white" opacity=".95" />
        <rect x="0" y="480" width="390" height="18" fill="white" opacity=".9" />
        <rect x="0" y="680" width="390" height="16" fill="white" opacity=".85" />
        <rect x="130" y="0" width="20" height="844" fill="white" opacity=".95" />
        <rect x="280" y="0" width="16" height="844" fill="white" opacity=".9" />
        {/* Minor roads */}
        <rect x="0" y="340" width="390" height="10" fill="white" opacity=".65" />
        <rect x="0" y="580" width="390" height="10" fill="white" opacity=".65" />
        <rect x="60" y="0" width="10" height="844" fill="white" opacity=".65" />
        <rect x="200" y="0" width="10" height="844" fill="white" opacity=".65" />
        <rect x="340" y="0" width="10" height="844" fill="white" opacity=".65" />
        {/* Building blocks */}
        {[[10,245,40,80],[75,245,40,80],[10,355,105,110],[220,245,48,80],[300,245,76,80],[220,355,48,110],[300,355,76,110],[10,510,105,60],[10,600,105,65],[220,510,48,60],[300,510,76,60],[220,600,48,65],[300,600,76,65],[10,710,105,60],[220,710,48,120],[300,710,76,120]].map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#D4C5E2" opacity=".6"/>)}
        {/* Primary dorm marker */}
        <circle cx="195" cy="290" r="28" fill="#9772F6" opacity=".16" />
        <circle cx="195" cy="290" r="17" fill="#9772F6" opacity=".25" />
        <circle cx="195" cy="290" r="9" fill="#9772F6" />
        <circle cx="195" cy="290" r="4" fill="white" />
        {/* Secondary markers */}
        <path d="M95 380 C95 370 102 365 110 365 C118 365 125 370 125 380 C125 390 110 400 110 400 C110 400 95 390 95 380Z" fill="#EF4444" opacity=".85" />
        <circle cx="110" cy="380" r="5.5" fill="white" />
        <circle cx="310" cy="420" r="20" fill="#3B82F6" opacity=".15" />
        <circle cx="310" cy="420" r="11" fill="#3B82F6" stroke="white" strokeWidth="2.5" />
      </svg>

      {/* Floating header */}
      <div style={{ position: "absolute", top: 50, left: 14, right: 14, zIndex: 30 }}>
        <div style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 22, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <Search size={16} color="#9772F6" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#9CA3AF", flex: 1 }}>Search places, streets, barangay…</span>
          <button onClick={() => go("notifications")} style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0, position: "relative" }}>
            <Bell size={15} color="#9772F6" />
            {notifCount > 0 && <span style={{ position: "absolute", top: -3, right: -3, width: 13, height: 13, borderRadius: "50%", background: "#EF4444", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{notifCount > 9 ? "9+" : notifCount}</span>}
          </button>
        </div>
      </div>

      {/* Map controls */}
      <div style={{ position: "absolute", top: 120, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 30 }}>
        {[RefreshCcw, Layers, Navigation].map((Ic, i) => (
          <button key={i} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.9)", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
            <Ic size={16} color={i === 0 ? "#9772F6" : "#6B7280"} />
          </button>
        ))}
      </div>

      {/* Floating location card above nav */}
      <div style={{ position: "absolute", bottom: 108, left: 14, right: 14, zIndex: 30 }}>
        <div style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 24, padding: "14px 16px", boxShadow: "0 12px 40px rgba(0,0,0,0.16)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E5E7EB", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <MapPin size={14} color="#EF4444" />
            <span style={{ fontWeight: 800, color: "#1F2937", fontSize: 14, fontFamily: "'Quicksand',sans-serif" }}>KKK Dormitory</span>
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px 22px" }}>Cangumba, San Isidro, Calape, Bohol</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ flex: 1, padding: "11px 0", borderRadius: 16, border: "2px solid #9772F6", color: "#9772F6", fontWeight: 800, fontSize: 12, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "'Quicksand',sans-serif" }}><Navigation size={13} />My Location</button>
            <button style={{ flex: 1, padding: "11px 0", borderRadius: 16, backgroundImage: "linear-gradient(135deg,#EC4899,#9772F6)", color: "white", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "'Quicksand',sans-serif" }}><MapPin size={13} />Directions</button>
          </div>
        </div>
      </div>

      {/* Floating nav */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <BottomNav active="map" go={go} leftTabs={navTabsForRole(role).left} rightTabs={navTabsForRole(role).right} />
      </div>
    </div>
  );
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

function NotificationsScreen({ go, onOpen }: { go: (s: Screen) => void; onOpen?: () => void }) {
  const [tab, setTab] = useState("all");
  useEffect(() => { onOpen?.(); }, []);
  const TABS = ["all", "announcements", "payments", "verification", "alerts"];
  const items = [
    { type: "announcements", title: "Dormitory Inspection", body: "Scheduled for December 15, 2024 at 9:00 AM. Ensure your room is clean.", time: "2h ago", unread: true, Icon: Megaphone, color: "#D97706", bg: "#FEF3C7" },
    { type: "payments", title: "Payment Reminder", body: "Your December 2024 payment of ₱3,500 is due in 5 days.", time: "5h ago", unread: true, Icon: CreditCard, color: "#9772F6", bg: "#F5F0FF" },
    { type: "verification", title: "Check-in Verified", body: "Your home visit check-in was successfully recorded on Nov 28.", time: "Yesterday", unread: false, Icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7" },
    { type: "alerts", title: "Emergency Alert", body: "Minor water outage on the 2nd floor. Estimated 2-hour downtime.", time: "2 days ago", unread: true, Icon: AlertCircle, color: "#DC2626", bg: "#FEE2E2" },
    { type: "announcements", title: "Updated House Rules", body: "New curfew guidelines have been posted on the bulletin board.", time: "3 days ago", unread: false, Icon: Megaphone, color: "#D97706", bg: "#FEF3C7" },
    { type: "payments", title: "Payment Confirmed", body: "Your November 2024 payment of ₱3,500 has been confirmed.", time: "1 week ago", unread: false, Icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7" },
  ];
  const shown = tab === "all" ? items : items.filter(n => n.type === tab);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, padding: "56px 20px 16px", backgroundImage: GRAD_H }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => go("dashboard")} style={{ width: 34, height: 34, borderRadius: 12, background: "rgba(255,255,255,.14)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><ChevronLeft size={18} color="white" /></button>
            <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>Notifications</h1>
          </div>
          <button style={{ padding: "6px 12px", borderRadius: 12, background: "rgba(255,255,255,.13)", border: "1px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" as const, paddingBottom: 2 }}>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0, border: tab === t ? "none" : "1px solid rgba(255,255,255,.18)", background: tab === t ? "white" : "rgba(255,255,255,.14)", color: tab === t ? "#9772F6" : "rgba(255,255,255,.8)", fontFamily: "'Quicksand',sans-serif", textTransform: "capitalize" as const }}>{t}</button>)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 20px" }}>
        {shown.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", textAlign: "center" }}>
            <Bell size={44} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <p style={{ fontWeight: 700, color: "#6B7280", margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>No notifications here</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Check back later</p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
            {shown.map((n, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", position: "relative", borderBottom: i < shown.length - 1 ? "1px solid #F9FAFB" : "none", background: n.unread ? "rgba(151,114,246,0.025)" : "white" }}>
                {n.unread && <div style={{ position: "absolute", top: 16, right: 16, width: 10, height: 10, borderRadius: "50%", background: "#9772F6" }} />}
                <div style={{ width: 40, height: 40, borderRadius: 14, background: n.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><n.Icon size={17} color={n.color} /></div>
                <div style={{ flex: 1, paddingRight: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#1F2937", margin: "0 0 2px", fontFamily: "'Quicksand',sans-serif" }}>{n.title}</p>
                  <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 4px", lineHeight: 1.5 }}>{n.body}</p>
                  <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, margin: 0 }}>{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────

function ProfileScreen({ go, role = "landlord", studentProfile, regRequest }: { go: (s: Screen) => void; role?: Role; studentProfile?: StudentProfile | null; regRequest?: RegRequest | null }) {
  const QS = "'Quicksand',sans-serif";

  // Displayed values — prefer student data if available, fall back to landlord defaults
  const isStudent = role === "student" && studentProfile;
  const fullName = isStudent
    ? [studentProfile.firstName, studentProfile.middleName ? studentProfile.middleName.charAt(0) + "." : "", studentProfile.lastName].filter(Boolean).join(" ")
    : "Juan Dela Cruz";
  const subtitle = isStudent
    ? `${studentProfile.studentId} · ${studentProfile.program}`
    : "BISU-2024-0001 · BS Information Technology";
  const emailVal = isStudent ? studentProfile.email : "juan.delacruz@email.com";
  const phoneVal = isStudent ? (`+63 ${studentProfile.contact}`) : "+63 912 345 6789";
  const dormVal = regRequest?.house?.name ?? "Sunshine Dormitories";
  const roomVal = regRequest?.room?.name ?? "204";
  const yearLevelVal = isStudent ? studentProfile.yearLevel : "2nd";

  const sections = [
    { title: "Account", items: [{ Icon: User, label: "Edit Profile", screen: null as Screen | null }, { Icon: Lock, label: "Change Password", screen: null as Screen | null }, { Icon: Bell, label: "Notifications", screen: "notifications" as Screen }] },
    { title: "App", items: [{ Icon: Settings, label: "Settings", screen: "settings" as Screen }, { Icon: Shield, label: "Privacy", screen: null as Screen | null }, { Icon: HelpCircle, label: "Help & Support", screen: null as Screen | null }, { Icon: Info, label: "About DormiTrack", screen: null as Screen | null }] },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>
        <div style={{ padding: "56px 20px 80px", backgroundImage: GRAD_H, textAlign: "center", position: "relative" }}>
          <h1 style={{ position: "absolute", top: 56, left: 20, color: "white", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: QS }}>Profile</h1>
          <div style={{ position: "relative", display: "inline-block", marginTop: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: 26, backgroundImage: "linear-gradient(135deg,#D8B4FE,#9772F6)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid rgba(255,255,255,.35)" }}><User size={36} color="white" /></div>
            <button style={{ position: "absolute", bottom: -6, right: -6, width: 28, height: 28, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}><Camera size={13} color="#9772F6" /></button>
          </div>
          <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "12px 0 4px", fontFamily: QS }}>{fullName}</h2>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 12, margin: 0, maxWidth: 320, textAlign: "center", lineHeight: 1.45 }}>{subtitle}</p>
        </div>

        {/* Stats */}
        <div style={{ padding: "0 20px 16px", marginTop: -40 }}>
          <div style={{ background: "white", borderRadius: 24, padding: 16, boxShadow: "0 8px 32px rgba(117,73,246,.14)", display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
            {[["Room", roomVal], ["Year", yearLevelVal], ["Status", "Active"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0" }}>
                <span style={{ fontSize: v.length > 6 ? 12 : 20, fontWeight: 800, color: "#9772F6", fontFamily: QS, textAlign: "center", lineHeight: 1.2 }}>{v}</span>
                <span style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional student details if available */}
        {isStudent && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ background: "white", borderRadius: 20, padding: "4px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
              {[
                { Icon: GraduationCap, label: "Block", val: studentProfile.block },
                { Icon: Calendar, label: "Birthdate", val: studentProfile.birthdate },
                { Icon: User, label: "Sex", val: studentProfile.sex },
                { Icon: MapPin, label: "Address", val: studentProfile.address },
              ].map(({ Icon, label, val }, i) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < 3 ? "1px solid #F9FAFB" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={14} color="#9772F6" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 1px" }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: 0, wordBreak: "break-word" as const }}>{val || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "4px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
            {[{ Icon: Mail, label: "Email", val: emailVal }, { Icon: Phone, label: "Phone", val: phoneVal }, { Icon: Building2, label: "Dorm", val: dormVal }].map(({ Icon, label, val }, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 2 ? "1px solid #F9FAFB" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={14} color="#9772F6" /></div>
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 1px" }}>{label}</p><p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{val}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Boarding house registration details if available */}
        {regRequest && (
          <div style={{ padding: "0 20px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 8px 4px" }}>Boarding Details</p>
            <div style={{ background: "white", borderRadius: 20, padding: "4px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
              {[
                { Icon: Building2, label: "Boarding House", val: regRequest.house.name },
                { Icon: Layers, label: "Room", val: regRequest.room.name },
                { Icon: Calendar, label: "Move-in Date", val: regRequest.moveIn },
                { Icon: Calendar, label: "Move-out Date", val: regRequest.moveOut },
                { Icon: Clock, label: "Length of Stay", val: `${regRequest.stayCount} ${regRequest.stayUnit}` },
              ].map(({ Icon, label, val }, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 4 ? "1px solid #F9FAFB" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={14} color="#9772F6" /></div>
                  <div><p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 1px" }}>{label}</p><p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: 0 }}>{val}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personality / Hobbies / Lifestyle chips from registration */}
        {regRequest && (regRequest.traits.length > 0 || regRequest.hobbies.length > 0 || regRequest.lifestyle.length > 0) && (
          <div style={{ padding: "0 20px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 8px 4px" }}>About Me</p>
            <div style={{ background: "white", borderRadius: 20, padding: 16, boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
              {[
                { label: "Personality", tags: regRequest.traits },
                { label: "Hobbies", tags: regRequest.hobbies },
                { label: "Lifestyle", tags: regRequest.lifestyle },
              ].filter(g => g.tags.length > 0).map((g, i, arr) => (
                <div key={g.label} style={{ marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", margin: "0 0 8px" }}>{g.label}</p>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {g.tags.map(t => (
                      <span key={t} style={{ padding: "5px 12px", borderRadius: 99, background: "#F5F0FF", color: "#9772F6", fontSize: 11, fontWeight: 700, fontFamily: QS }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* App Info */}
        <div style={{ padding: "0 20px 16px" }}>
          <AppInfoSection />
        </div>
        {/* Logout */}
        <div style={{ padding: "0 20px 24px" }}>
          <button onClick={() => go("landing")} style={{ width: "100%", background: "white", borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 14, border: "1px solid #FEE2E2", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}><LogOut size={16} color="#DC2626" /></div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#DC2626", fontFamily: "'Quicksand',sans-serif" }}>Log Out</span>
          </button>
        </div>
      </div>
      <BottomNav active="profile" go={go} leftTabs={navTabsForRole(role).left} rightTabs={navTabsForRole(role).right} />
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

function SettingsScreen({ go }: { go: (s: Screen) => void }) {
  const [dark, setDark] = useState(false); const [push, setPush] = useState(true); const [emailN, setEmailN] = useState(true); const [bio, setBio] = useState(false); const [twoFA, setTwoFA] = useState(false);
  const groups = [
    { title: "General", items: [{ Icon: Globe, label: "Language", right: <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700 }}>English</span> }, { Icon: Smartphone, label: "Dark Mode", right: <ToggleSwitch value={dark} onToggle={() => setDark(d => !d)} /> }] },
    { title: "Notifications", items: [{ Icon: Bell, label: "Push Notifications", right: <ToggleSwitch value={push} onToggle={() => setPush(d => !d)} /> }, { Icon: Mail, label: "Email Notifications", right: <ToggleSwitch value={emailN} onToggle={() => setEmailN(d => !d)} /> }] },
    { title: "Security", items: [{ Icon: Lock, label: "Biometric Login", right: <ToggleSwitch value={bio} onToggle={() => setBio(d => !d)} /> }, { Icon: Shield, label: "Two-Factor Auth", right: <ToggleSwitch value={twoFA} onToggle={() => setTwoFA(d => !d)} /> }, { Icon: Lock, label: "Change Password", right: <ChevronRight size={15} color="#D1D5DB" /> }] },
    { title: "About", items: [{ Icon: Info, label: "App Version", right: <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700 }}>v1.0.0</span> }, { Icon: HelpCircle, label: "Help & Support", right: <ChevronRight size={15} color="#D1D5DB" /> }, { Icon: FileText, label: "Terms & Privacy", right: <ChevronRight size={15} color="#D1D5DB" /> }] },
  ];
  return (
    <div style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ padding: "56px 20px 24px", backgroundImage: GRAD_H }}>
        <button onClick={() => go("profile")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", marginBottom: 16, padding: 0 }}><ChevronLeft size={24} /></button>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>Settings</h1>
      </div>
      <div style={{ padding: "20px 20px 32px" }}>
        {groups.map(g => (
          <div key={g.title} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: 1, margin: "0 0 8px 4px" }}>{g.title}</p>
            <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
              {g.items.map(({ Icon, label, right }, i) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderBottom: i < g.items.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} color="#9772F6" /></div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1F2937" }}>{label}</span>
                  {right}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ADMIN SCREENS ─────────────────────────────────────────────────────────────

function AdminUsersScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "56px 24px 20px", backgroundImage: GRAD_H }}>
        <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>User Management</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: "4px 0 0" }}>Verify and manage all users</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "20px 20px 0" }}>
        {["Alice Reyes", "Ben Torres", "Clara Lim", "Dan Cruz", "Eva Santos"].map((name, i) => (
          <div key={name} style={{ background: "white", borderRadius: 18, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 10px rgba(0,0,0,.05)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, fontFamily: "'Quicksand',sans-serif", color: "#1F2937" }}>{name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>{["Student","Student","Parent","Landlord","Student"][i]}</p>
            </div>
            <div style={{ padding: "4px 12px", borderRadius: 20, background: i % 3 === 0 ? "rgba(151,114,246,.1)" : "rgba(34,197,94,.1)", fontSize: 11, fontWeight: 700, color: i % 3 === 0 ? "#9772F6" : "#16A34A" }}>
              {i % 3 === 0 ? "Pending" : "Verified"}
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="adminUsers" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
    </div>
  );
}

function AdminReportsScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "56px 24px 20px", backgroundImage: GRAD_H }}>
        <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>Reports & Analytics</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: "4px 0 0" }}>System-wide overview</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "20px 20px 0" }}>
        {[
          { label: "Total Students", value: "1,248", change: "+12%" },
          { label: "Active Dormitories", value: "34", change: "+2" },
          { label: "Pending Verifications", value: "18", change: "-5" },
          { label: "Payments This Month", value: "₱284,500", change: "+8%" },
        ].map(({ label, value, change }) => (
          <div key={label} style={{ background: "white", borderRadius: 18, padding: "18px 20px", marginBottom: 12, boxShadow: "0 2px 10px rgba(0,0,0,.05)" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: "'Inter',sans-serif" }}>{label}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#1F2937", fontFamily: "'Quicksand',sans-serif" }}>{value}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>{change}</span>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="adminReports" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
    </div>
  );
}


// ── LANDLORD SIGN UP ──────────────────────────────────────────────────────────

type LBed = { label: string; status: "available" | "occupied" | "reserved"; photo?: string };
type LRoom = {
  id: string; name: string; desc: string; cap: string; occ: string;
  amenities: string[]; customAmenities: string[];
  beds: LBed[];
  roomPhoto?: string; crPhoto?: string;
  confirmed: boolean;
};

type LPaymentExtra = { name: string; amount: string; type: "fixed" | "metered"; enabled: boolean; confirmed: boolean };

function PendingVerificationScreen({ req, onApproved }: { req: RegRequest; onApproved: () => void }) {
  const QS = "'Quicksand',sans-serif"; const IN = "'Inter',sans-serif";
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);

  // Auto-check for landlord approval (simulated)
  useEffect(() => {
    const t = setTimeout(() => setApproved(true), 8000);
    return () => clearTimeout(t);
  }, []);

  const refresh = () => {
    setChecking(true);
    setTimeout(() => { setChecking(false); setApproved(true); }, 1400);
  };

  if (approved) {
    return (
      <div style={{ height: "100%", backgroundImage: GRAD_H, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 26px" }}>
            <CheckCircle size={54} color="white" />
          </div>
          <h1 style={{ color: "white", fontSize: 24, fontWeight: 800, margin: "0 0 12px", fontFamily: QS }}>Registration Approved!</h1>
          <p style={{ color: "rgba(255,255,255,.82)", fontSize: 14, lineHeight: 1.6, margin: "0 0 32px", fontFamily: IN }}>
            Welcome to {req.house.name}! You can now access all DormiTrack features.
          </p>
          <button onClick={onApproved} style={{ width: "100%", padding: "16px 0", borderRadius: 24, background: "white", color: "#9772F6", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
            Enter DormiTrack
          </button>
        </div>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Boarding House", req.house.name],
    ["Selected Room", req.room.name],
    ...(req.bed ? [["Selected Bed", req.bed] as [string, string]] : []),
    ["Request Status", "Pending Approval"],
    ["Submitted Date", req.submittedDate],
    ["Estimated Response", "Within 24 hours"],
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, display: "flex", flexDirection: "column", justifyContent: "center", padding: "70px 24px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 120, height: 120, borderRadius: "50%", backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", boxShadow: "0 12px 32px rgba(151,114,246,.3)", position: "relative" }}>
            <Hourglass size={52} color="white" />
            <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "3px solid rgba(151,114,246,.2)" }} />
          </div>
          <h1 style={{ color: "#1F2937", fontSize: 22, fontWeight: 800, margin: "0 0 10px", fontFamily: QS }}>Waiting for Landlord Verification</h1>
          <p style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: IN }}>
            Your boarding house registration request has been successfully submitted and is currently awaiting approval from the landlord. You will gain full access to DormiTrack once your registration has been approved.
          </p>
        </div>

        <div style={{ background: "white", borderRadius: 22, padding: 18, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, background: "#FEF3C7", color: "#D97706", fontSize: 12, fontWeight: 800, fontFamily: QS }}>
              <Clock size={13} /> Pending Approval
            </span>
          </div>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>{k}</span>
              <span style={{ fontSize: 12, color: "#1F2937", fontWeight: 700, textAlign: "right", fontFamily: QS }}>{v}</span>
            </div>
          ))}
        </div>

        <button onClick={refresh} disabled={checking} style={{ width: "100%", padding: "15px 0", borderRadius: 20, backgroundImage: GRAD, color: "white", fontSize: 14, fontWeight: 800, border: "none", cursor: checking ? "default" : "pointer", fontFamily: QS, boxShadow: "0 8px 24px rgba(151,114,246,.28)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <RefreshCcw size={16} style={{ animation: checking ? "spin 1s linear infinite" : "none" }} />
          {checking ? "Checking status..." : "Refresh Status"}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 14, fontFamily: IN }}>
          We'll automatically notify you once the landlord responds.
        </p>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [visible, setVisible] = useState(true);
  const [role, setRole] = useState<Role>("landlord");
  const [notifCount, setNotifCount] = useState(3);
  const [regRequest, setRegRequest] = useState<RegRequest | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [parentLinkingId, setParentLinkingId] = useState("");
  const [visitorEnabled, setVisitorEnabled] = useState(false);
  const [visitorFields, setVisitorFields] = useState<VisitorFields>({ name: true, contact: true, relationship: true, purpose: true, visitDate: true });
  const [highlightsEnabled, setHighlightsEnabled] = useState(true);

  const go = (s: Screen) => {
    if (s === screen) return;
    setVisible(false);
    setTimeout(() => { setScreen(s); setVisible(true); }, 160);
  };

  const submitRegistration = (r: RegRequest) => {
    setRegRequest(r);
    setNotifCount(c => c + 1); // notify the landlord of the new request
    go("pendingVerify");
  };

  const render = () => {
    // Access gate: a student with a submitted request cannot use the app until approved
    if (screen === "pendingVerify" && regRequest) {
      return <PendingVerificationScreen req={regRequest} onApproved={() => go("dashboard")} />;
    }
    switch (screen) {
      case "splash":         return <SplashScreen done={() => go("landing")} />;
      case "landing":        return <LandingScreen go={go} />;
      case "roleSelect":     return <RoleSelectScreen go={go} onRole={setRole} />;
      case "login":          return <LoginScreen go={go} onAdminLogin={() => setRole("admin")} />;
      case "signup":         return <SignUpScreen go={go} />;
      case "studentSignup":  return <StudentSignUpScreen go={go} onSignup={p => setStudentProfile(p)} />;
      case "landlordSignup": return <LandlordSignUpScreen go={go} />;
      case "parentSignup":   return <ParentSignUpScreen go={go} onComplete={id => { setParentLinkingId(id); go("parentLinking"); }} />;
      case "parentLinking":  return <ParentLinkingScreen go={go} studentId={parentLinkingId} onEditStudentId={() => go("parentSignup")} />;
      case "boardingReg":    return <BoardingRegistrationScreen go={go} onSubmit={submitRegistration} studentName={studentProfile ? [studentProfile.firstName, studentProfile.middleName ? studentProfile.middleName.charAt(0) + "." : "", studentProfile.lastName].filter(Boolean).join(" ") : "Kyla L. Naquila"} />;
      case "pendingVerify":  return regRequest ? <PendingVerificationScreen req={regRequest} onApproved={() => go("dashboard")} /> : <BoardingRegistrationScreen go={go} onSubmit={submitRegistration} studentName="Kyla L. Naquila" />;
      case "forgotPassword": return <ForgotPasswordScreen go={go} />;
      case "dashboard":      return role === "admin" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><AdminDashboardScreen go={go} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
        </div>
      ) : role === "landlord" ? <DashboardScreen go={go} role={role} notifCount={notifCount} visitorEnabled={visitorEnabled} visitorFields={visitorFields} highlightsEnabled={highlightsEnabled} /> : role === "student" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><StudentHomeScreen go={go} notifCount={notifCount} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
        </div>
      ) : role === "parent" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><ParentHomeScreen go={go} notifCount={notifCount} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
        </div>
      ) : <DashboardScreen go={go} role={role} notifCount={notifCount} visitorEnabled={visitorEnabled} visitorFields={visitorFields} highlightsEnabled={highlightsEnabled} />;
      case "dormInfo":       return <DormInfoScreen go={go} />;
      case "payments":       return role === "landlord" ? <LandlordPaymentsScreen go={go} /> : role === "student" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><StudentPaymentsScreen go={go} /></div>
          <BottomNav active="payments" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
        </div>
      ) : role === "parent" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><ParentPaymentsScreen go={go} /></div>
          <BottomNav active="payments" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
        </div>
      ) : <PaymentsScreen go={go} role={role} />;
      case "homeVisit":      return <HomeVisitScreen go={go} />;
      case "occupants":      return role === "landlord"
        ? <LandlordOccupantsScreen go={go} navLeft={navTabsForRole(role).left} navRight={navTabsForRole(role).right} />
        : role === "student" ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
            <div style={{ flex:1, overflow:"hidden" }}><StudentRoomOccupantsScreen go={go} /></div>
            <BottomNav active="occupants" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
          </div>
        ) : role === "parent" ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
            <div style={{ flex:1, overflow:"hidden" }}><ParentBoardingHouseScreen go={go} /></div>
            <BottomNav active="occupants" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
          </div>
        ) : <OccupantsScreen go={go} role={role} />;
      case "rooms":          return <RoomsScreen go={go} role={role} />;
      case "map":            return role === "admin" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><AdminMapScreen go={go} /></div>
          <BottomNav active="map" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
        </div>
      ) : role === "student" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><StudentMapScreen go={go} /></div>
          <BottomNav active="map" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
        </div>
      ) : role === "parent" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><ParentMapScreen go={go} /></div>
          <BottomNav active="map" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
        </div>
      ) : <MapScreen go={go} role={role} notifCount={notifCount} />;
      case "notifications":  return <NotificationsScreen go={go} onOpen={() => setNotifCount(0)} />;
      case "profile":        return role === "landlord"
        ? <LandlordProfileScreen go={go} visitorEnabled={visitorEnabled} setVisitorEnabled={setVisitorEnabled} visitorFields={visitorFields} setVisitorFields={setVisitorFields} highlightsEnabled={highlightsEnabled} setHighlightsEnabled={setHighlightsEnabled} />
        : role === "student" ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
            <div style={{ flex:1, overflow:"hidden" }}><StudentProfileScreen go={go} /></div>
            <BottomNav active="profile" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
          </div>
        ) : role === "parent" ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
            <div style={{ flex:1, overflow:"hidden" }}><ParentProfileScreen go={go} /></div>
            <BottomNav active="profile" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
          </div>
        ) : <ProfileScreen go={go} role={role} studentProfile={studentProfile} regRequest={regRequest} />;
      case "settings":       return <SettingsScreen go={go} />;
      case "adminUsers":     return (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><AdminUsersScreenFull go={go} /></div>
          <BottomNav active="adminUsers" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
        </div>
      );
      case "adminReports":   return (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><AdminReportsScreenFull go={go} /></div>
          <BottomNav active="adminReports" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
        </div>
      );
      case "adminSystem":    return (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><AdminSystemScreen go={go} /></div>
          <BottomNav active="adminSystem" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
        </div>
      );
      case "adminProfile":   return <AdminProfileScreenFull go={go} />;
      default:               return role === "admin" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><AdminDashboardScreen go={go} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
        </div>
      ) : role === "student" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><StudentHomeScreen go={go} notifCount={notifCount} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
        </div>
      ) : role === "parent" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><ParentHomeScreen go={go} notifCount={notifCount} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
        </div>
      ) : <DashboardScreen go={go} role={role} notifCount={notifCount} />;
    }
  };

  return <MobileShell visible={visible}>{render()}</MobileShell>;
}
