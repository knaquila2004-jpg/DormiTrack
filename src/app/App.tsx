import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { getBoardingHousesForLandlord, getMyBHFeatureConfig, updateBHFeatureConfig } from "./boardingHouseStore";
import { getMyHighlights, createHighlight, updateHighlight, deleteHighlight } from "./highlightsStore";
import { getPendingRegistrationsForLandlord, approveRegistration, rejectRegistration, getOccupancyStatsForLandlord, getMyStudentGateStatus, PendingRegistration, OccupancyStats, PendingRegInfo } from "./registrationStore";
import { getMyLandlordAccount } from "./landlordProfileStore";
import { getCheckInOutActivityForLandlord } from "./checkInOutStore";
import { getPaymentActivityForLandlord } from "./paymentStore";
import { getVisitorRecordsForLandlord, markVisitorLeft as markVisitorLeftApi, toLocalISODate, loggedLabel } from "./visitorStore";
import React, { useState, useEffect, useRef } from "react";
import {
  Home, Map, Bell, User, Eye, EyeOff, Search, Shield, CreditCard,
  MapPin, Users, Building2, CheckCircle, AlertCircle, Clock, Phone,
  Mail, LogOut, Camera, GraduationCap, Lock, Settings, Info,
  HelpCircle, FileText, Megaphone, Calendar, ChevronRight, ChevronLeft,
  Navigation, Signal, Wifi, Battery, RefreshCcw, Filter,
  Globe, MessageCircle, Layers, Smartphone, Heart, Check, Star,
  BarChart2, UserCheck, Wallet, Flag, LogIn,
  Droplet, Zap, Utensils, Car, BookOpen, Video, Shirt, Plus, Minus, X,
  Sparkles, DoorOpen, Hourglass,
} from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import {
  GRAD, GRAD_H, Screen, NavTab, Role,
  BedStatus, BedData, RoomData, Amenity, BoardingHouse, RegRequest, StudentProfile,
  AMENITIES, roomStatus, IMG, MAP_CENTER,
} from "./shared";
import { LandlordOccupantsScreen } from "./LandlordOccupants";
import { LandlordSignUpScreen } from "./LandlordSignUp";
import { StudentSignUpScreen } from "./StudentSignUp";
import { ParentSignUpScreen, ParentLinkingScreen } from "./ParentSignUp";
import { getMyParentGateStatus, acknowledgeParentLink } from "./parentLinkStore";
import { LandlordProfileScreen } from "./LandlordProfile";
import { HighlightsDashboardSection, Highlight, HL_TODAY } from "./LandlordHighlights";
import { LandlordPaymentsScreen } from "./LandlordPayments";
import { StudentHomeScreen } from "./StudentHome";
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./components/GoogleMapCanvas";
import { getReportsForLandlord, respondToReport, CATEGORY_META, STATUS_META, StudentReport, ReportStatus } from "./reportStore";
import {
  useNotifications, useUnreadCount, markNotificationRead, markAllRead, addNotification,
  notifyLandlordOfBoardingHouse, notifyLinkedParents,
  NOTIF_META, timeAgo, fmtBadgeCount, AppNotification, NotificationType,
} from "./notificationStore";
import { MessagesScreen } from "./Chat";
import { useUnreadChatCount } from "./chatStore";
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
          // `transform` makes this div the containing block for any
          // `position:fixed` descendant (full-screen sheet modals etc.),
          // so they stay confined to the app frame — including the bottom
          // nav bar — instead of escaping to the raw browser viewport.
          transform: "translateZ(0)",
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
        // `transform` makes this the containing block for `position:fixed`
        // descendants, so full-screen sheet modals stay confined to the
        // phone frame — including the bottom nav bar — instead of
        // escaping to the full browser viewport.
        transform: "translateZ(0)",
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

// One-time "You're Linked!" confirmation for a parent who logs in after
// their student has already approved the link — see acknowledgeParentLink
// in parentLinkStore.ts for why this only ever fires once. Rendered as a
// sibling of render()'s output (inside MobileShell) so it overlays whatever
// tab the parent happens to land on, not just the dashboard specifically.
function ParentLinkedModal({ onDismiss }: { onDismiss: () => void }) {
  const QS = "'Quicksand',sans-serif"; const IN = "'Inter',sans-serif";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 24, padding: "32px 24px", maxWidth: 320, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#16A34A,#15803D)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 24px rgba(22,163,74,.3)" }}>
          <CheckCircle size={32} color="white" strokeWidth={2} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#15803D", margin: "0 0 8px", fontFamily: QS }}>You're Linked!</h2>
        <p style={{ fontSize: 13, color: "#4B5563", margin: "0 0 22px", lineHeight: 1.6, fontFamily: IN }}>
          Your parent account is now linked to your student's DormiTrack account. You can monitor their boarding house info, payments, and more.
        </p>
        <button onClick={onDismiss} style={{ width: "100%", height: 48, borderRadius: 20, border: "none", background: GRAD, color: "white", fontSize: 14, fontWeight: 800, fontFamily: QS, cursor: "pointer", boxShadow: "0 8px 24px rgba(151,114,246,.3)" }}>
          Got it
        </button>
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function GradBtn({ children, onClick, disabled = false, compact = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; compact?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full ${compact ? "py-3" : "py-4"} rounded-2xl font-bold text-[15px] transition-all active:scale-[0.97] select-none`}
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

function Input({ label, placeholder, type = "text", value, onChange, right, autoComplete, compact = false }: {
  label?: string; placeholder?: string; type?: string; value: string; onChange: (v: string) => void; right?: React.ReactNode; autoComplete?: string;
  // Shorter field height for the login screen specifically — every other Input call
  // site (signup steps, forgot-password) is untouched, still the original height.
  compact?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-4">
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7549F6", marginBottom: 6, fontFamily: "'Quicksand',sans-serif" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: "100%", boxSizing: "border-box", padding: compact ? "10px 44px 10px 16px" : "14px 44px 14px 16px", borderRadius: 16, border: `2px solid ${focused ? "#9772F6" : "#E5E7EB"}`, background: "#F7F8FC", color: "#1F2937", fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", transition: "border-color 0.2s" }} />
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

// Nav labels share this line-height so a single-line label's box height is a
// known, consistent quantity — needed as the baseline that the two-line
// "Boarding House" label is measured against below.
const NAV_LABEL_LH = 1.2;

// "Boarding House" is the only nav label long enough to wrap onto two lines.
// Without help it renders with the browser's loose default line spacing and,
// because the tab row vertically centers each button by its *total* content
// height, the extra line pushes this button's icon+label block up — so
// "Boarding" lands noticeably higher than the single-line "Home"/"Map"/etc.
// labels instead of sitting on the same row.
//
// Fix: tighten the line-height, then clamp the label's own box height to
// exactly one line (NAV_LABEL_LH em, same as every other label) with
// `overflow: visible`. The block now contributes the same height to the
// row's centering math as any single-line label, so the icon lines up and
// "Boarding" (the first line, rendered at the top of the box same as always)
// aligns with the other labels. "House" simply overflows visibly beneath,
// still centered under the icon.
function navLabelStyle(label: string, on: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 10.5, fontWeight: on ? 700 : 500,
    color: on ? "#9772F6" : "#9CA3AF",
    fontFamily: "'Quicksand',sans-serif",
    letterSpacing: on ? 0.1 : 0,
    transition: "color .22s ease, font-weight .22s ease",
    lineHeight: NAV_LABEL_LH,
    // Shift the label 10px closer to its icon. A transform (not margin/gap)
    // is used so the shift is purely visual — it doesn't touch the flex
    // layout, so icon positions, bar height, and the icon-text gap spacing
    // stay exactly as laid out; every label (single- or two-line) moves by
    // the same 10px, so relative alignment between labels is unaffected.
    transform: "translateY(-10px)",
  };
  if (label === "Boarding House") {
    return {
      ...base,
      lineHeight: 0.85,
      textAlign: "center",
      height: `${NAV_LABEL_LH}em`,
      overflow: "visible",
    };
  }
  return base;
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
  // On the Profile page the Map FAB (and the notch it sits in) is hidden entirely — the bar
  // becomes a plain, unbroken pill and the remaining tabs redistribute evenly across its full
  // width instead of leaving a gap where the FAB used to clear.
  const showFab = active !== "profile";

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

  // Plain rounded-rect pill — same corner radius, no U-notch — used on the Profile page once
  // the FAB is hidden, so the bar just reads as a normal, unbroken nav bar.
  const flatShape = [
    `M ${C} 0`,
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

  // Static shadow the FAB sits at on every non-Map page — the same shadow
  // it always rested at between pulses before, just no longer animating.
  const FAB_REST_SHADOW = "0 8px 28px rgba(151,114,246,.5),0 3px 10px rgba(117,73,246,.35),0 0 0 0 rgba(151,114,246,.2)";

  return (
    <div style={{ flexShrink: 0, padding: "0 16px 20px", position: "relative" }}>
      <style>{`
        /* Map FAB pulse — only ever runs while the Map page is active (see
           mapActive below); on every other page the FAB is static. */
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
          <path d={showFab ? shape : flatShape} fill="rgba(255,255,255,0.97)" />
          {/* Subtle purple tint inside the U-cup — gives depth under the FAB (nothing to shade
              once the notch itself is gone on the Profile page) */}
          {showFab && <ellipse cx={cx} cy={nd * 0.7} rx={nh * 0.8} ry={nd * 0.6} fill="url(#notchDepth)" />}
        </svg>

        {/* ── Tab buttons ── */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", zIndex: 1 }}>
          {LEFT.map(({ id, Icon, label }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => go(id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "8px 0 6px", background: "none", border: "none", cursor: "pointer",
                // Nudge the whole icon+label group 3px up as one rigid unit —
                // a transform on the button (not gap/padding) so the icon,
                // its label, and the spacing between them are untouched;
                // only the group's position shifts.
                transform: "translateY(-3px)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={21} color={on ? "#9772F6" : "#9CA3AF"} strokeWidth={on ? 2.4 : 1.8} style={{ transition: "color .22s ease" }} />
                </div>
                <span style={navLabelStyle(label, on)}>{label}</span>
              </button>
            );
          })}

          {/* Center gap — clears the FAB (64 px + margins); omitted on the Profile page so the
              remaining tabs spread evenly across the full, now-unbroken bar. */}
          {showFab && <div style={{ width: FAB_D + 20, flexShrink: 0 }} />}

          {RIGHT.map(({ id, Icon, label }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => go(id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "8px 0 6px", background: "none", border: "none", cursor: "pointer",
                // Nudge the whole icon+label group 3px up as one rigid unit —
                // a transform on the button (not gap/padding) so the icon,
                // its label, and the spacing between them are untouched;
                // only the group's position shifts.
                transform: "translateY(-3px)",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={21} color={on ? "#9772F6" : "#9CA3AF"} strokeWidth={on ? 2.4 : 1.8} style={{ transition: "color .22s ease" }} />
                </div>
                <span style={navLabelStyle(label, on)}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center FAB — overlaps into the U-cut, purple gradient, no label ── */}
      {showFab && <button
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
          // Static on every page except Map — no shadow keyframes running,
          // just the same resting shadow it always had between pulses.
          // On the Map page the animation drives box-shadow instead.
          boxShadow: mapActive ? undefined : FAB_REST_SHADOW,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          animation: mapActive ? "fabGlowActive 2.2s ease-in-out infinite" : "none",
          // Easing the box-shadow (not just transform) means leaving the Map
          // page settles back to the static shadow smoothly instead of
          // snapping the instant the pulse keyframes stop.
          transition: "transform 0.28s cubic-bezier(.34,1.56,.64,1), box-shadow 0.4s ease",
          zIndex: 10,
        }}
      >
        <MapPin size={26} color="white" fill="rgba(255,255,255,.2)" strokeWidth={2} />
      </button>}
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

// ── PRIVACY POLICY (real, full text — shown from the login screen's footer link) ──

const PP_QS = "'Quicksand',sans-serif";
const PP_IN = "'Inter',sans-serif";
function PPHeading({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, fontWeight: 800, color: "#9772F6", fontFamily: PP_QS, margin: "20px 0 8px" }}>{children}</p>;
}
function PPSub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 800, color: "#1F2937", fontFamily: PP_QS, margin: "14px 0 6px" }}>{children}</p>;
}
function PPP({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: "#6B7280", fontFamily: PP_IN, lineHeight: 1.7, margin: "0 0 8px" }}>{children}</p>;
}
function PPUl({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 12, color: "#6B7280", fontFamily: PP_IN, lineHeight: 1.7 }}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

function PrivacyPolicyContent() {
  return (
    <>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 2px" }}>Effective Date: August 1, 2026</p>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 14px" }}>Last Updated: September 5, 2026</p>

      <PPP>Welcome to DormiTrack!</PPP>
      <PPP>DormiTrack is designed to support the management and monitoring of students residing in boarding houses near Bohol Island State University (BISU) – Calape Campus. The system provides functions for students, parents/guardians, landlords, and the Housing Director to manage and access information related to boarding house accommodation, student records, room occupancy, payment records, reports, and boarding house-based location verification.</PPP>
      <PPP>DormiTrack respects the privacy of its users and is committed to protecting personal information. This Privacy Policy explains what information is collected, why it is collected, how it is used, who may access it, how it is protected, and what rights users have regarding their personal information.</PPP>
      <PPP>DormiTrack is intended to follow the principles and requirements of Republic Act No. 10173, or the Data Privacy Act of 2012, its Implementing Rules and Regulations, and applicable policies of the National Privacy Commission.</PPP>

      <PPHeading>Information We Collect</PPHeading>
      <PPP>DormiTrack collects information that is necessary for account creation, boarding house management, student monitoring, and other legitimate system functions.</PPP>

      <PPSub>Student Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["Student ID number","First name","Last name","Gender","Contact number","Email address","Username and account information","Parent/guardian information","Boarding house information","Room assignment","Payment records","Reports or concerns submitted through the system","Location information when a location-based feature is used"]} />

      <PPSub>Parent/Guardian Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["First name","Last name","Contact number","Email address","Address","Username and account information","Information necessary to establish the parent/guardian's connection with the student"]} />

      <PPSub>Landlord Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["First name","Last name","Contact number","Email address","Address","Username and account information","Boarding house information","Boarding house location","Room information","Billing information","Reports submitted through the system"]} />

      <PPSub>Housing Director / Administrator Information</PPSub>
      <PPP>The system may collect:</PPP>
      <PPUl items={["First name","Last name","Email address","Contact number","Username and account information","Assigned system role"]} />

      <PPHeading>Boarding House Information</PPHeading>
      <PPP>DormiTrack may store information about registered boarding houses, including:</PPP>
      <PPUl items={["Boarding house name","Boarding house address","Landlord information","Room information","Room capacity","Occupancy status","Registered boarding house location","Geofence information, where applicable"]} />

      <PPHeading>Location Information</PPHeading>
      <PPP>DormiTrack may use a student's device location for boarding house presence verification.</PPP>
      <PPP>Location information may be used to determine whether the student's device is within the designated area of the registered boarding house.</PPP>
      <PPP>The system may compare:</PPP>
      <PPUl items={["The student's current location;","The registered location of the boarding house; and","The designated geofence or permitted area."]} />
      <PPP>The purpose is to support location-based student presence verification.</PPP>
      <PPP>DormiTrack is not intended to continuously track a student's movements outside the boarding house-related monitoring function.</PPP>
      <PPP>Location information should only be requested when it is necessary for an applicable system feature.</PPP>
      <PPP>Users may manage location permissions through their device settings. However, disabling location access may prevent location-dependent features from functioning.</PPP>

      <PPHeading>How We Use Personal Information</PPHeading>
      <PPP>Personal information may be used for:</PPP>
      <PPUl items={["Creating and managing user accounts","Verifying user information","Managing student records","Connecting students with their authorized parents or guardians","Managing boarding house information","Managing rooms and occupancy","Supporting boarding house selection and confirmation","Monitoring boarding house occupancy","Recording and displaying payment information","Processing reports and concerns","Supporting boarding house-based location verification","Providing authorized users with relevant information","Generating administrative reports","Maintaining system functionality","Maintaining system security","Investigating suspected unauthorized access or misuse","Complying with applicable laws and institutional requirements"]} />
      <PPP>DormiTrack will not intentionally use personal information for unrelated purposes without an appropriate lawful basis or proper notice.</PPP>

      <PPHeading>Lawful Basis for Processing</PPHeading>
      <PPP>DormiTrack will process personal information only when there is an appropriate lawful basis under applicable privacy laws.</PPP>
      <PPP>Depending on the specific processing activity, the lawful basis may include:</PPP>
      <PPUl items={["User consent","Performance of a service or agreement requested by the user","Compliance with a legal obligation","Protection of vital interests, where applicable","Performance of a public function, where applicable","Legitimate interests, where permitted by law"]} />
      <PPP>Where consent is required, users should be properly informed about the processing before providing consent.</PPP>

      <PPHeading>Student and Parent/Guardian Connection</PPHeading>
      <PPP>DormiTrack may connect a student's account with an authorized parent or guardian.</PPP>
      <PPP>This connection may be established using:</PPP>
      <PPUl items={["Student ID","Parent/guardian account information","Other verification information required by the system"]} />
      <PPP>A parent or guardian should only be able to access information related to the student they are authorized to monitor.</PPP>
      <PPP>Personal information belonging to unrelated students should not be made unnecessarily accessible.</PPP>

      <PPHeading>Role-Based Access to Information</PPHeading>
      <PPP>DormiTrack uses role-based access to limit information according to the user's authorized responsibilities.</PPP>

      <PPSub>Students</PPSub>
      <PPP>Students may access:</PPP>
      <PPUl items={["Their own profile","Their parent/guardian information","Their boarding house information","Their room information","Relevant boarding house occupant information","Their payment records","Their submitted reports","Their applicable location/presence status"]} />

      <PPSub>Parents/Guardians</PPSub>
      <PPP>Authorized parents/guardians may access information related to their linked student, including:</PPP>
      <PPUl items={["Student information","Boarding house information","Room information","Relevant occupancy information","Payment records","Applicable location/presence status"]} />

      <PPSub>Landlords</PPSub>
      <PPP>Landlords may access information necessary to manage their registered boarding house, including:</PPP>
      <PPUl items={["Boarding house information","Room information","Occupancy information","Relevant student information","Payment records associated with their boarding house","Reports concerning their boarding house","Boarding house location information"]} />

      <PPSub>Housing Director / Administrator</PPSub>
      <PPP>Authorized Housing Director or administrator accounts may access information necessary for institutional housing management, including:</PPP>
      <PPUl items={["Student records","Parent/guardian records","Landlord records","Boarding house records","Room and occupancy information","Payment-related records","Reports","Applicable location-related monitoring information","Administrative reports"]} />
      <PPP>Access should be limited to information necessary for the user's authorized role.</PPP>

      <PPHeading>Payment Information</PPHeading>
      <PPP>DormiTrack may record and display boarding house payment information such as:</PPP>
      <PPUl items={["Monthly rent","Electricity charges","Water charges","Internet fees","Amount due","Payment date","Payment status"]} />
      <PPP>DormiTrack does not process online payments unless such functionality is specifically implemented.</PPP>
      <PPP>If the system only records payment information, it does not collect or process credit card, debit card, online banking, or other payment credentials.</PPP>

      <PPHeading>Reports and Submitted Information</PPHeading>
      <PPP>Users may submit reports, concerns, or complaints through DormiTrack.</PPP>
      <PPP>Reports may contain:</PPP>
      <PPUl items={["Report reason","Report details","Report date","Student information","Boarding house information","Landlord information","Report status"]} />
      <PPP>Reports should only be used for legitimate housing-management, administrative, safety, or system-related purposes.</PPP>
      <PPP>Users should avoid submitting unnecessary sensitive or private information in report descriptions.</PPP>

      <PPHeading>Disclosure and Sharing of Personal Information</PPHeading>
      <PPP>DormiTrack will not intentionally disclose personal information indiscriminately.</PPP>
      <PPP>Information may be accessed or disclosed when:</PPP>
      <PPUl items={["The user has provided appropriate consent;","It is necessary for a legitimate system purpose;","It is required or authorized by law;","It is necessary to comply with a lawful order or request; or","It is otherwise permitted under applicable privacy laws."]} />
      <PPP>Personal information should not be sold or disclosed to unrelated parties for unrelated purposes.</PPP>

      <PPHeading>Third-Party Services</PPHeading>
      <PPP>DormiTrack may use third-party services necessary to provide specific system functions.</PPP>

      <PPSub>Google Maps / Location Services</PPSub>
      <PPP>Google Maps or related location services may be used to:</PPP>
      <PPUl items={["Display boarding house locations","Allow landlords to place a boarding house marker on the map","Display registered boarding house markers","Support location-based verification"]} />

      <PPSub>Database and Authentication Services</PPSub>
      <PPP>DormiTrack may use a cloud database or authentication provider to securely manage system information and user accounts.</PPP>
      <PPP>The final implementation should identify the actual third-party services being used.</PPP>

      <PPHeading>Data Security</PPHeading>
      <PPP>DormiTrack is committed to implementing reasonable and appropriate safeguards to protect personal information against:</PPP>
      <PPUl items={["Unauthorized access","Unauthorized disclosure","Accidental loss","Alteration","Destruction","Misuse","Other unlawful processing"]} />
      <PPP>Security measures may include, where implemented:</PPP>
      <PPUl items={["User authentication","Role-based access control","Access restrictions","Secure database configuration","Secure authentication","Secure communication","Database access controls","Monitoring of system access"]} />
      <PPP>DormiTrack will not claim to implement security measures that are not actually available in the system.</PPP>

      <PPHeading>Account Credentials</PPHeading>
      <PPP>Users are responsible for keeping their account credentials secure.</PPP>
      <PPP>Users should:</PPP>
      <PPUl items={["Keep passwords confidential","Avoid sharing account credentials","Use a secure password","Log out when using a shared device","Report suspected unauthorized account access"]} />
      <PPP>Passwords should be handled through a secure authentication mechanism and should not be stored as plain-text passwords.</PPP>

      <PPHeading>Data Accuracy</PPHeading>
      <PPP>Users are responsible for providing accurate and updated information.</PPP>
      <PPP>Users may request the correction or updating of inaccurate, incomplete, or outdated information through the appropriate system process.</PPP>

      <PPHeading>Data Retention</PPHeading>
      <PPP>DormiTrack will retain personal information only for as long as necessary for its intended purpose and applicable institutional or legal requirements.</PPP>
      <PPP>When information is no longer necessary, it may be:</PPP>
      <PPUl items={["Deleted","Destroyed","Anonymized","Securely disposed of"]} />
      <PPP>The actual retention period should follow the applicable BISU records-retention and data privacy requirements.</PPP>

      <PPHeading>Rights of Data Subjects</PPHeading>
      <PPP>Subject to applicable conditions and limitations, users may have the following rights regarding their personal information:</PPP>

      <PPSub>Right to Be Informed</PPSub>
      <PPP>Users have the right to know how their personal information is collected, used, stored, and processed.</PPP>
      <PPSub>Right to Access</PPSub>
      <PPP>Users may request access to their personal information, subject to applicable limitations.</PPP>
      <PPSub>Right to Rectification</PPSub>
      <PPP>Users may request correction of inaccurate or incomplete information.</PPP>
      <PPSub>Right to Object</PPSub>
      <PPP>Users may object to certain processing activities when permitted by law.</PPP>
      <PPSub>Right to Erasure or Blocking</PPSub>
      <PPP>Users may request deletion, removal, or blocking of personal information when legally applicable.</PPP>
      <PPSub>Right to Data Portability</PPSub>
      <PPP>Where applicable, users may request their personal information in an appropriate electronic format.</PPP>
      <PPSub>Right to File a Complaint</PPSub>
      <PPP>Users may raise privacy concerns and may file a complaint with the appropriate privacy authority when applicable.</PPP>
      <PPSub>Right to Damages</PPSub>
      <PPP>A data subject may have the right to seek compensation where legally applicable and where damage has resulted from unlawful processing or violation of privacy rights.</PPP>

      <PPHeading>Withdrawal of Consent</PPHeading>
      <PPP>Where processing is based on consent, users may withdraw their consent through the appropriate procedure.</PPP>
      <PPP>Withdrawal of consent does not necessarily affect processing that was lawfully conducted before the withdrawal.</PPP>
      <PPP>Withdrawing permission for certain functions may also affect system functionality. For example, disabling location permission may prevent location-based presence verification from working.</PPP>

      <PPHeading>Privacy and Location Permissions</PPHeading>
      <PPP>DormiTrack may request location permission when a location-dependent feature is used.</PPP>
      <PPP>Users should be informed about:</PPP>
      <PPUl items={["Why location access is required","What location information is used","How the location information supports the system","Who may access the resulting information","What happens when location permission is denied"]} />
      <PPP>DormiTrack's location feature is intended for boarding house-related presence verification, not unrestricted monitoring of student movements.</PPP>

      <PPHeading>Data Breach and Security Incidents</PPHeading>
      <PPP>In the event of a suspected or confirmed personal data breach, the responsible administrators should take appropriate measures to:</PPP>
      <PPUl items={["Contain the incident","Investigate the incident","Protect affected information","Address the cause of the incident","Notify affected parties when legally required"]} />
      <PPP>Users should report suspected privacy or security incidents to the designated system or privacy administrator.</PPP>

      <PPHeading>Privacy of Minors</PPHeading>
      <PPP>Where DormiTrack processes information relating to minors, appropriate safeguards should be applied.</PPP>
      <PPP>Where required, appropriate parental or legal guardian authorization should be obtained.</PPP>
      <PPP>The system should only collect information necessary for legitimate boarding house management and monitoring purposes.</PPP>

      <PPHeading>Changes to This Privacy Policy</PPHeading>
      <PPP>DormiTrack may update this Privacy Policy when:</PPP>
      <PPUl items={["System features change","Data processing practices change","Applicable laws or regulations change","New third-party services are introduced","Privacy and security practices are updated"]} />
      <PPP>The Last Updated date should be changed whenever this Privacy Policy is revised.</PPP>

      <PPHeading>Contact Us</PPHeading>
      <PPP>For questions, concerns, requests, or complaints regarding personal information, users may contact:</PPP>
      <PPP>DormiTrack / Bohol Island State University – Calape Campus</PPP>
      <PPUl items={["Office/Unit: [Insert Responsible Office]","Data Privacy Officer / Privacy Contact: [Insert Name or Position]","Email: [Insert Official Email]","Contact Number: [Insert Contact Number]","Address: [Insert Official Address]"]} />

      <PPHeading>User Acknowledgment</PPHeading>
      <PPP>By creating an account and using DormiTrack, the user acknowledges that they have been informed about the collection and processing of their personal information for the purposes described in this Privacy Policy.</PPP>
    </>
  );
}

// ── TERMS AND CONDITIONS (real, full text — shown from the login screen's footer link) ──

function TermsConditionsContent() {
  return (
    <>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 2px" }}>Effective Date: August 1, 2026</p>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PP_IN, margin: "0 0 14px" }}>Last Updated: September 5, 2026</p>

      <PPHeading>Acceptance of Terms</PPHeading>
      <PPP>Welcome to DormiTrack: Boarding House Student Monitoring and Tracking System.</PPP>
      <PPP>These Terms and Conditions govern the use of DormiTrack by students, parents/guardians, landlords, and authorized Housing Director/administrator users.</PPP>
      <PPP>By creating an account or using DormiTrack, you acknowledge that you have read, understood, and agreed to comply with these Terms and Conditions.</PPP>
      <PPP>If you do not agree with these terms, you should not use the system.</PPP>

      <PPHeading>Purpose of DormiTrack</PPHeading>
      <PPP>DormiTrack is designed to support:</PPP>
      <PPUl items={["Student boarding house management","Student information management","Boarding house registration","Room and occupancy management","Boarding house selection","Parent/guardian monitoring","Payment record monitoring","Student presence verification","Boarding house location viewing","Report and concern submission","Housing administration"]} />
      <PPP>DormiTrack is intended to serve as a monitoring and management system and does not replace the responsibilities of students, parents/guardians, landlords, or authorized institutional personnel.</PPP>

      <PPHeading>User Accounts</PPHeading>
      <PPP>Users must:</PPP>
      <PPUl items={["Register using accurate information","Use their own account","Keep account credentials confidential","Provide updated information when necessary","Use the account only for its intended purpose","Immediately report suspected unauthorized account access"]} />
      <PPP>Users are responsible for activities performed through their accounts unless unauthorized access occurred without their fault.</PPP>

      <PPHeading>Student Responsibilities</PPHeading>
      <PPP>Students using DormiTrack agree to:</PPP>
      <PPUl items={["Provide accurate student information","Use their assigned account properly","Select the boarding house where they intend to stay","Provide accurate information during boarding house selection","Wait for landlord confirmation when required","Use location verification honestly","Provide accurate payment-related information when applicable","Submit truthful reports and concerns","Respect the privacy of other students","Follow applicable boarding house rules","Follow applicable BISU policies"]} />
      <PPP>Students must not intentionally provide false information or manipulate system records.</PPP>

      <PPHeading>Parent/Guardian Responsibilities</PPHeading>
      <PPP>Parents or guardians using DormiTrack agree to:</PPP>
      <PPUl items={["Provide accurate personal information","Use only their authorized account","Access information only for their linked student","Keep their account credentials confidential","Respect the privacy of other students","Use student information only for legitimate purposes","Report inaccurate information or unauthorized access"]} />
      <PPP>Parents or guardians must not attempt to access accounts or information belonging to other users.</PPP>

      <PPHeading>Landlord Responsibilities</PPHeading>
      <PPP>Landlords using DormiTrack agree to:</PPP>
      <PPUl items={["Provide accurate personal information","Provide accurate boarding house information","Register the correct boarding house location","Maintain accurate room information","Maintain accurate occupancy information","Review student boarding house requests","Confirm or reject student requests appropriately","Maintain accurate billing or payment records","Submit truthful reports","Protect student information accessible through their account","Use student information only for legitimate boarding house management"]} />
      <PPP>Landlords must not intentionally provide false occupancy, payment, student, or boarding house information.</PPP>

      <PPHeading>Housing Director / Administrator Responsibilities</PPHeading>
      <PPP>Authorized Housing Director or administrator users agree to:</PPP>
      <PPUl items={["Use administrative access only for legitimate institutional purposes","Protect confidential information","Maintain appropriate access controls","Access information only when necessary","Avoid unauthorized disclosure of user information","Review reports appropriately","Maintain accurate administrative records","Follow applicable BISU policies and data privacy requirements"]} />
      <PPP>Administrative privileges must not be used for personal purposes or unauthorized monitoring.</PPP>

      <PPHeading>Boarding House Selection and Confirmation</PPHeading>
      <PPP>Students may select an available boarding house through DormiTrack.</PPP>
      <PPP>The process may include:</PPP>
      <PPUl items={["Viewing registered boarding houses","Viewing boarding house information","Selecting a preferred boarding house","Submitting a boarding house request","Waiting for landlord confirmation","Receiving an approval or rejection","Proceeding with the selected boarding house after confirmation"]} />
      <PPP>Submitting a request does not automatically guarantee acceptance.</PPP>
      <PPP>The landlord or authorized personnel may approve or reject a student's request based on the applicable boarding house requirements.</PPP>

      <PPHeading>Boarding House and Room Information</PPHeading>
      <PPP>Landlords are responsible for providing accurate information about their registered boarding houses and rooms.</PPP>
      <PPP>This may include:</PPP>
      <PPUl items={["Boarding house name","Address","Location","Room number","Room capacity","Occupancy","Room status","Other information required by the system"]} />
      <PPP>Users should not intentionally alter or misrepresent boarding house or room information.</PPP>

      <PPHeading>Payment Records</PPHeading>
      <PPP>DormiTrack may provide functions for recording and monitoring boarding house payment information.</PPP>
      <PPP>Payment information may include:</PPP>
      <PPUl items={["Rent","Electricity","Water","Internet","Amount","Payment date","Payment status"]} />
      <PPP>Unless an online payment feature is specifically implemented, DormiTrack does not serve as an online payment processor.</PPP>
      <PPP>Users should verify payment-related information with the appropriate landlord or authorized personnel when necessary.</PPP>

      <PPHeading>Location and Presence Verification</PPHeading>
      <PPP>DormiTrack may use device location to support boarding house-based presence verification.</PPP>
      <PPP>Users agree to:</PPP>
      <PPUl items={["Grant location permission when required for the applicable feature","Use the location feature honestly","Not intentionally manipulate location information","Not attempt to bypass or falsify presence verification","Use the feature only for its intended purpose"]} />
      <PPP>DormiTrack's location functionality is intended to verify presence within a designated boarding house area and is not intended to provide unrestricted tracking of student movements.</PPP>

      <PPHeading>Reports and Complaints</PPHeading>
      <PPP>Users may submit reports or concerns through DormiTrack.</PPP>
      <PPP>Reports should:</PPP>
      <PPUl items={["Be truthful","Be relevant to the purpose of the system","Provide sufficient information when possible","Avoid unnecessary personal or sensitive information","Not be used to harass, threaten, or falsely accuse another person"]} />
      <PPP>Users who intentionally submit false or malicious reports may be subject to appropriate action under applicable institutional or system rules.</PPP>

      <PPHeading>Prohibited Activities</PPHeading>
      <PPP>Users must not:</PPP>
      <PPUl items={["Access another person's account","Use another person's identity","Share account credentials","Attempt to bypass authentication","Attempt to access restricted system functions","Modify records without authorization","Falsify information","Manipulate location verification","Falsify payment records","Submit malicious or intentionally false reports","Attempt to obtain unauthorized personal information","Disclose confidential information without authorization","Interfere with system operation","Introduce malicious software or harmful code","Use DormiTrack for unlawful activities","Use the system to harass, threaten, or harm another person"]} />

      <PPHeading>Accuracy of Information</PPHeading>
      <PPP>Users are responsible for the accuracy of the information they provide.</PPP>
      <PPP>Users should promptly update information when it becomes inaccurate or outdated.</PPP>
      <PPP>DormiTrack administrators may correct, update, or request verification of information when necessary for proper system operation.</PPP>

      <PPHeading>System Availability</PPHeading>
      <PPP>DormiTrack is intended to provide reliable access to its available functions. However, temporary interruptions may occur due to:</PPP>
      <PPUl items={["System maintenance","Technical issues","Internet connectivity problems","Server or database issues","Device problems","Third-party service interruptions","Other circumstances beyond the system administrator's reasonable control"]} />
      <PPP>DormiTrack does not guarantee uninterrupted or error-free operation at all times.</PPP>

      <PPHeading>Third-Party Services</PPHeading>
      <PPP>Certain DormiTrack functions may depend on third-party services, such as:</PPP>
      <PPUl items={["Mapping services","Location services","Cloud database services","Authentication services","Hosting services"]} />
      <PPP>The availability and operation of these services may be subject to their respective terms, policies, and technical limitations.</PPP>

      <PPHeading>User Content and Submitted Information</PPHeading>
      <PPP>Information submitted by users through DormiTrack should be:</PPP>
      <PPUl items={["Accurate","Relevant","Lawful","Appropriate for the intended system function"]} />
      <PPP>Users are responsible for the content they submit through reports, forms, or other system functions.</PPP>
      <PPP>Users must not submit content that:</PPP>
      <PPUl items={["Contains malicious code","Intentionally contains false information","Threatens another person","Harasses another user","Violates applicable laws","Unnecessarily exposes another person's private information"]} />

      <PPHeading>Intellectual Property</PPHeading>
      <PPP>The DormiTrack system, including its design, interface, branding, software components, documentation, and other original materials, may be protected by applicable intellectual property laws and institutional policies.</PPP>
      <PPP>Users may use the system only for its intended purpose.</PPP>
      <PPP>Users must not copy, modify, reproduce, distribute, reverse engineer, or commercially exploit protected system components without proper authorization, where such restrictions apply.</PPP>

      <PPHeading>Account Suspension or Termination</PPHeading>
      <PPP>Access to DormiTrack may be suspended, restricted, or terminated when:</PPP>
      <PPUl items={["A user violates these Terms and Conditions","An account is used improperly","Unauthorized access is detected","False information is intentionally provided","The system is used for unlawful activities","Suspension is necessary to protect system security","Suspension is required by applicable institutional rules or law"]} />
      <PPP>Where appropriate, users may be informed of the reason for the restriction.</PPP>

      <PPHeading>Privacy</PPHeading>
      <PPP>Use of DormiTrack is also subject to the DormiTrack Privacy Policy.</PPP>
      <PPP>The Privacy Policy explains how personal information is collected, used, stored, accessed, and protected.</PPP>
      <PPP>Users are encouraged to review the Privacy Policy before using the system.</PPP>

      <PPHeading>Limitation of Responsibility</PPHeading>
      <PPP>DormiTrack is intended to assist with boarding house monitoring and management.</PPP>
      <PPP>The system does not guarantee:</PPP>
      <PPUl items={["That a student will always be physically present at a boarding house;","That all location information will always be accurate;","That all users will provide truthful information;","That all payment records are independently verified;","That boarding house conditions are always safe;","That the system will always be available;","That technical errors will never occur."]} />
      <PPP>DormiTrack does not replace the responsibilities of students, parents/guardians, landlords, or authorized institutional personnel.</PPP>

      <PPHeading>Technical and Location Limitations</PPHeading>
      <PPP>Location-based functions may be affected by:</PPP>
      <PPUl items={["GPS accuracy","Device settings","Indoor environments","Weak signal","Internet connectivity","Device battery","Location permission settings","Mapping or location service availability"]} />
      <PPP>Therefore, a location-based status should be treated as a system-generated indication based on available location information, rather than an absolute guarantee of a student's physical presence.</PPP>

      <PPHeading>User Responsibility for Account Security</PPHeading>
      <PPP>Users are responsible for protecting their own accounts.</PPP>
      <PPP>If a user believes that their account has been compromised, they should:</PPP>
      <PPUl items={["Change their password when possible","Log out of unauthorized devices","Contact the system administrator","Report the incident immediately"]} />
      <PPP>Users should not intentionally share their credentials with other individuals.</PPP>

      <PPHeading>Changes to the Terms and Conditions</PPHeading>
      <PPP>DormiTrack may update these Terms and Conditions when:</PPP>
      <PPUl items={["New features are introduced","Existing features are modified","System policies change","Applicable laws or institutional policies change","Security requirements change"]} />
      <PPP>The Last Updated date will indicate when the Terms and Conditions were most recently revised.</PPP>
      <PPP>Continued use of DormiTrack after applicable changes may constitute acceptance of the updated terms, subject to applicable law and institutional requirements.</PPP>

      <PPHeading>Governing Policies and Applicable Rules</PPHeading>
      <PPP>The use of DormiTrack is subject to applicable:</PPP>
      <PPUl items={["Philippine laws and regulations","Data privacy requirements","BISU policies and regulations","Boarding house rules","Institutional housing policies","Other applicable administrative requirements"]} />
      <PPP>Where these Terms and Conditions conflict with mandatory law or institutional policy, the applicable law or authorized institutional policy will prevail to the extent required.</PPP>

      <PPHeading>Contact Information</PPHeading>
      <PPP>For questions or concerns regarding these Terms and Conditions, users may contact:</PPP>
      <PPP>DormiTrack / Bohol Island State University – Calape Campus</PPP>
      <PPUl items={["Office/Unit: [Insert Responsible Office]","Contact Person: [Insert Name or Position]","Email: [Insert Official Email]","Contact Number: [Insert Contact Number]","Address: [Insert Official Address]"]} />

      <PPHeading>User Agreement</PPHeading>
      <PPP>By creating an account or using DormiTrack, the user confirms that they:</PPP>
      <PPUl items={["Have read these Terms and Conditions;","Understand the rules governing the use of DormiTrack;","Agree to comply with the applicable requirements;","Will use the system responsibly; and","Understand that misuse of the system may result in restriction, suspension, or termination of access."]} />
    </>
  );
}

// ── WELCOME / LOGIN ───────────────────────────────────────────────────────────

// ── WELCOME + LOGIN (combined) ─────────────────────────────────────────────────
//
// Merges the old two-step Welcome → Login flow into one screen: the app opens
// straight into a page that both introduces DormiTrack and lets you sign in,
// so returning users never have to tap through an intermediate splash choice.
// "Create Account" is the only path onward to role selection / registration.
function WelcomeLoginScreen({ go, onPendingRegistration, onPendingParentLink, onParentJustLinked, email, setEmail, pass, setPass }: {
  go: (s: Screen) => void; onPendingRegistration: (info: PendingRegInfo, registrationId: string) => void;
  onPendingParentLink: (resume: { kind: "pending" | "rejected" | "none"; linkId: string | null; studentIdNo: string }) => void;
  onParentJustLinked: () => void;
  // Controlled from App() so navigating to "Forgot Password?" and back doesn't lose what was typed.
  email: string; setEmail: (v: string) => void; pass: string; setPass: (v: string) => void;
}) {
  const [show, setShow] = useState(false); const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 30); return () => clearTimeout(t); }, []);

  const handleLogin = async () => {
    const identifier = email.trim();
    if (!identifier || !pass) { setErr("Please enter your username/email and password."); return; }
    setBusy(true); setErr("");
    // The admin account's real Supabase Auth login is backed by a fixed email —
    // "admin" is just the identifier shown/typed here.
    let loginEmail = identifier === "admin" ? "knaquila2004@gmail.com" : identifier;
    // Anything else without an "@" isn't a real email — Supabase Auth only ever authenticates by
    // email, so a typed username (currently only students have one) needs resolving to its real
    // email first via a narrow, pre-auth-safe lookup RPC (mirrors find_student_user_id's shape).
    if (loginEmail !== "knaquila2004@gmail.com" && !loginEmail.includes("@")) {
      const { data: resolvedEmail } = await supabase.rpc("find_email_by_username", { p_username: loginEmail });
      if (!resolvedEmail) { setBusy(false); setErr("Invalid username/email or password."); return; }
      loginEmail = resolvedEmail;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: pass });
    if (error || !data.user) { setBusy(false); setErr("Invalid username/email or password."); return; }
    // Login succeeded — clear the typed credentials now that they've done their job, so they don't
    // sit around (lifted up to App() so a stray "Forgot Password?" tap no longer wipes them) and
    // silently reappear pre-filled the next time someone lands on this screen after logging out.
    setEmail(""); setPass("");

    // A student who hasn't completed (or is still awaiting approval on)
    // their boarding house registration must not land on the real home
    // dashboard — it would just show empty placeholders. Route them back
    // into the choose/await flow instead, based on the real DB state (not
    // any leftover same-session client state, since this covers a fresh
    // login after a reload just as much as the interactive case).
    const { data: userRow } = await supabase.from("users").select("role").eq("id", data.user.id).maybeSingle();
    if (userRow?.role === "student") {
      const status = await getMyStudentGateStatus();
      setBusy(false);
      if (status.kind === "pending") { onPendingRegistration(status.info, status.registrationId); go("pendingVerify"); return; }
      if (status.kind === "none") { go("boardingReg"); return; }
      go("dashboard");
      return;
    }
    // Same idea for parents: the real dashboard shows another family's student data, so a parent
    // whose link isn't confirmed yet must not reach it just by logging back in (previously the
    // only gate was a "Continue to Dashboard" button on the post-signup screen, which a parent
    // could just skip past — and logging out/in bypassed even that).
    if (userRow?.role === "parent") {
      const status = await getMyParentGateStatus();
      setBusy(false);
      if (status.kind === "pending") { onPendingParentLink({ kind: "pending", linkId: status.linkId, studentIdNo: status.studentIdNo }); go("parentLinking"); return; }
      if (status.kind === "rejected") { onPendingParentLink({ kind: "rejected", linkId: status.linkId, studentIdNo: status.studentIdNo }); go("parentLinking"); return; }
      if (status.kind === "none") { onPendingParentLink({ kind: "none", linkId: null, studentIdNo: "" }); go("parentLinking"); return; }
      // Confirmed link the parent hasn't seen a confirmation for yet (e.g. they closed the app
      // while pending and the student approved it later) — show it once, here, since they won't
      // have been sitting on ParentLinkingScreen's own live "success" card to see it happen.
      if (status.kind === "linked" && status.justLinked) onParentJustLinked();
      go("dashboard");
      return;
    }
    setBusy(false);
    go("dashboard");
  };

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", background: "white" }}>
      <style>{`
        @keyframes dtBlobA{0%,100%{transform:translate(-10%,-6%) scale(1);border-radius:42% 58% 65% 35%/45% 40% 60% 55%}50%{transform:translate(6%,8%) scale(1.12);border-radius:60% 40% 35% 65%/55% 65% 35% 45%}}
        @keyframes dtBlobB{0%,100%{transform:translate(8%,-4%) scale(1);border-radius:55% 45% 40% 60%/40% 55% 45% 60%}50%{transform:translate(-8%,10%) scale(1.08);border-radius:38% 62% 58% 42%/60% 45% 55% 40%}}
        @keyframes dtBlobC{0%,100%{transform:translate(0,0) scale(1);border-radius:50% 50% 45% 55%/55% 45% 55% 45%}50%{transform:translate(-6%,-10%) scale(1.15);border-radius:60% 40% 55% 45%/45% 55% 40% 60%}}
        @keyframes dtBlobD{0%,100%{transform:translate(4%,6%) scale(1)}50%{transform:translate(-10%,-4%) scale(1.1)}}
      `}</style>

      {/* ── Animated lava-lamp background: slow, blurred, layered blobs ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-8%", left: "-14%", width: 300, height: 300, background: "radial-gradient(circle at 35% 35%,rgba(196,181,253,.55),rgba(109,40,217,.05) 70%)", filter: "blur(50px)", animation: "dtBlobA 22s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "6%", right: "-18%", width: 260, height: 260, background: "radial-gradient(circle at 60% 40%,rgba(139,92,246,.55),rgba(76,29,149,.05) 70%)", filter: "blur(46px)", animation: "dtBlobB 26s ease-in-out infinite", animationDelay: "-4s" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-12%", width: 280, height: 280, background: "radial-gradient(circle at 40% 60%,rgba(79,70,229,.5),rgba(30,27,61,.05) 70%)", filter: "blur(52px)", animation: "dtBlobC 30s ease-in-out infinite", animationDelay: "-10s" }} />
        <div style={{ position: "absolute", bottom: "-16%", right: "-16%", width: 320, height: 320, background: "radial-gradient(circle at 50% 50%,rgba(167,139,250,.4),rgba(91,33,182,.05) 70%)", filter: "blur(56px)", animation: "dtBlobD 24s ease-in-out infinite", animationDelay: "-6s" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" as const, padding: "156px 24px 32px" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginBottom: 28 }}>
          <div style={{ background: "#F5F0FF", borderRadius: 22, padding: 16, marginBottom: 16 }}>
            <DormiLogo size={48} />
          </div>
          <h1 style={{ color: "#1F2937", fontSize: 24, fontWeight: 800, margin: "0 0 6px", fontFamily: "'Quicksand',sans-serif", textAlign: "center" }}>Welcome to DormiTrack!</h1>
        </div>

        {/* Login form — fades & slides into view on mount (no card chrome behind it anymore,
             same padding as the old glass card so nothing else shifts size/position) */}
        <div style={{
          flexShrink: 0, padding: "26px 22px 24px",
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)",
          transition: "opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1)",
        }}>
          <Input label="Username or Email" type="text" value={email} onChange={setEmail} right={<Mail size={17} />} autoComplete="off" compact />
          <Input label="Password" type={show ? "text" : "password"} value={pass} onChange={setPass} autoComplete="new-password" compact
            right={<button onClick={() => setShow(s => !s)} className="transition-transform active:scale-90" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9CA3AF" }}>{show ? <Eye size={17} /> : <EyeOff size={17} />}</button>} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8, marginBottom: 20 }}>
            <button onClick={() => go("forgotPassword")} className="transition-opacity hover:opacity-80" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#9772F6", fontFamily: "'Quicksand',sans-serif" }}>Forgot Password?</button>
          </div>
          <GradBtn onClick={handleLogin} disabled={busy} compact>{busy ? "Logging In…" : "Log In"}</GradBtn>
          {/* Always reserves its line's height (visibility, not conditional mount) so the
              "Don't have an account?" line below never shifts when an error appears/clears. */}
          <p style={{ textAlign: "center", fontSize: 10, color: "#DC2626", marginTop: 9, marginBottom: 0, visibility: err ? "visible" : "hidden" }}>{err || "placeholder"}</p>
          <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 9, marginBottom: 0 }}>
            {"Don't have an account? "}
            <button onClick={() => go("roleSelect")} className="transition-opacity hover:opacity-80" style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, color: "#7549F6", fontSize: 13, fontFamily: "'Quicksand',sans-serif" }}>Create Account</button>
          </p>
        </div>

        <div style={{ marginTop: 64, textAlign: "center", fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <span onClick={() => setShowPrivacy(true)} style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>
            <span>·</span>
            <span onClick={() => setShowTerms(true)} style={{ textDecoration: "underline", cursor: "pointer" }}>Terms & Conditions</span>
          </div>
        </div>
      </div>

      {(showPrivacy || showTerms) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => { setShowPrivacy(false); setShowTerms(false); }}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 430, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: "'Quicksand',sans-serif" }}>{showPrivacy ? "Privacy Policy" : "Terms & Conditions"}</h3>
              <button onClick={() => { setShowPrivacy(false); setShowTerms(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} color="#9CA3AF" /></button>
            </div>
            <div style={{ overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 20px 32px" }}>
              {showPrivacy ? (
                <PrivacyPolicyContent />
              ) : (
                <TermsConditionsContent />
              )}
            </div>
          </div>
        </div>
      )}
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
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [np, setNp] = useState("");
  const [confirmNp, setConfirmNp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const meta: Record<Ph, { title: string; desc: string }> = {
    email: { title: "Forgot Password", desc: "Enter your email to receive a verification code" },
    code: { title: "Verify Code", desc: `Code sent to ${email || "your email"}` },
    newpass: { title: "New Password", desc: "Create a strong new password for your account" },
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Real email OTP via Supabase Auth — the same code the "code" phase actually verifies below,
  // not a UI-only simulation. shouldCreateUser:false so this can't be used to silently create an
  // account for an email that was never signed up.
  const sendCode = async () => {
    if (!email.trim()) { setErr("Please enter your email address."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setCode(["", "", "", "", "", ""]);
    setPhase("code");
    setResendCooldown(30);
  };

  const verifyCode = async () => {
    const token = code.join("");
    if (token.length !== 6) { setErr("Enter the full 6-digit code."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (error) { setErr("Invalid or expired code. Please try again."); return; }
    setPhase("newpass");
  };

  // Runs under the real session verifyOtp just established for this account — an actual
  // password change, not a screen transition that pretends one happened.
  const resetPassword = async () => {
    if (np.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (np !== confirmNp) { setErr("Passwords do not match."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: np });
    if (error) { setBusy(false); setErr(error.message); return; }
    await supabase.auth.signOut(); // don't leave them silently signed in via the recovery session
    setBusy(false);
    go("login");
  };

  const back = () => {
    setErr("");
    if (phase === "email") go("login");
    else setPhase(phase === "newpass" ? "code" : "email");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", scrollbarWidth: "none" as const, background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "56px 24px 40px", backgroundImage: GRAD_H }}>
        <button onClick={back} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", marginBottom: 16, padding: 0 }}><ChevronLeft size={24} /></button>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,.14)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Lock size={28} color="white" />
        </div>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>{meta[phase].title}</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>{meta[phase].desc}</p>
      </div>
      <div style={{ flex: 1, background: "white", borderRadius: "32px 32px 0 0", marginTop: -20, padding: "28px 24px 32px" }}>
        {err && <p style={{ textAlign: "center", fontSize: 12, color: "#DC2626", marginBottom: 16 }}>{err}</p>}
        {phase === "email" && <>
          <Input label="Email Address" placeholder="your@email.com" type="email" value={email} onChange={setEmail} right={<Mail size={17} />} />
          <GradBtn onClick={sendCode} disabled={busy}>{busy ? "Sending…" : "Send Verification Code"}</GradBtn>
        </>}
        {phase === "code" && <>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>Enter the 6-digit code sent to your email.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {code.map((v, i) => (
              <input key={i} maxLength={1} value={v} onChange={e => { const c = [...code]; c[i] = e.target.value.replace(/\D/g, ""); setCode(c); }}
                style={{ flex: 1, height: 56, textAlign: "center", fontSize: 20, fontWeight: 800, borderRadius: 16, border: `2px solid ${v ? "#9772F6" : "#E5E7EB"}`, background: "#F7F8FC", color: "#1F2937", outline: "none", fontFamily: "'Quicksand',sans-serif" }} />
            ))}
          </div>
          <GradBtn onClick={verifyCode} disabled={busy}>{busy ? "Verifying…" : "Verify Code"}</GradBtn>
          <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 16 }}>
            {"Didn't receive it? "}
            {resendCooldown > 0
              ? <span style={{ fontWeight: 700, color: "#9CA3AF", fontFamily: "'Quicksand',sans-serif" }}>Resend ({resendCooldown}s)</span>
              : <span onClick={sendCode} style={{ fontWeight: 700, color: "#9772F6", cursor: "pointer", fontFamily: "'Quicksand',sans-serif" }}>Resend</span>}
          </p>
        </>}
        {phase === "newpass" && <>
          <Input label="New Password" placeholder="Min. 6 characters" type="password" value={np} onChange={setNp} right={<Lock size={17} />} />
          <Input label="Confirm Password" placeholder="Re-enter new password" type="password" value={confirmNp} onChange={setConfirmNp} right={<Lock size={17} />} />
          <GradBtn onClick={resetPassword} disabled={busy}>{busy ? "Saving…" : "Reset Password"}</GradBtn>
        </>}
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

type VisitorRecord = {
  id: string; studentId: string;                // studentId: real user id, needed to notify on "left"
  studentName: string; room: string;           // always shown (auto-linked)
  visitorName?: string; contact?: string;
  relationship?: string; purpose?: string;
  date: string;                                 // always stored for filtering
  ts: number;                                    // raw time_in — real chronological sort + loggedLabel() display
  timeIn?: string; timeOut?: string;
  status: "inside" | "left";
};
type VisitorFields = { name: boolean; contact: boolean; relationship: boolean; purpose: boolean };

function DashboardScreen({ go, role = "landlord", visitorEnabled = false, visitorFields = { name:true, contact:true, relationship:true, purpose:true }, highlightsEnabled = true, pendingDeepLink, onDeepLinkConsumed }: { go: (s: Screen) => void; role?: Role; visitorEnabled?: boolean; visitorFields?: VisitorFields; highlightsEnabled?: boolean; pendingDeepLink?: { type: NotificationType; relatedId?: string } | null; onDeepLinkConsumed?: () => void }) {
  const QS = "'Quicksand',sans-serif";
  const IN = "'Inter',sans-serif";
  const notifCount = useUnreadCount(role);
  const chatCount = useUnreadChatCount(role);

  const [activityFilter, setActivityFilter] = useState<"all"|"landlord"|"student"|"parent"|"admin"|"visitor">("all");

  // ── Visitor Records state ────────────────────────────────────────────────────
  // Real records from the visitor_records table (0044_visitor_records.sql),
  // student-submitted via the new "Log a Visitor" form on StudentHome.tsx —
  // loaded below in refreshLandlordData alongside the other landlord data.
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [visitorFilter, setVisitorFilter] = useState<"all"|"today"|"week"|"month"|"inside"|"left">("all");
  const [visitorSearch, setVisitorSearch] = useState("");
  const [visitorSort, setVisitorSort] = useState<"newest"|"oldest">("newest");
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [selectedStudentReport, setSelectedStudentReport] = useState<StudentReport|null>(null);
  const [reportResponseText, setReportResponseText] = useState("");
  // Status pill tapped in the open concern modal but not yet sent — null means "no change
  // staged," so Confirm Update falls back to the report's own current status.
  const [pendingStatusChoice, setPendingStatusChoice] = useState<ReportStatus | null>(null);

  // Opened from a "Report" notification — jump straight to that student's report.
  // Opened from a "New Registration Request" notification — scroll straight to Reservation
  // Requests below and briefly highlight that specific request. Gated on relatedId
  // specifically: a "verification" notification with no relatedId is a different case
  // entirely (e.g. an admin's "your boarding house listing needs revision") that this
  // scroll/highlight doesn't apply to. Deliberately does NOT call onDeepLinkConsumed itself —
  // pendingRegs (needed to actually open the review modal below) loads asynchronously and can
  // easily still be empty at this point; clearing pendingDeepLink here would make it
  // unavailable by the time that data arrives. The modal-opening effect further down consumes
  // it once it's actually found the matching request.
  const reservationRequestsRef = useRef<HTMLDivElement | null>(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type === "report" && pendingDeepLink.relatedId) {
      const match = studentReports.find(r => r.id === pendingDeepLink.relatedId);
      // Also reset the compose box here, same as the list item's onClick does — any
      // existing response now renders in its own read-only "Your Response" card (see
      // below), so this box is always a blank slate for writing a new one, exactly like
      // StudentHome.tsx's "Add Comment" box never prefills from the student's last note.
      if (match) { setSelectedStudentReport(match); setReportResponseText(""); setPendingStatusChoice(null); onDeepLinkConsumed?.(); }
    }
    if (pendingDeepLink?.type === "verification" && pendingDeepLink.relatedId) {
      setHighlightedRequestId(pendingDeepLink.relatedId);
      requestAnimationFrame(() => reservationRequestsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [pendingDeepLink, studentReports, onDeepLinkConsumed]);
  // Fade the highlight back out a few seconds after it's shown, so it reads as a
  // momentary "here it is" pointer rather than a permanent marker on the request.
  useEffect(() => {
    if (!highlightedRequestId) return;
    const t = setTimeout(() => setHighlightedRequestId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightedRequestId]);
  // Opened from a "New Visitor Logged" notification — open the Visitor Records modal
  // and briefly highlight that specific record. `visitors` loads asynchronously
  // (refreshLandlordData below), so this re-checks whenever it changes rather than
  // relying on it already being populated the instant the deep link arrives.
  const [highlightedVisitorId, setHighlightedVisitorId] = useState<string | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type !== "visitor" || !pendingDeepLink.relatedId) return;
    const match = visitors.find(v => v.id === pendingDeepLink.relatedId);
    if (match) { setShowVisitorModal(true); setHighlightedVisitorId(match.id); onDeepLinkConsumed?.(); }
  }, [pendingDeepLink, visitors, onDeepLinkConsumed]);
  useEffect(() => {
    if (!highlightedVisitorId) return;
    const t = setTimeout(() => setHighlightedVisitorId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightedVisitorId]);
  const [reportStatusFilter, setReportStatusFilter] = useState<"all"|ReportStatus>("all");
  const [showResolvedConcerns, setShowResolvedConcerns] = useState(false);
  const [showAllActiveConcerns, setShowAllActiveConcerns] = useState(false);
  const [activityDateFilter, setActivityDateFilter] = useState<"all"|"today"|"week"|"month">("all");
  // ── Real pending registrations + occupancy stats (landlord only) ────────────
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [pendingRegs, setPendingRegs] = useState<PendingRegistration[]>([]);
  const [reqStates, setReqStates] = useState<Record<string,"pending"|"accepted"|"rejected">>({});
  const [reqBusy, setReqBusy] = useState<string | null>(null);
  const [reqError, setReqError] = useState("");
  const [stats, setStats] = useState<OccupancyStats | null>(null);
  const [landlordName, setLandlordName] = useState("");

  // These three are independent of each other, so each one sets its own state as soon as
  // it resolves rather than being batched behind Promise.all — a notification deep-link
  // (report → studentReports, verification → pendingRegs) only needs ONE of them, and
  // waiting on all three together meant it sat blocked on whichever query happened to be
  // slowest (e.g. the occupancy-stats aggregate) even when its own data was already back.
  const refreshLandlordData = (uid: string) => {
    getPendingRegistrationsForLandlord(uid).then(setPendingRegs);
    getOccupancyStatsForLandlord(uid).then(setStats);
    getReportsForLandlord(uid).then(setStudentReports);
    getVisitorRecordsForLandlord(uid).then(setVisitors);
  };

  useEffect(() => {
    if (role !== "landlord") return;
    let active = true;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      const uid = s?.user?.id;
      if (!uid || !active) return;
      setLandlordId(uid);
      refreshLandlordData(uid);
      getMyLandlordAccount().then(acc => { if (active && acc?.firstName) setLandlordName(acc.firstName); });
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const handleAccept = async (regId: string) => {
    setReqBusy(regId); setReqError("");
    const res = await approveRegistration(regId);
    setReqBusy(null);
    if (res.ok === false) { setReqError(res.error); return; }
    setReqStates(s => ({ ...s, [regId]: "accepted" }));
    if (landlordId) refreshLandlordData(landlordId);
  };
  const handleReject = async (regId: string) => {
    setReqBusy(regId); setReqError("");
    const res = await rejectRegistration(regId);
    setReqBusy(null);
    if (res.ok === false) { setReqError(res.error); return; }
    setReqStates(s => ({ ...s, [regId]: "rejected" }));
    if (landlordId) refreshLandlordData(landlordId);
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // 8 summary cards — real occupancy data once `stats` resolves (see effect above)
  const summaryCards = [
    { label: "Total Rooms",       value: String(stats?.totalRooms ?? 0),                    Icon: Layers,      color: "#9772F6", bg: "#F5F0FF" },
    { label: "Current Occupants", value: String(stats?.currentOccupants ?? 0),               Icon: Users,       color: "#3B82F6", bg: "#EFF6FF" },
    { label: "Available Beds",    value: String(stats?.availableBeds ?? 0),                  Icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7" },
    { label: "Total Capacity",    value: String(stats?.totalCapacity ?? 0),                  Icon: Building2,   color: "#6366F1", bg: "#EEF2FF" },
    { label: "Fully Occupied",    value: String(stats?.fullyOccupiedRooms ?? 0),              Icon: AlertCircle, color: "#EF4444", bg: "#FEE2E2" },
    { label: "Available Rooms",   value: String(stats?.availableRooms ?? 0),                  Icon: DoorOpen,    color: "#10B981", bg: "#D1FAE5" },
    { label: "Pending Requests",  value: String(stats?.pendingRequests ?? 0),                 Icon: Hourglass,   color: "#F59E0B", bg: "#FEF3C7" },
    { label: "Occupancy Rate",    value: `${stats?.occupancyRate ?? 0}%`,                     Icon: BarChart2,   color: "#8B5CF6", bg: "#EDE9FE" },
  ];

  const yearLabel = (y: number | null) => y ? `${y}${y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year` : "—";
  const [reviewingRequest, setReviewingRequest] = useState<PendingRegistration | null>(null);
  // Opened from a "New Registration Request" notification tap — the actual functional fix:
  // this opens the full review modal (not just a scroll+highlight) the moment the matching
  // request shows up in pendingRegs. That data loads asynchronously (a separate effect, after
  // the session resolves), so this re-checks every time pendingRegs changes rather than once.
  useEffect(() => {
    if (pendingDeepLink?.type !== "verification" || !pendingDeepLink.relatedId) return;
    const match = pendingRegs.find(r => r.id === pendingDeepLink.relatedId);
    if (match) { setReviewingRequest(match); onDeepLinkConsumed?.(); }
  }, [pendingDeepLink, pendingRegs, onDeepLinkConsumed]);

  // Friendly day label for an activity's timestamp — "Today"/"Yesterday" for the near
  // term, an actual date beyond that, so the modal's date-grouping headers stay real
  // once history spans more than one day (see remoteActivities below).
  const dayLabel = (ts: number) => {
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(ts))) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  // In-memory only (not persisted), gains a row when addActivity fires from a genuine
  // landlord-side action (currently: Highlights create/edit/delete) — so it resets on
  // reload, but is merged below with remoteActivities (real, persisted student/parent
  // events — payments, check-ins/outs) into one combined feed.
  type ActivityItem = { role: string; msg: string; time: string; date: string; ts: number; Icon: React.ElementType; color: string; bar: string };
  const [allActivities, setAllActivities] = useState<ActivityItem[]>([]);
  const addActivity = (msg: string, Icon: React.ElementType) => {
    const now = Date.now();
    const t = new Date(now).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    setAllActivities(prev => [{ role:"landlord", msg, time:t, date:"Today", ts:now, Icon: Icon as typeof Layers, color:"#9772F6", bar:"#9772F6" }, ...prev]);
  };

  // Real check-ins/check-outs and payment submissions from every student (or their
  // linked parent) across this landlord's boarding houses — replaces what used to be a
  // feed that could only ever show the landlord's own Highlights edits, never anything
  // a student/parent actually did.
  const [remoteActivities, setRemoteActivities] = useState<ActivityItem[]>([]);
  useEffect(() => {
    if (role !== "landlord" || !landlordId) return;
    let active = true;
    Promise.all([
      getCheckInOutActivityForLandlord(landlordId),
      getPaymentActivityForLandlord(landlordId),
    ]).then(([checkins, payments]) => {
      if (!active) return;
      const ciItems: ActivityItem[] = checkins.map(c => {
        const ts = new Date(c.occurredAt).getTime();
        return {
          role: "student",
          msg: `${c.studentName} checked ${c.type === "checkin" ? "in" : "out"}.`,
          time: new Date(ts).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
          date: dayLabel(ts), ts,
          Icon: c.type === "checkin" ? LogIn : LogOut,
          color: c.type === "checkin" ? "#16A34A" : "#D97706",
          bar: c.type === "checkin" ? "#16A34A" : "#D97706",
        };
      });
      const payItems: ActivityItem[] = payments.map(p => {
        const ts = new Date(p.submittedAt).getTime();
        const who = p.submittedByRole === "parent" ? `${p.studentName}'s parent` : p.studentName;
        return {
          role: p.submittedByRole,
          msg: `${who} submitted a payment for ${p.billLabel} (₱${p.amount.toLocaleString()}).`,
          time: new Date(ts).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
          date: dayLabel(ts), ts,
          Icon: CreditCard, color: "#3B82F6", bar: "#3B82F6",
        };
      });
      setRemoteActivities([...ciItems, ...payItems].sort((a, b) => b.ts - a.ts));
    });
    return () => { active = false; };
  }, [role, landlordId]);
  const combinedActivities = [...allActivities, ...remoteActivities].sort((a, b) => b.ts - a.ts);
  const [hlItems, setHlItems] = useState<Highlight[]>([]);
  const refreshHighlights = () => { getMyHighlights().then(setHlItems); };
  useEffect(() => {
    if (role !== "landlord" || !landlordId) return;
    refreshHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, landlordId]);
  const filtered = activityFilter === "all" ? combinedActivities : combinedActivities.filter(a => a.role === activityFilter);

  const quickActions = [
    { Icon: Users,       label: "View Occupants", color: "#9772F6", bg: "#F5F0FF",  action: () => go("occupants")  },
    { Icon: Layers,      label: "Manage Rooms",   color: "#3B82F6", bg: "#EFF6FF",  action: () => go("rooms")      },
    { Icon: MapPin,      label: "BH on Map",      color: "#16A34A", bg: "#DCFCE7",  action: () => go("map")        },
    { Icon: Megaphone,   label: "Announce",       color: "#D97706", bg: "#FEF3C7",  action: () => {}               },
    { Icon: Calendar,   label: "Home Visit",      color: "#8B5CF6", bg: "#EDE9FE",  action: () => go("homeVisit")  },
    { Icon: Settings,    label: "Settings",       color: "#6B7280", bg: "#F3F4F6",  action: () => go("settings")   },
  ];

  // visitor helpers
  const vStatusMeta = (s: "inside"|"left") => s === "inside"
    ? { label: "Inside", color: "#3B82F6", bg: "#EFF6FF" }
    : { label: "Left",   color: "#6B7280", bg: "#F3F4F6" };

  const confirmLeft = (id: string) => {
    const record = visitors.find(v => v.id === id);
    const t = new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
    // Optimistic first — the request goes out in the background; if it fails,
    // refreshLandlordData below re-syncs from the real rows.
    setVisitors(vs => vs.map(v => v.id === id ? { ...v, status: "left", timeOut: t } : v));
    markVisitorLeftApi(id).then(res => {
      if (res.ok === false) { if (landlordId) refreshLandlordData(landlordId); return; }
      // A separate notification from "New Visitor Logged" — this one goes the other
      // direction (landlord → student + their linked parents), fired only once the
      // landlord's own mark-as-left action actually succeeds.
      if (record?.studentId) {
        const desc = `${record.visitorName || "Your visitor"} has left${record.room ? ` (${record.room})` : ""}.`;
        addNotification({ userId: record.studentId, type: "visitor", title: "Visitor Has Left", description: desc, destination: "dashboard", relatedId: id });
        notifyLinkedParents(record.studentId, { type: "visitor", title: "Visitor Has Left", description: desc, destination: "dashboard", relatedId: id });
      }
    });
  };

  // v.date is a local "YYYY-MM-DD" (see visitorStore.toLocalISODate) — days-between
  // compares two such calendar-date strings via Date.UTC on their own Y/M/D parts, which
  // sidesteps the DST/timezone-shift issues a raw millisecond subtraction would risk while
  // still avoiding the `.toISOString()`-is-UTC trap this session found and fixed elsewhere.
  const daysBetween = (a: string, b: string) => {
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
  };
  const vToday = toLocalISODate(new Date());

  const filteredVisitors = visitors.filter(v => {
    const q = visitorSearch.toLowerCase();
    const matchQ = !q || (v.visitorName ?? "").toLowerCase().includes(q) || v.studentName.toLowerCase().includes(q);
    const matchF =
      visitorFilter === "all"    ? true :
      visitorFilter === "today"  ? v.date === vToday :
      visitorFilter === "week"   ? daysBetween(v.date, vToday) < 7 :
      visitorFilter === "month"  ? v.date.slice(0, 7) === vToday.slice(0, 7) :
      visitorFilter === "inside" ? v.status === "inside" :
      visitorFilter === "left"   ? v.status === "left" : true;
    return matchQ && matchF;
  }).sort((a, b) => visitorSort === "oldest" ? a.ts - b.ts : b.ts - a.ts);

  const vSummary = {
    today: visitors.filter(v => v.date === vToday).length,
    week:  visitors.filter(v => daysBetween(v.date, vToday) < 7).length,
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
                  {notifCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#EF4444", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{fmtBadgeCount(notifCount)}</span>}
                </button>
                <button onClick={() => go("messages")} style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,.14)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                  <MessageCircle size={20} color="white" />
                  {chatCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#22C55E", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{fmtBadgeCount(chatCount)}</span>}
                </button>
              </div>
            </div>
            {/* Welcome */}
            <div style={{ padding: "6px 16px 20px" }}>
              <p style={{ color: "rgba(255,255,255,.65)", fontSize: 11, margin: "0 0 2px", fontFamily: IN }}>{dateStr}</p>
              <p style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 1px", fontFamily: QS }}>{greeting}!</p>
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
              {notifCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#EF4444", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{fmtBadgeCount(notifCount)}</span>}
            </button>
            <button onClick={() => go("messages")} style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,.14)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
              <MessageCircle size={20} color="white" />
              {chatCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#22C55E", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{fmtBadgeCount(chatCount)}</span>}
            </button>
          </div>
        </div>

        {/* Welcome banner */}
        <div style={{ padding: "6px 16px 20px" }}>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 11, margin: "0 0 2px", fontFamily: IN }}>{dateStr}</p>
          <p style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 1px", fontFamily: QS }}>{greeting}{landlordName ? `, ${landlordName}` : ""}!</p>
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
              const pct = stats?.occupancyRate ?? 0;
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
            onAdd={async h => { const res = await createHighlight(h); if (res.ok === false) { console.error("createHighlight:", res.error); return; } refreshHighlights(); }}
            onEdit={async h => { const res = await updateHighlight(h); if (res.ok === false) { console.error("updateHighlight:", res.error); return; } refreshHighlights(); }}
            onDelete={async id => { const res = await deleteHighlight(id); if (res.ok === false) { console.error("deleteHighlight:", res.error); return; } refreshHighlights(); }}
            onActivity={addActivity}
          />
        )}

        {/* ── RESERVATION REQUESTS ─────────────────────────────────────────── */}
        <div ref={reservationRequestsRef} style={{ padding: "0 16px 0" }}>
          <SH title="Reservation Requests" action={`View All (${pendingRegs.length})`} onAction={() => go("occupants")} />
          {reqError && (
            <div style={{ background: "#FEF2F2", borderRadius: 14, padding: "10px 14px", marginBottom: 10, border: "1px solid #FECACA" }}>
              <span style={{ fontSize: 11, color: "#DC2626", fontFamily: IN }}>{reqError}</span>
            </div>
          )}
          <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 20 }}>
            {pendingRegs.length === 0 && (
              <div style={{ padding: "22px 16px", textAlign: "center" as const }}>
                <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>No pending reservation requests.</span>
              </div>
            )}
            {pendingRegs.map((r, i) => {
              const st = reqStates[r.id] ?? "pending";
              const busy = reqBusy === r.id;
              const isHighlighted = r.id === highlightedRequestId;
              return (
                <div key={r.id} style={{
                  padding: "14px 16px", borderBottom: i < pendingRegs.length - 1 ? "1px solid #F3F4F6" : "none",
                  background: isHighlighted ? "#F5F0FF" : "transparent",
                  boxShadow: isHighlighted ? "inset 3px 0 0 #9772F6" : "none",
                  transition: "background .5s ease",
                }}>
                  {/* Tapping the request itself opens the full review — everything the student
                      actually submitted (dates, personality, hobbies, lifestyle, notes), not just
                      this name/room summary — so accepting/rejecting is an informed decision. */}
                  <button onClick={() => setReviewingRequest(r)} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" as const }}>
                    <div style={{ width: 38, height: 38, borderRadius: 13, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <User size={17} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: QS }}>{r.studentName}</p>
                        {st !== "pending" && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: st === "accepted" ? "#DCFCE7" : "#FEE2E2", color: st === "accepted" ? "#16A34A" : "#EF4444", fontFamily: QS }}>{st === "accepted" ? "Accepted" : "Rejected"}</span>}
                      </div>
                      <p style={{ fontSize: 10, color: "#9CA3AF", margin: 0, fontFamily: IN }}>{r.studentIdNo} · {r.program ?? "—"} · {yearLabel(r.yearLevel)}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: "#F5F0FF", color: "#9772F6", fontFamily: QS, flexShrink: 0 }}>{r.roomName}</span>
                    <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                  </button>
                  {st === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleAccept(r.id)} disabled={busy} style={{ flex: 1, padding: "9px 0", borderRadius: 12, background: "#DCFCE7", color: "#16A34A", fontSize: 12, fontWeight: 800, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Check size={13}/> {busy ? "Working…" : "Accept"}</button>
                      <button onClick={() => handleReject(r.id)} disabled={busy} style={{ flex: 1, padding: "9px 0", borderRadius: 12, background: "#FEE2E2", color: "#EF4444", fontSize: 12, fontWeight: 800, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><X size={13}/> Reject</button>
                      <button onClick={() => setReviewingRequest(r)} style={{ width: 38, padding: "9px 0", borderRadius: 12, background: "#EFF6FF", color: "#3B82F6", fontSize: 12, fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Review full request">
                        <Eye size={14} color="#3B82F6" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── REVIEW REQUEST MODAL ─────────────────────────────────────────── */}
        {reviewingRequest && (() => {
          const r = reviewingRequest;
          const st = reqStates[r.id] ?? "pending";
          const busy = reqBusy === r.id;
          const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
          const tagGroups: [string, string[]][] = [["Personality Traits", r.traits], ["Hobbies & Interests", r.hobbies], ["Lifestyle", r.lifestyle]];
          return (
            <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 500, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={() => setReviewingRequest(null)}>
              <div style={{ background: "#F7F8FC", borderRadius: "28px 28px 0 0", maxHeight: "88%", display: "flex", flexDirection: "column" as const }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
                <div style={{ background: "white", borderRadius: "28px 28px 0 0", padding: "12px 18px 14px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 15, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={20} color="white" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{r.studentName}</p>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: st === "pending" ? "#FEF3C7" : st === "accepted" ? "#DCFCE7" : "#FEE2E2", color: st === "pending" ? "#D97706" : st === "accepted" ? "#16A34A" : "#EF4444", fontFamily: QS }}>{st === "pending" ? "Pending" : st === "accepted" ? "Accepted" : "Rejected"}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{r.studentIdNo} · {r.program ?? "—"} · {yearLabel(r.yearLevel)}</p>
                  </div>
                  <button onClick={() => setReviewingRequest(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <X size={15} color="#6B7280" />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "14px 18px 36px" }}>
                  {/* Contact */}
                  {(r.contact || r.address) && (
                    <div style={{ background: "white", borderRadius: 16, padding: "12px 14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const }}>Contact</p>
                      {r.contact && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: r.address ? 6 : 0 }}><Phone size={12} color="#9772F6" /><span style={{ fontSize: 12, color: "#374151", fontFamily: IN }}>{r.contact}</span></div>}
                      {r.address && <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}><MapPin size={12} color="#9772F6" style={{ marginTop: 1, flexShrink: 0 }} /><span style={{ fontSize: 12, color: "#374151", fontFamily: IN, lineHeight: 1.5 }}>{r.address}</span></div>}
                    </div>
                  )}

                  {/* Requested room / stay */}
                  <div style={{ background: "white", borderRadius: 16, padding: "12px 14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([
                      ["Boarding House", r.boardingHouseName],
                      ["Room / Bed", `${r.roomName} · ${r.bedLabel}`],
                      ["Move-in Date", fmtDate(r.moveIn)],
                      ["Move-out Date", fmtDate(r.moveOut)],
                      ["Length of Stay", `${r.stayCount} ${r.stayUnit}`],
                      ["Submitted", fmtDate(r.submittedAt)],
                    ] as [string, string][]).map(([l, v]) => (
                      <div key={l}>
                        <p style={{ margin: "0 0 1px", fontSize: 9, color: "#9CA3AF", fontFamily: QS, fontWeight: 700, textTransform: "uppercase" as const }}>{l}</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Personality / hobbies / lifestyle — only sections the student actually filled in */}
                  {tagGroups.filter(([, tags]) => tags.length > 0).map(([label, tags]) => (
                    <div key={label} style={{ background: "white", borderRadius: 16, padding: "12px 14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const }}>{label}</p>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                        {tags.map(t => (
                          <span key={t} style={{ fontSize: 11, fontWeight: 700, color: "#7549F6", background: "#F5F0FF", borderRadius: 10, padding: "5px 10px", fontFamily: QS }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Notes */}
                  {r.notes && (
                    <div style={{ background: "white", borderRadius: 16, padding: "12px 14px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
                      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const }}>Additional Notes</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#374151", fontFamily: IN, lineHeight: 1.7 }}>{r.notes}</p>
                    </div>
                  )}

                  {reqError && (
                    <div style={{ background: "#FEF2F2", borderRadius: 14, padding: "10px 14px", marginBottom: 12, border: "1px solid #FECACA" }}>
                      <span style={{ fontSize: 11, color: "#DC2626", fontFamily: IN }}>{reqError}</span>
                    </div>
                  )}

                  {st === "pending" && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={async () => { await handleAccept(r.id); setReviewingRequest(null); }} disabled={busy} style={{ flex: 1, height: 48, borderRadius: 16, background: "#DCFCE7", color: "#16A34A", fontSize: 13, fontWeight: 800, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={15} /> {busy ? "Working…" : "Accept"}</button>
                      <button onClick={async () => { await handleReject(r.id); setReviewingRequest(null); }} disabled={busy} style={{ flex: 1, height: 48, borderRadius: 16, background: "#FEE2E2", color: "#EF4444", fontSize: 13, fontWeight: 800, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><X size={15} /> Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── VISITOR RECORDS (compact logbook card) ───────────────────────── */}
        {visitorEnabled && (
          <div style={{ padding: "0 16px 0" }}>
            <p style={{ color: "#1F2937", fontSize: 14, fontWeight: 800, margin: 0, fontFamily: QS }}>Visitor Records</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "2px 0 12px", fontFamily: IN }}>Student-submitted visitor records</p>
            <div style={{ background: "white", borderRadius: 20, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,.05)", marginBottom: 20 }}>
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
              <button onClick={() => setShowVisitorModal(true)} style={{ width: "100%", padding: "12px 0", borderRadius: 14, backgroundImage: GRAD, color: "white", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(151,114,246,.3)" }}>
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
          // Resolved (and closed, which only admin ever sets) concerns don't sit in this
          // list at all anymore — they're "done", so they move into their own "Previous
          // Concerns" modal instead of crowding out what still needs attention here.
          const activeReports = studentReports.filter(r=>r.status!=="resolved" && r.status!=="closed");
          const resolvedReports = studentReports.filter(r=>r.status==="resolved" || r.status==="closed");
          const filtered2 = reportStatusFilter === "all" ? activeReports : activeReports.filter(r=>r.status===reportStatusFilter);
          const pendingCount = studentReports.filter(r=>r.status==="pending").length;

          const renderConcernCard = (r: StudentReport, onClick: () => void) => {
            const cm = CATEGORY_META[r.category];
            const sm = STATUS_META[r.status];
            return (
              <div key={r.id} onClick={onClick} style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", cursor:"pointer", borderLeft:`4px solid ${cm.color}` }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" as const }}>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS2, display:"flex", alignItems:"center", gap:3 }}>
                        <div style={{ width:4, height:4, borderRadius:"50%", background:sm.dot }}/>{sm.label}
                      </span>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS2 }}>{cm.label}</span>
                    </div>
                    <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS2, lineHeight:1.3 }}>{r.title}</p>
                    <p style={{ margin:"0 0 1px", fontSize:11, color:"#9CA3AF", fontFamily:IN2 }}>{r.studentName} · {r.roomNumber}</p>
                    <p style={{ margin:0, fontSize:10, color:"#C4C9D4", fontFamily:IN2 }}>{r.dateSubmitted}</p>
                    {/* No response/comment preview on the card itself anymore — that only
                        shows once the concern is actually opened (see the detail panel's
                        "Your Response" / "Student's Comment" cards below). */}
                  </div>
                  <div style={{ fontSize:14, color:"#D1D5DB" }}>›</div>
                </div>
              </div>
            );
          };

          // Nothing reaches the student until "Confirm Update" is pressed. Tapping a status
          // pill only stages a local choice (pendingStatusChoice) and highlights it — it does
          // NOT call the server, so an accidental tap can't silently notify the student with
          // no message attached. Confirm Update is the single action that actually sends: the
          // staged status change (or the report's current status, if the landlord only typed a
          // message without touching the pills) plus whatever response text is in the box —
          // works with either one present, or both.
          const handleConfirmUpdate = async (id: string) => {
            const report = studentReports.find(r=>r.id===id);
            if (!report) return;
            const status = pendingStatusChoice ?? (report.status === "pending" ? "in-progress" : report.status);
            const response = reportResponseText.trim() || undefined;
            // Optimistic update so the list reflects the change the instant it's confirmed,
            // rather than waiting on the round-trip. Rolled back below on failure.
            setStudentReports(prev => prev.map(rr => rr.id === id ? { ...rr, status } : rr));
            const res = await respondToReport(id, status, response);
            if (res.ok === false) {
              console.error("respondToReport failed:", res.error);
              setStudentReports(prev => prev.map(rr => rr.id === id ? report : rr));
              return;
            }
            if (landlordId) refreshLandlordData(landlordId);
            const title = status === "resolved" ? "Report Resolved" : response ? "Landlord Responded" : "Report Status Updated";
            const description = status === "resolved"
              ? `Your concern "${report.title}" has been marked as resolved.`
              : response
              ? `Your landlord responded to "${report.title}".`
              : `Your concern "${report.title}" is now ${STATUS_META[status].label}.`;
            addNotification({ userId: report.submitterId, type: "report", title, description, destination: "dashboard", relatedId: id });
            notifyLinkedParents(report.submitterId, { type: "report", title, description: `${report.studentName}'s concern "${report.title}" — ${STATUS_META[status].label.toLowerCase()}.`, destination: "dashboard", relatedId: id });
            setSelectedStudentReport(null);
            setReportResponseText("");
            setPendingStatusChoice(null);
          };

          return (
            <div style={{ padding: "0 16px 0" }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS2 }}>Student Concerns</p>
                  {pendingCount>0 && <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"#FEE2E2", color:"#EF4444", fontFamily:QS2 }}>{pendingCount} pending</span>}
                </div>
                <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"#F5F0FF", color:"#9772F6", fontFamily:QS2 }}>{activeReports.length} total</span>
              </div>
              {/* Status filters — "resolved" and "closed" are both deliberately left out:
                  resolved concerns no longer sit in this list at all (see Previous Concerns
                  below), and closed was never a status the landlord can set to begin with
                  (see the Update Status buttons below) — so this row only offers the
                  statuses their own clicks can actually produce. */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:12 }}>
                <div style={{ display:"flex", gap:6, overflowX:"auto" as const, scrollbarWidth:"none" as const }}>
                  {(["all","pending","in-progress"] as const).map(s=>(
                    <button key={s} onClick={()=>setReportStatusFilter(s)} style={{ flexShrink:0, padding:"5px 13px", borderRadius:20, border:"none", cursor:"pointer", fontSize:10, fontWeight:800, fontFamily:QS2,
                      background: reportStatusFilter===s ? GRAD2 : "white",
                      color: reportStatusFilter===s ? "white" : "#6B7280",
                      boxShadow: reportStatusFilter===s ? "0 2px 8px rgba(151,114,246,.25)" : "0 1px 4px rgba(0,0,0,.06)",
                    }}>{s==="all"?"All":s==="in-progress"?"In Progress":s.charAt(0).toUpperCase()+s.slice(1)}</button>
                  ))}
                </div>
                {resolvedReports.length>0 && (
                  <button onClick={()=>setShowResolvedConcerns(true)} style={{ flexShrink:0, fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS2, padding:0 }}>Previous Concerns</button>
                )}
              </div>
              {filtered2.length===0 ? (
                <div style={{ background:"white", borderRadius:18, padding:"24px 16px", textAlign:"center" as const, boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
                  <p style={{ margin:0, fontSize:13, color:"#9CA3AF", fontFamily:IN2 }}>No concerns in this category</p>
                </div>
              ) : (
                <>
                  <div style={{ display:"flex", flexDirection:"column" as const, gap:10, marginBottom: filtered2.length>3 ? 4 : 16 }}>
                    {filtered2.slice(0,3).map(r=>renderConcernCard(r, ()=>{ setSelectedStudentReport(r); setReportResponseText(""); setPendingStatusChoice(null); }))}
                  </div>
                  {/* Only the 3 most recent (filtered2 is already newest-first, from
                      getReportsForLandlord's own ordering) show directly — "View All"
                      opens the rest in a modal, same pattern as Previous Concerns below. */}
                  {filtered2.length>3 && (
                    <button onClick={()=>setShowAllActiveConcerns(true)} style={{ width:"100%", padding:"11px 0", borderRadius:14, background:"#F3F4F6", border:"none", cursor:"pointer", fontSize:12, fontWeight:800, color:"#9772F6", fontFamily:QS2, marginBottom:16 }}>
                      View All ({filtered2.length})
                    </button>
                  )}
                </>
              )}
              {showAllActiveConcerns && (
                <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowAllActiveConcerns(false)}>
                  <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
                    <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div>
                        <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS2 }}>Student Concerns</p>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN2 }}>{filtered2.length} total</p>
                      </div>
                      <button onClick={()=>setShowAllActiveConcerns(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <X size={15} color="#6B7280"/>
                      </button>
                    </div>
                    <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 20px 24px", display:"flex", flexDirection:"column" as const, gap:10 }}>
                      {filtered2.map(r=>renderConcernCard(r, ()=>{ setShowAllActiveConcerns(false); setSelectedStudentReport(r); setReportResponseText(""); setPendingStatusChoice(null); }))}
                    </div>
                  </div>
                </div>
              )}
              {showResolvedConcerns && (
                <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowResolvedConcerns(false)}>
                  <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
                    <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div>
                        <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS2 }}>Previous Concerns</p>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN2 }}>{resolvedReports.length} total</p>
                      </div>
                      <button onClick={()=>setShowResolvedConcerns(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <X size={15} color="#6B7280"/>
                      </button>
                    </div>
                    <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 20px 24px", display:"flex", flexDirection:"column" as const, gap:10 }}>
                      {resolvedReports.map(r=>renderConcernCard(r, ()=>{ setShowResolvedConcerns(false); setSelectedStudentReport(r); setReportResponseText(""); setPendingStatusChoice(null); }))}
                    </div>
                  </div>
                </div>
              )}
              {/* Report Detail Panel */}
              {selectedStudentReport && (()=>{
                const r = selectedStudentReport;
                const cm = CATEGORY_META[r.category];
                const sm = STATUS_META[r.status];
                return (
                  <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:500, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setSelectedStudentReport(null)}>
                    <div style={{ background:"#F7F8FC", borderRadius:"28px 28px 0 0", maxHeight:"90%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
                      <div style={{ padding:"12px 56px 14px", position:"relative" as const, display:"flex", flexDirection:"column" as const, alignItems:"center" }}>
                        <div onClick={()=>setSelectedStudentReport(null)} style={{ position:"absolute" as const, left:18, top:12, width:34, height:34, borderRadius:11, background:"#F3F4F6", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</div>
                        <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS2, lineHeight:1.3, textAlign:"center" as const }}>{r.title}</p>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const, justifyContent:"center", marginTop:6 }}>
                          <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS2 }}>{sm.label}</span>
                          <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS2 }}>{cm.label}</span>
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
                        {/* Photos */}
                        {r.imageUrls.length>0 && (
                          <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                            <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS2, textTransform:"uppercase" as const }}>Photos ({r.imageUrls.length})</p>
                            <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
                              {r.imageUrls.map((url,i)=>(
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ width:80, height:70, borderRadius:13, overflow:"hidden", display:"block" }}>
                                  <img src={url} alt={`Attachment ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" as const, display:"block" }}/>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Your (the landlord's) latest response, if any — same green "here's
                            what was said" treatment StudentHome.tsx gives this on the
                            student's side, so it reads the same way for both parties. */}
                        {r.landlordResponse && (
                          <div style={{ background:"#F0FDF4", borderRadius:16, padding:"12px 14px", marginBottom:12, border:"1px solid #BBF7D0" }}>
                            <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:"#16A34A", fontFamily:QS2, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Your Response</p>
                            <p style={{ margin:"0 0 4px", fontSize:12, color:"#15803D", fontFamily:IN2, lineHeight:1.6 }}>{r.landlordResponse}</p>
                            <p style={{ margin:0, fontSize:9, color:"#86EFAC", fontFamily:IN2 }}>{r.landlordResponseDate}</p>
                          </div>
                        )}
                        {/* Student's follow-up comment, if any */}
                        {r.studentComment && (
                          <div style={{ background:"#F5F0FF", borderRadius:16, padding:"12px 14px", marginBottom:12, border:"1px solid #DDD6FE" }}>
                            <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:"#7C3AED", fontFamily:QS2, textTransform:"uppercase" as const }}>Student's Comment</p>
                            <p style={{ margin:"0 0 4px", fontSize:12, color:"#5B21B6", fontFamily:IN2, lineHeight:1.6 }}>{r.studentComment}</p>
                            <p style={{ margin:0, fontSize:9, color:"#C4B5FD", fontFamily:IN2 }}>{r.studentCommentDate}</p>
                          </div>
                        )}
                        {/* Update status — "closed" is intentionally not an option here:
                            it's an admin-only archive action (see AdminReports.tsx, where the
                            same value is literally labeled "Archived"). For the landlord,
                            "Resolved" is the one determining factor that a concern is done. */}
                        <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                          <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS2, textTransform:"uppercase" as const }}>Update Status</p>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, marginBottom:12 }}>
                            {(["in-progress","resolved"] as ReportStatus[]).map(s=>{
                              const ssm = STATUS_META[s];
                              // Reflects the staged pick if the landlord has tapped one this
                              // session, otherwise falls back to the report's real current
                              // status — tapping only stages the choice locally (highlighted
                              // instantly) and does NOT notify the student by itself.
                              const selected = (pendingStatusChoice ?? r.status) === s;
                              return (
                                <button key={s} onClick={()=>setPendingStatusChoice(s)} style={{ padding:"7px 14px", borderRadius:14, border:`2px solid ${selected?ssm.color:"#E5E7EB"}`, background:selected?ssm.bg:"white", color:selected?ssm.color:"#6B7280", fontSize:11, fontWeight:800, fontFamily:QS2, cursor:"pointer" }}>
                                  {s==="in-progress"?"In Progress":s.charAt(0).toUpperCase()+s.slice(1)}
                                </button>
                              );
                            })}
                          </div>
                          <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS2 }}>{r.landlordResponse ? "Send a New Response" : "Your Response"}</p>
                          <div style={{ background:"#F9FAFB", borderRadius:11, padding:"9px 12px", border:"1.5px solid #E5E7EB", marginBottom:9 }}>
                            <textarea value={reportResponseText} onChange={e=>setReportResponseText(e.target.value)} placeholder="Write your response to the student..." rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:12, fontFamily:IN2, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
                          </div>
                          {/* Single action for both: sends the staged status pick above (or
                              the report's unchanged status, if none was tapped) together with
                              whatever's in the response box — a message, a status change, or
                              both. Nothing above this button reaches the student on its own.
                              Only appears once there's actually something to send, so it isn't
                              sitting there inviting a no-op tap. */}
                          {(reportResponseText.trim() !== "" || pendingStatusChoice !== null) && (
                            <button onClick={()=>handleConfirmUpdate(r.id)} style={{ width:"100%", height:44, borderRadius:16, backgroundImage:GRAD2, border:"none", cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS2, boxShadow:"0 4px 14px rgba(151,114,246,.3)" }}>
                              Confirm Update
                            </button>
                          )}
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
            {filtered.length === 0 && (
              <div style={{ padding: "22px 16px", textAlign: "center" as const }}>
                <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>No recent activity yet.</span>
              </div>
            )}
            {filtered.slice(0, 5).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 0, padding: "12px 0 12px 0", borderBottom: i < Math.min(filtered.length, 5) - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10, flex: 1, padding: "0 14px" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 11, background: a.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <a.Icon size={15} color={a.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      {rolePill(a.role)}
                      <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{timeAgo(a.ts)}</span>
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
        // remoteActivities carries real, differently-dated history (payments/check-ins/
        // outs from any day), so this filters on the actual timestamp rather than the
        // old literal-"Today"-string check that only ever matched addActivity's own rows.
        const dateOk = (ts: number) => {
          if (activityDateFilter === "all") return true;
          const diffDays = (Date.now() - ts) / 86400000;
          if (activityDateFilter === "today") return dayLabel(ts) === "Today";
          if (activityDateFilter === "week") return diffDays <= 7;
          return diffDays <= 31; // month
        };
        const modalFiltered = combinedActivities.filter(a =>
          (activityFilter === "all" || a.role === activityFilter) && dateOk(a.ts)
        );
        // group by date, most-recent group first (by each group's newest entry, not
        // string order — "Today"/"Yesterday" labels don't sort alphabetically right)
        const groups: Record<string, typeof combinedActivities> = {};
        modalFiltered.forEach(a => {
          if (!groups[a.date]) groups[a.date] = [];
          groups[a.date].push(a);
        });
        const dates = Object.keys(groups).sort((x, y) => groups[y][0].ts - groups[x][0].ts);

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
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
                    <button key={d.id} onClick={() => setActivityDateFilter(d.id)} style={{ flex: 1, height: 30, padding: "0 6px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: QS,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: activityDateFilter === d.id ? "#BF5DC7" : "#F3F4F6",
                      color: activityDateFilter === d.id ? "white" : "#6B7280",
                      boxShadow: activityDateFilter === d.id ? "0 2px 8px rgba(191,93,199,.25)" : "none",
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
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", fontFamily: QS, flexShrink: 0 }}>{date}</span>
                      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                    </div>
                    <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.04)", marginBottom: 14 }}>
                      {groups[date].map((a, i) => (
                        <div key={i} style={{ display: "flex", gap: 0, padding: "11px 0", borderBottom: i < groups[date].length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
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
                const isHighlighted = v.id === highlightedVisitorId;
                return (
                  <div key={v.id} ref={isHighlighted ? (el => el?.scrollIntoView({ behavior: "smooth", block: "center" })) : undefined} style={{
                    background: "white", borderRadius: 18, padding: "14px 16px", marginBottom: 10,
                    boxShadow: isHighlighted ? "0 2px 8px rgba(0,0,0,.04), inset 0 0 0 2px #9772F6" : "0 2px 8px rgba(0,0,0,.04)",
                    transition: "box-shadow .5s ease",
                  }}>
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
                      {/* No manually-entered "Visit Date" field anymore — the date shown is
                          always the real moment this record was logged (loggedLabel(v.ts):
                          "Today"/"Yesterday"/"N days ago", or the real date past a week). */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                        <Clock size={10} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 9, color: "#C4C9D4", margin: 0, fontFamily: IN }}>Logged</p>
                          <p style={{ fontSize: 10, color: "#374151", fontWeight: 600, margin: 0, fontFamily: IN }}>{loggedLabel(v.ts)} · {v.timeIn ?? "—"}</p>
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

    </div>
  );
}

// ── ROOMS ─────────────────────────────────────────────────────────────────────

function RoomsScreen({ go, role = "landlord" }: { go: (s: Screen) => void; role?: Role }) {
  const QS = "'Quicksand',sans-serif";
  const [bhName, setBhName] = useState("");
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (active) setLoaded(true); return; }
      const bhs = await getBoardingHousesForLandlord(session.user.id);
      if (!active) return;
      setBhName(bhs[0]?.name ?? "");
      setRooms(bhs[0]?.rooms ?? []);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "52px 20px 20px", backgroundImage: GRAD_H, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center" }}><ChevronLeft size={24} /></button>
        <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "0 0 4px", fontFamily: QS }}>Room Management</h1>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, margin: 0 }}>{bhName || "—"} · {rooms.length} room{rooms.length === 1 ? "" : "s"}</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 16px 0" }}>
        <button style={{ width: "100%", padding: "13px 0", borderRadius: 16, backgroundImage: GRAD, color: "white", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, marginBottom: 16, boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>+ Add New Room</button>
        {loaded && rooms.length === 0 && (
          <div style={{ background: "white", borderRadius: 20, padding: "28px 20px", textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", margin: 0, fontFamily: QS }}>No rooms yet.</p>
          </div>
        )}
        {rooms.map((r) => {
          const pct = Math.round((r.occ / r.cap) * 100);
          const full = r.occ >= r.cap;
          return (
            <div key={r.id} style={{ background: "white", borderRadius: 20, padding: 16, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{r.name}</span>
                    <span style={{ padding: "2px 10px", borderRadius: 20, background: full ? "#FEE2E2" : "#DCFCE7", color: full ? "#EF4444" : "#16A34A", fontSize: 10, fontWeight: 800 }}>{full ? "Full" : `${r.cap - r.occ} slots`}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{r.description}</p>
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
              {/* Occupants — populated once real bed assignments exist */}
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
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
        <button onClick={() => go("dashboard")} style={{ position: "absolute", top: 56, left: 20, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4 }}><ChevronLeft size={20} color="white" /></button>
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

function MapScreen({ go, role = "landlord" }: { go: (s: Screen) => void; role?: Role }) {
  const notifCount = useUnreadCount(role);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [zoom, setZoom] = useState(16);
  const mapRef = useRef<GoogleMapHandle>(null);

  // The landlord's own boarding house. Occupant location pins need real
  // check-in/GPS data (a later phase) — showing none is honest, not a gap.
  const [bh, setBh] = useState<BoardingHouse | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const bhs = await getBoardingHousesForLandlord(uid);
      if (active) setBh(bhs[0] ?? null);
    })();
    return () => { active = false; };
  }, []);
  const bhPos = { lat: bh?.lat ?? MAP_CENTER.lat, lng: bh?.lng ?? MAP_CENTER.lng };
  const markers: MapMarker[] = bh ? [
    {
      id: "bh", variant: "bh", position: bhPos, title: bh.name, zIndex: 10,
      infoContent: <MapInfoCard title={bh.name} subtitle={bh.address} rows={[["Landlord", bh.landlord], ["Contact", bh.contact ?? "—"]]} />,
    },
  ] : [];

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Real interactive Google Map */}
      <GoogleMapCanvas
        ref={mapRef}
        center={bhPos}
        zoom={zoom}
        mapType={mapType}
        onZoomChange={setZoom}
        markers={markers}
      />

      {/* Floating header */}
      <div style={{ position: "absolute", top: 50, left: 14, right: 14, zIndex: 30 }}>
        <div style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 22, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid rgba(255,255,255,0.9)" }}>
          <Search size={16} color="#9772F6" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#9CA3AF", flex: 1 }}>Search places, streets, barangay…</span>
          <button onClick={() => go("notifications")} style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", flexShrink: 0, position: "relative" }}>
            <Bell size={15} color="#9772F6" />
            {notifCount > 0 && <span style={{ position: "absolute", top: -3, right: -3, width: 13, height: 13, borderRadius: "50%", background: "#EF4444", color: "white", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{fmtBadgeCount(notifCount)}</span>}
          </button>
        </div>
      </div>

      {/* Map controls */}
      <div style={{ position: "absolute", top: 120, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 30 }}>
        {[
          { Ic: RefreshCcw, fn: () => mapRef.current?.recenter() },
          { Ic: Layers,     fn: () => setMapType(t => (t === "standard" ? "satellite" : "standard")) },
          { Ic: Navigation, fn: () => mapRef.current?.fitBounds(markers.map(m => m.position)) },
        ].map(({ Ic, fn }, i) => (
          <button key={i} onClick={fn} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.9)", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.12)" }}>
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
            <span style={{ fontWeight: 800, color: "#1F2937", fontSize: 14, fontFamily: "'Quicksand',sans-serif" }}>{bh?.name ?? "—"}</span>
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px 22px" }}>{bh?.address ?? "—"}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => mapRef.current?.recenter()} style={{ flex: 1, padding: "11px 0", borderRadius: 16, border: "2px solid #9772F6", color: "#9772F6", fontWeight: 800, fontSize: 12, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "'Quicksand',sans-serif" }}><Navigation size={13} />My Location</button>
            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${bhPos.lat},${bhPos.lng}`, "_blank", "noopener,noreferrer")} style={{ flex: 1, padding: "11px 0", borderRadius: 16, backgroundImage: "linear-gradient(135deg,#EC4899,#9772F6)", color: "white", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "'Quicksand',sans-serif" }}><MapPin size={13} />Directions</button>
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

function NotificationsScreen({ go, role, onOpenNotification }: {
  go: (s: Screen) => void; role: Role; onOpenNotification?: (n: AppNotification) => void;
}) {
  const list = useNotifications(role);

  // Opening this screen at all — not just tapping a specific card — is what should clear the
  // bell badge, same as most notification-center UIs. Fired once on mount regardless of the
  // current unread count (a no-op server-side if there's nothing unread).
  useEffect(() => { markAllRead(role); }, [role]);

  // markAllRead above flips every row's `read` state (and thus the badge) immediately, but the
  // "NEW" pill / highlighted background below should still reflect what was actually unread
  // when the user walked in — otherwise every card would flash to "read" the instant this
  // screen mounts, before they've seen any of them. Captured once, from the first non-empty
  // snapshot of `list` (it can still be loading in from the store on first render).
  const unreadAtOpenRef = useRef<Set<string> | null>(null);
  if (unreadAtOpenRef.current === null && list.length > 0) {
    unreadAtOpenRef.current = new Set(list.filter(n => !n.read).map(n => n.id));
  }
  // Whether a card was actually tapped (not just present on an opened page) is real,
  // persisted state now — n.opened, a separate column from n.read (see notificationStore) —
  // rather than component-local state, which used to get wiped every time this screen
  // unmounted (leave the page, come back) and silently turn every merely-seen card grey.
  const wasUnread = (id: string) => unreadAtOpenRef.current?.has(id) ?? false;

  const openNotification = (n: AppNotification) => {
    markNotificationRead(n.id);
    onOpenNotification?.(n);
    go(n.destination);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, padding: "56px 20px 16px", backgroundImage: GRAD_H }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4, flexShrink: 0 }}><ChevronLeft size={18} color="white" /></button>
            <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: "'Quicksand',sans-serif" }}>Notifications</h1>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 20px" }}>
        {list.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", textAlign: "center" }}>
            <Bell size={44} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <p style={{ fontWeight: 800, fontSize: 15, color: "#374151", margin: "0 0 4px", fontFamily: "'Quicksand',sans-serif" }}>No Notifications</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>You're all caught up.</p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
            {/* Every notification is its own clickable card, in three real, persisted states:
                 - "new"    (!read): purple tint + left bar + colored icon/pill + "NEW" pill —
                   frozen to what was actually unread when this screen was opened (wasUnread
                   above), so it doesn't flash to the next state mid-visit.
                 - "seen"   (read && !opened): the page has been opened since, so the highlight
                   is gone and it's back to a plain white card — but nothing has actually been
                   tapped yet, so the icon/pill keep their real type color, same as "new".
                 - "opened" (read && opened): this specific card was tapped into. Every colored
                   element — icon, its background, the type pill, the title — goes flat grey,
                   not just dimmed, same as StudentHome.tsx's read-announcement treatment.
                   `opened` is real DB state (notificationStore), not component state, so it
                   survives leaving this screen and coming back. */}
            {list.map((n, i) => {
              const meta = NOTIF_META[n.type];
              const isNew = wasUnread(n.id);
              const isOpened = !isNew && n.opened;
              const tinted = isNew || !n.opened; // "new" and "seen" both keep the real type color
              return (
                <div key={n.id} onClick={() => openNotification(n)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px 14px 13px", position: "relative", cursor: "pointer",
                    borderBottom: i < list.length - 1 ? "1px solid #F9FAFB" : "none",
                    background: isNew ? "#F5F0FF" : "white",
                    borderLeft: isNew ? "3px solid #9772F6" : "3px solid transparent",
                  }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: tinted ? meta.bg : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><meta.Icon size={17} color={tinted ? meta.color : "#9CA3AF"} /></div>
                  <div style={{ flex: 1, paddingRight: 16, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ fontSize: 13, fontWeight: isNew ? 800 : 700, color: isOpened ? "#9CA3AF" : "#1F2937", margin: 0, fontFamily: "'Quicksand',sans-serif" }}>{n.title}</p>
                      {isNew && <span style={{ fontSize: 8, fontWeight: 800, color: "white", background: "#9772F6", padding: "2px 7px", borderRadius: 20, fontFamily: "'Quicksand',sans-serif", letterSpacing: 0.3, flexShrink: 0 }}>NEW</span>}
                    </div>
                    {/* pre-line: some descriptions (e.g. a landlord's announcement with a
                        date/time attached) carry a blank-line-separated "Scheduled for…"
                        note — without this it collapses into one run-on sentence. */}
                    <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 4px", lineHeight: 1.5, whiteSpace: "pre-line" }}>{n.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: tinted ? meta.color : "#9CA3AF", background: tinted ? meta.bg : "#F3F4F6", padding: "2px 8px", borderRadius: 20, fontFamily: "'Quicksand',sans-serif" }}>{meta.label}</span>
                      <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, margin: 0 }}>{timeAgo(n.timestamp)}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0, marginTop: 12 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// The old generic mock ProfileScreen (fake "Juan Dela Cruz" fallback for the admin role) has been
// removed — its one call site now renders the real AdminProfileScreenFull, matching how landlord/
// student/parent already route to their own real profile screens above.

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

function PendingVerificationScreen({ req, registrationId, onApproved }: { req: PendingRegInfo; registrationId: string | null; onApproved: () => void }) {
  const QS = "'Quicksand',sans-serif"; const IN = "'Inter',sans-serif";
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);

  // Poll the real registration row — approval happens for real once a
  // landlord acts on it (a later phase's UI); this just reflects that state
  // honestly instead of faking a timer-based approval.
  const checkStatus = async () => {
    if (!registrationId) return;
    const { data } = await supabase.from("student_boarding_registrations").select("status").eq("id", registrationId).single();
    if (data?.status === "approved") setApproved(true);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationId]);

  // Fire the moment approval happens — not tied to the user tapping "Enter DormiTrack".
  useEffect(() => {
    if (!approved) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) return;
      const description = `Your boarding house registration for ${req.houseName} has been approved.`;
      addNotification({ userId: uid, type: "boarding-house", title: "Registration Approved", description, destination: "occupants" });
      notifyLinkedParents(uid, { type: "boarding-house", title: "Registration Approved", description: `${req.studentName}'s boarding house registration for ${req.houseName} has been approved.`, destination: "occupants" });
    });
  }, [approved, req.houseName, req.studentName]);

  const refresh = () => {
    setChecking(true);
    checkStatus().finally(() => setChecking(false));
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
            Welcome to {req.houseName}! You can now access all DormiTrack features.
          </p>
          <button onClick={onApproved} style={{ width: "100%", padding: "16px 0", borderRadius: 24, background: "white", color: "#9772F6", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS, boxShadow: "0 8px 24px rgba(0,0,0,.2)" }}>
            Enter DormiTrack
          </button>
        </div>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Boarding House", req.houseName],
    ["Selected Room", req.roomName],
    ...(req.bedLabel ? [["Selected Bed", req.bedLabel] as [string, string]] : []),
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

// Screens reachable without a signed-in Supabase session — everything else
// gets bounced to "landing" if the session disappears (logout/expiry) or was
// never established (direct nav / stale reload).
const PUBLIC_SCREENS: Screen[] = ["splash", "landing", "login", "roleSelect", "signup", "studentSignup", "landlordSignup", "parentSignup", "forgotPassword"];

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [visible, setVisible] = useState(true);
  const [role, setRole] = useState<Role>("landlord");
  const [regRequest, setRegRequest] = useState<RegRequest | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  // Real submit-time failure surfaced to the student (see submitRegistration below) instead of
  // silently proceeding to the "Waiting for Landlord Verification" screen for a registration
  // that never actually saved.
  const [registrationSubmitError, setRegistrationSubmitError] = useState("");
  const [registrationSessionStale, setRegistrationSessionStale] = useState(false);
  // What PendingVerificationScreen actually renders — set either right after
  // a fresh submission (submitRegistration, below) or rehydrated from the
  // real DB on login/session-restore (see the role-resolution effect below).
  const [pendingInfo, setPendingInfo] = useState<PendingRegInfo | null>(null);
  // Lifted out of WelcomeLoginScreen so a stray tap on "Forgot Password?" (then Back) doesn't wipe
  // out whatever the user already typed — that screen unmounts/remounts WelcomeLoginScreen, which
  // would otherwise reset any local useState back to empty.
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [parentLinkingId, setParentLinkingId] = useState("");
  // Set by handleLogin's parent access gate (getMyParentGateStatus) when a returning parent
  // isn't linked yet — lets ParentLinkingScreen resume straight into that real state instead of
  // re-running the fresh-signup "verifying" animation. Cleared on a brand-new signup completion
  // so a stale resume from an earlier session can never bleed into that flow.
  const [parentLinkResume, setParentLinkResume] = useState<{ kind: "pending" | "rejected" | "none"; linkId: string | null; studentIdNo: string } | null>(null);
  // Set by handleLogin when a parent logs in and their link turned out to already be confirmed
  // but never acknowledged (see acknowledgeParentLink) — shows ParentLinkedModal once, over
  // whatever tab they land on, until they dismiss it.
  const [parentJustLinked, setParentJustLinked] = useState(false);
  // These mirror boarding_houses.visitor_log_enabled/visitor_fields/
  // highlights_enabled — written once at LandlordSignUp time, then read back
  // for real below (bhConfigId) once signed in, and persisted again whenever
  // toggled in LandlordProfile.tsx (see setVisitorEnabled etc. wrappers).
  const [visitorEnabled, setVisitorEnabledLocal] = useState(false);
  const [visitorFields, setVisitorFieldsLocal] = useState<VisitorFields>({ name: true, contact: true, relationship: true, purpose: true });
  const [highlightsEnabled, setHighlightsEnabledLocal] = useState(true);
  const [bhConfigId, setBhConfigId] = useState<string | null>(null);
  // Set right before navigating away from a clicked notification, so the
  // destination screen can open the exact record (e.g. a specific report)
  // instead of just landing on the general page. Cleared once consumed.
  const [pendingDeepLink, setPendingDeepLink] = useState<{ type: NotificationType; relatedId?: string } | null>(null);

  // ── Auth session ──────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Seed the session once, then keep it live (covers login/logout from any
  // screen, and token refresh/expiry). Deliberately does NOT auto-navigate
  // off the login screen just because a still-valid session was restored
  // from a previous visit — every refresh is meant to require signing in
  // again explicitly. handleLogin's own gate check (below) still runs on
  // that explicit login, so a student who already has a pending/approved
  // registration is correctly routed away from "choose a boarding house"
  // once they do log back in — refreshing just never skips the login form
  // itself to get there.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Once signed in, `role` becomes authoritative from the database — this
  // overrides whatever RoleSelectScreen may have pre-set during the pre-auth
  // signup flow, so a stale/self-selected role can never leak into a real session.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    let active = true;
    supabase.from("users").select("role").eq("id", uid).single().then(({ data, error }) => {
      if (active && !error && data) setRole(data.role as Role);
    });
    return () => { active = false; };
  }, [session?.user?.id]);

  // Real dashboard feature-toggle config (Visitor Records / Highlights) —
  // landlord-only, resolved once we know both the session and the real role.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || role !== "landlord") return;
    let active = true;
    getMyBHFeatureConfig(uid).then(cfg => {
      if (!active || !cfg) return;
      setBhConfigId(cfg.id);
      setVisitorEnabledLocal(cfg.visitorEnabled);
      setVisitorFieldsLocal(cfg.visitorFields);
      setHighlightsEnabledLocal(cfg.highlightsEnabled);
    });
    return () => { active = false; };
  }, [session?.user?.id, role]);

  const setVisitorEnabled = (v: boolean) => { setVisitorEnabledLocal(v); if (bhConfigId) updateBHFeatureConfig(bhConfigId, { visitorEnabled: v }); };
  const setVisitorFields = (v: VisitorFields) => { setVisitorFieldsLocal(v); if (bhConfigId) updateBHFeatureConfig(bhConfigId, { visitorFields: v }); };
  const setHighlightsEnabled = (v: boolean) => { setHighlightsEnabledLocal(v); if (bhConfigId) updateBHFeatureConfig(bhConfigId, { highlightsEnabled: v }); };

  const go = (s: Screen) => {
    if (s === screen) return;
    setVisible(false);
    setTimeout(() => { setScreen(s); setVisible(true); }, 160);
  };

  // Safety net: if the session disappears (logout elsewhere, expired token)
  // while sitting on a screen that requires one, bounce back to landing.
  useEffect(() => {
    if (!authLoading && !session && !PUBLIC_SCREENS.includes(screen)) {
      go("landing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, authLoading, screen]);

  // Don't let a dismissed-or-not "You're Linked!" modal survive into a different session
  // (logout, or a different account signing in on the same device).
  useEffect(() => { if (!session) setParentJustLinked(false); }, [session]);

  const submitRegistration = async (r: RegRequest) => {
    setRegistrationSubmitError("");
    setRegistrationSessionStale(false);
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user || !r.bedId) {
      setRegistrationSubmitError("Could not submit your registration — please try again.");
      return;
    }
    // move_in is a required (not-null) column even when the landlord's Stay Info Settings never
    // asked the student for one (BoardingReg.tsx correctly hides that field then, leaving r.moveIn
    // empty) — default it to today rather than sending an empty string, which the database would
    // reject outright as an invalid date. This was a real bug: that insert failure was previously
    // only ever logged to the console, never shown to the student, who'd still be sent on to a
    // "Waiting for Landlord Verification" screen for a registration that was never actually saved
    // — and the landlord's notification for it had nothing real to link to either.
    const moveIn = r.moveIn || new Date().toISOString().slice(0, 10);
    // A real RPC (not a plain insert) — it reserves the bed (status -> 'reserved') in the same
    // atomic step as creating the registration, and rejects outright if someone else's pending
    // registration already holds it. Without this, a bed only ever stopped showing as
    // "available" once the landlord fully approved someone else's request, so two students could
    // both see — and both submit for — the exact same last bed (0047_reserve_bed_on_registration.sql).
    const { data: regId, error } = await supabase.rpc("submit_boarding_registration", {
      p_boarding_house_id: r.house.id,
      p_room_id: r.room.id,
      p_bed_id: r.bedId,
      p_move_in: moveIn,
      p_move_out: r.moveOut || null,
      p_stay_unit: r.stayUnit,
      p_stay_count: Math.max(1, Number(r.stayCount) || 1),
      p_traits: r.traits, p_hobbies: r.hobbies, p_lifestyle: r.lifestyle,
      p_notes: r.notes || null,
    });
    const reg = regId ? { id: regId as string } : null;
    if (error || !reg) {
      console.error("submit_boarding_registration failed:", error?.message);
      // A foreign-key violation on student_id specifically means the session just used doesn't
      // belong to a real student account — the classic cause is a *different* tab (another test
      // account, one that may since have been deleted) silently overwriting this tab's session,
      // since Supabase Auth shares its login storage across every tab of the same site. The fix
      // is a clean re-login, not a retry — surfacing that directly instead of the raw Postgres
      // message, which just looks like an unexplained crash to a student.
      const isStaleSession = error?.code === "23503" && !!error.message.includes("student_id_fkey");
      setRegistrationSubmitError(
        isStaleSession
          ? "Your session appears to be out of sync — this can happen if another DormiTrack tab is open. Please log out and log back in, then try again."
          : (error?.message ?? "Could not submit your registration. Please try again."),
      );
      setRegistrationSessionStale(isStaleSession);
      return;
    }
    setRegRequest(r);
    setPendingInfo({
      studentName: r.studentName, houseName: r.house.name, roomName: r.room.name, bedLabel: r.bed,
      submittedDate: r.submittedDate,
    });
    setRegistrationId(reg.id);
    // relatedId lets the landlord's notification tap scroll straight to (and highlight) this
    // specific request in Reservation Requests below, instead of just landing on a generic
    // dashboard and leaving them to hunt for it themselves.
    notifyLandlordOfBoardingHouse(r.house.id, {
      type: "verification", title: "New Registration Request",
      description: `${r.studentName} submitted a boarding house registration request for ${r.house.name}.`,
      destination: "dashboard", relatedId: reg.id,
    });
    go("pendingVerify");
  };

  const render = () => {
    // Access gate: a student with a submitted request cannot use the app until approved
    if (screen === "pendingVerify" && pendingInfo) {
      return <PendingVerificationScreen req={pendingInfo} registrationId={registrationId} onApproved={() => go("dashboard")} />;
    }
    switch (screen) {
      case "splash":         return <SplashScreen done={() => go("landing")} />;
      // "landing" and "login" both resolve to the same combined Welcome+Login
      // screen — every path that used to lead to a standalone login page
      // (sign-up "already have an account" links, forgot-password's back
      // button, logout from any role's profile) now lands here directly.
      case "landing":
      case "login":          return <WelcomeLoginScreen go={go} onPendingRegistration={(info, id) => { setPendingInfo(info); setRegistrationId(id); }} onPendingParentLink={resume => setParentLinkResume(resume)} onParentJustLinked={() => setParentJustLinked(true)} email={loginEmail} setEmail={setLoginEmail} pass={loginPass} setPass={setLoginPass} />;
      case "roleSelect":     return <RoleSelectScreen go={go} onRole={setRole} />;
      case "signup":         return <SignUpScreen go={go} />;
      case "studentSignup":  return <StudentSignUpScreen go={go} onSignup={p => setStudentProfile(p)} />;
      case "landlordSignup": return <LandlordSignUpScreen go={go} />;
      case "parentSignup":   return <ParentSignUpScreen go={go} onComplete={id => { setParentLinkResume(null); setParentLinkingId(id); go("parentLinking"); }} />;
      case "parentLinking":  return <ParentLinkingScreen go={go} studentId={parentLinkingId} resume={parentLinkResume ?? undefined} />;
      case "boardingReg":    return <BoardingRegistrationScreen go={go} onSubmit={submitRegistration} studentName={studentProfile ? [studentProfile.firstName, studentProfile.middleName ? studentProfile.middleName.charAt(0) + "." : "", studentProfile.lastName].filter(Boolean).join(" ") : ""} submitError={registrationSubmitError} submitErrorIsStaleSession={registrationSessionStale} onLogOut={() => { supabase.auth.signOut(); go("landing"); }} />;
      case "pendingVerify":  return pendingInfo ? <PendingVerificationScreen req={pendingInfo} registrationId={registrationId} onApproved={() => go("dashboard")} /> : <BoardingRegistrationScreen go={go} onSubmit={submitRegistration} studentName={studentProfile ? [studentProfile.firstName, studentProfile.middleName ? studentProfile.middleName.charAt(0) + "." : "", studentProfile.lastName].filter(Boolean).join(" ") : ""} submitError={registrationSubmitError} submitErrorIsStaleSession={registrationSessionStale} onLogOut={() => { supabase.auth.signOut(); go("landing"); }} />;
      case "forgotPassword": return <ForgotPasswordScreen go={go} />;
      case "dashboard":      return role === "admin" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><AdminDashboardScreen go={go} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={ADMIN_LEFT} rightTabs={ADMIN_RIGHT} />
        </div>
      ) : role === "landlord" ? <DashboardScreen go={go} role={role} visitorEnabled={visitorEnabled} visitorFields={visitorFields} highlightsEnabled={highlightsEnabled} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} /> : role === "student" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><StudentHomeScreen go={go} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
        </div>
      ) : role === "parent" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><ParentHomeScreen go={go} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
        </div>
      ) : <DashboardScreen go={go} role={role} visitorEnabled={visitorEnabled} visitorFields={visitorFields} highlightsEnabled={highlightsEnabled} />;
      case "dormInfo":       return <DormInfoScreen go={go} />;
      case "payments":       return role === "landlord" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><LandlordPaymentsScreen go={go} relatedId={pendingDeepLink?.type === "payment" ? pendingDeepLink.relatedId : undefined} onDeepLinkConsumed={() => setPendingDeepLink(null)} /></div>
          <BottomNav active="payments" go={go} leftTabs={LANDLORD_LEFT} rightTabs={LANDLORD_RIGHT} />
        </div>
      ) : role === "student" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><StudentPaymentsScreen go={go} relatedId={pendingDeepLink?.type === "payment" ? pendingDeepLink.relatedId : undefined} onDeepLinkConsumed={() => setPendingDeepLink(null)} /></div>
          <BottomNav active="payments" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
        </div>
      ) : role === "parent" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><ParentPaymentsScreen go={go} relatedId={pendingDeepLink?.type === "payment" ? pendingDeepLink.relatedId : undefined} onDeepLinkConsumed={() => setPendingDeepLink(null)} /></div>
          <BottomNav active="payments" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
        </div>
      ) : <PaymentsScreen go={go} role={role} />;
      case "homeVisit":      return <HomeVisitScreen go={go} />;
      case "occupants":      return role === "landlord" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><LandlordOccupantsScreen go={go} onOpenChat={id => { setPendingDeepLink({ type: "message", relatedId: id }); go("messages"); }} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} /></div>
          <BottomNav active="occupants" go={go} leftTabs={LANDLORD_LEFT} rightTabs={LANDLORD_RIGHT} />
        </div>
      ) : role === "student" ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
            <div style={{ flex:1, overflow:"hidden" }}><StudentRoomOccupantsScreen go={go} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} /></div>
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
      ) : <MapScreen go={go} role={role} />;
      case "notifications":  return <NotificationsScreen go={go} role={role} onOpenNotification={n => setPendingDeepLink({ type: n.type, relatedId: n.relatedId })} />;
      case "messages":       return <MessagesScreen go={go} role={role} pendingDeepLink={pendingDeepLink} onDeepLinkConsumed={() => setPendingDeepLink(null)} />;
      case "profile":        return role === "landlord" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><LandlordProfileScreen go={go} visitorEnabled={visitorEnabled} setVisitorEnabled={setVisitorEnabled} visitorFields={visitorFields} setVisitorFields={setVisitorFields} highlightsEnabled={highlightsEnabled} setHighlightsEnabled={setHighlightsEnabled} /></div>
          <BottomNav active="profile" go={go} leftTabs={LANDLORD_LEFT} rightTabs={LANDLORD_RIGHT} />
        </div>
      ) : role === "student" ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
            <div style={{ flex:1, overflow:"hidden" }}><StudentProfileScreen go={go} /></div>
            <BottomNav active="profile" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
          </div>
        ) : role === "parent" ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
            <div style={{ flex:1, overflow:"hidden" }}><ParentProfileScreen go={go} /></div>
            <BottomNav active="profile" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
          </div>
        ) : <AdminProfileScreenFull go={go} />;
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
          <div style={{ flex:1, overflow:"hidden" }}><StudentHomeScreen go={go} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={STUDENT_LEFT} rightTabs={STUDENT_RIGHT} />
        </div>
      ) : role === "parent" ? (
        <div style={{ height:"100%", display:"flex", flexDirection:"column" as const }}>
          <div style={{ flex:1, overflow:"hidden" }}><ParentHomeScreen go={go} /></div>
          <BottomNav active="dashboard" go={go} leftTabs={PARENT_LEFT} rightTabs={PARENT_RIGHT} />
        </div>
      ) : <DashboardScreen go={go} role={role} />;
    }
  };

  return (
    <MobileShell visible={visible}>
      {render()}
      {parentJustLinked && <ParentLinkedModal onDismiss={() => { acknowledgeParentLink(); setParentJustLinked(false); }} />}
    </MobileShell>
  );
}
