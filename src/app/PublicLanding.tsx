// Public marketing landing page — the first thing a browser tab sees before
// any login (see App.tsx's initial `screen` state and MobileShell's
// "publicLanding" branch, which renders this full-bleed instead of inside the
// phone-panel/admin-shell used by every authenticated screen). Purely
// informational: static descriptive copy about the real, already-implemented
// system is fine here (see the standing "no mock data" rule's own carve-out
// for this page), but every feature/role described below is one that
// genuinely exists in this app today — nothing invented, nothing planned.
import React, { useState } from "react";
import {
  Download, MapPin, CreditCard, Flag, MessageCircle,
  Megaphone, Users, ShieldCheck, ClipboardCheck, LayoutDashboard,
  GraduationCap, UserRound, Building2, X,
} from "lucide-react";
import { GRAD, Screen } from "./shared";
import { DormiLogo } from "./components/DormiLogo";
import { useDeviceType } from "./components/useDeviceType";
import { useInstallPrompt } from "./components/useInstallPrompt";
import { PrivacyPolicyContent, TermsConditionsContent } from "./LegalContent";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

// Same color-coding convention already used throughout the app (role/status
// badges etc.) — each feature gets its own accent instead of one flat purple
// repeated nine times.
const FEATURES = [
  { Icon: MapPin,         color: "#16A34A", bg: "#DCFCE7", title: "Real-Time Enter/Exit Tracking", desc: "Students check in and out with real, GPS-verified location — never continuous tracking, only actual entry/exit events." },
  { Icon: Building2,      color: "#3B82F6", bg: "#EFF6FF", title: "Boarding House Directory & Map", desc: "Browse real boarding houses near BISU Calape — rooms, beds, amenities, photos, and their real location on the map." },
  { Icon: CreditCard,     color: "#EC4899", bg: "#FDF2F8", title: "Payments & Billing", desc: "Students and parents submit real proof of payment; landlords verify it, with a full, real billing history." },
  { Icon: Flag,           color: "#EF4444", bg: "#FEE2E2", title: "Reports & Concerns", desc: "Students can file real concerns about their boarding house, tracked from submission to resolution." },
  { Icon: MessageCircle,  color: "#8B5CF6", bg: "#EDE9FE", title: "Messaging", desc: "Direct and group chat between students, parents, and landlords." },
  { Icon: Megaphone,      color: "#D97706", bg: "#FEF3C7", title: "Announcements", desc: "Real announcements from landlords and the Housing Office, delivered to the people they're relevant to." },
  { Icon: Users,          color: "#9772F6", bg: "#F5F0FF", title: "Parent-Student Linking", desc: "Parents link to their student's real account (with the student's confirmation) to monitor their stay." },
  { Icon: ClipboardCheck, color: "#0891B2", bg: "#ECFEFF", title: "Boarding House Registration & Verification", desc: "Students register their stay for a boarding house, verified and approved by the landlord and Housing Office." },
  { Icon: LayoutDashboard,color: "#6366F1", bg: "#EEF2FF", title: "Housing Office Oversight", desc: "The Housing Director sees real, system-wide activity — users, reports, payments, and boarding houses — with role-based access." },
];

const ROLES = [
  { Icon: GraduationCap, label: "Student",                  desc: "Check in/out, manage boarding house registration, pay bills, file concerns, and message your landlord or parent." },
  { Icon: UserRound,     label: "Parent / Guardian",         desc: "Monitor your linked student's boarding house, payments, and real activity." },
  { Icon: Building2,     label: "Landlord",                  desc: "Manage your boarding house, rooms, occupants, payments, and respond to student concerns." },
  { Icon: ShieldCheck,   label: "Housing Director / Admin",  desc: "Oversee users, boarding houses, reports, and system-wide activity for BISU Calape." },
];

const PURPOSE = [
  "Improving student monitoring for boarding houses near BISU Calape",
  "Organizing boarding house information — rooms, beds, amenities, and rates",
  "Monitoring student payments and billing",
  "Recording real student Enter/Exit activity",
  "Supporting boarding house registration and verification",
  "Improving communication and coordination between students, parents/guardians, landlords, and the Housing Office",
];

// ── Shared bits ───────────────────────────────────────────────────────────────

function LandingStyles() {
  return (
    <style>{`
      .dt-glass-btn{position:relative;overflow:hidden;transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s ease,filter .22s ease}
      .dt-glass-btn:hover{transform:translateY(-3px);filter:brightness(1.06)}
      .dt-glass-btn:active{transform:translateY(-1px) scale(.97)}
      .dt-glass-btn:focus-visible{outline:2px solid rgba(255,255,255,.9);outline-offset:3px}
      .dt-lift-card{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s ease,border-color .25s ease}
      .dt-lift-card:hover{transform:translateY(-4px);box-shadow:0 10px 28px rgba(97,63,173,.16)}
      @keyframes dtFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
    `}</style>
  );
}

// Glassmorphism button — semi-transparent background, blurred backdrop, thin
// light border, soft shadow, smooth hover/active/focus states. "primary"
// (Log In) is a brighter/more opaque glass so it still reads as the main
// action; "secondary" (Sign Up, Install App) is the more translucent look.
function GlassButton({ children, onClick, variant = "secondary" }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <button onClick={onClick} className="dt-glass-btn" style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 50, padding: "0 30px", borderRadius: 16,
      cursor: "pointer", fontSize: 14, fontWeight: 800, fontFamily: QS,
      border: isPrimary ? "1px solid rgba(255,255,255,.75)" : "1px solid rgba(255,255,255,.35)",
      background: isPrimary ? "rgba(255,255,255,.94)" : "rgba(255,255,255,.14)",
      color: isPrimary ? "#7549F6" : "white",
      backdropFilter: "blur(20px) saturate(200%)",
      WebkitBackdropFilter: "blur(20px) saturate(200%)",
      boxShadow: isPrimary
        ? "0 12px 32px rgba(31,16,64,.25), inset 0 1px 0 rgba(255,255,255,.9)"
        : "0 10px 26px rgba(31,16,64,.18), inset 0 1px 0 rgba(255,255,255,.25)",
    }}>
      {children}
    </button>
  );
}

function LegalModal({ doc, onClose }: { doc: "privacy" | "terms"; onClose: () => void }) {
  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 24, maxHeight: "85vh", width: "100%", maxWidth: 640, display: "flex", flexDirection: "column" as const, boxShadow: "0 24px 70px rgba(0,0,0,.35)" }} onClick={e => e.stopPropagation()}>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{doc === "privacy" ? "Privacy Policy" : "Terms & Conditions"}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} color="#6B7280" />
          </button>
        </div>
        <div style={{ overflowY: "auto" as const, padding: "16px 20px 32px" }}>
          {doc === "privacy" ? <PrivacyPolicyContent /> : <TermsConditionsContent />}
        </div>
      </div>
    </div>
  );
}

// Plain gradient-clip heading — the pill/capsule "eyebrow" label above each
// one was removed (see section 2 of the request this came from) to reduce
// visual clutter; the heading itself still carries enough weight on its own.
function SectionHeading({ title, isWide }: { title: string; isWide: boolean }) {
  return (
    <h2 style={{
      margin: "0 0 16px", fontSize: isWide ? 28 : 22, fontWeight: 800, fontFamily: QS,
      backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text" as const,
      WebkitTextFillColor: "transparent" as const, color: "#7549F6",
    }}>
      {title}
    </h2>
  );
}

export function PublicLandingScreen({ go }: { go: (s: Screen) => void }) {
  const deviceType = useDeviceType();
  const isWide = deviceType !== "mobile";
  const isDesktop = deviceType === "desktop";
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [legalDoc, setLegalDoc] = useState<"privacy" | "terms" | null>(null);
  // Install App only makes sense to offer on phone/tablet — the app itself
  // restricts Student/Parent/Landlord to those devices anyway (see
  // MobileShell's device-restriction screen), so a PC visitor installing it
  // would just hit that restricted screen on their next launch, unless they
  // turn out to be Admin (which isn't known yet at this pre-login page).
  const showInstallButton = !installed && !isDesktop;

  const handleInstall = async () => {
    if (canInstall) { await promptInstall(); return; }
    // No real beforeinstallprompt available on this browser/device (e.g. iOS
    // Safari never fires one) — show a real instruction instead of a button
    // that silently does nothing.
    setShowInstallHint(true);
  };

  const maxW = isDesktop ? 1100 : isWide ? 760 : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#FCFBFF 0%,#F6F1FE 45%,#F1E9FC 100%)", fontFamily: IN }}>
      <LandingStyles />
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
      {showInstallHint && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowInstallHint(false)}>
          <div style={{ background: "white", borderRadius: 24, padding: "26px 22px", maxWidth: 340, width: "100%", textAlign: "center" as const, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: "linear-gradient(135deg,#F5F0FF,#EDE4FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Download size={22} color="#9772F6" />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Install Not Available Here</h3>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.6 }}>
              This browser hasn't offered to install DormiTrack yet. On Android/Chrome, look for "Install app" in the browser menu. On iPhone/iPad, use the Share button, then "Add to Home Screen."
            </p>
            <button onClick={() => setShowInstallHint(false)} style={{ width: "100%", height: 44, borderRadius: 16, border: "none", background: GRAD, color: "white", fontSize: 13, fontWeight: 800, fontFamily: QS, cursor: "pointer" }}>Got it</button>
          </div>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/* Soft blurry blob background — white base canvas with large, heavily-
          blurred purple blobs concentrated behind the text (top-left) and
          easing toward white lower down / toward the edges, so it reads as
          an organic purple-to-white wash rather than a hard-edged color
          block. Height is viewport-aware rather than fixed: full-screen on
          desktop/laptop (matches "a laptop should feel like a full-screen
          landing experience"), natural content height on tablet/mobile
          (forcing 100vh there would leave awkward empty space under
          shorter content) — vertically centered either way so there's
          never a lopsided gap. */}
      <div style={{
        background: "#FEFEFF", position: "relative" as const, overflow: "hidden",
        minHeight: isDesktop ? "100vh" : undefined,
        display: "flex", flexDirection: "column" as const, justifyContent: "center",
        padding: isDesktop ? "48px 40px" : isWide ? "64px 40px" : "56px 20px",
      }}>
        <div style={{ position: "absolute" as const, top: "-35%", left: "-15%", width: "85%", height: "150%", borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #8B5CF6 0%, #9772F6 30%, rgba(151,114,246,0) 68%)", filter: "blur(70px)" }} />
        <div style={{ position: "absolute" as const, top: "-15%", right: "-15%", width: "60%", height: "110%", borderRadius: "50%", background: "radial-gradient(circle at 60% 30%, rgba(117,73,246,.75) 0%, rgba(151,114,246,0) 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute" as const, bottom: "-30%", left: "10%", width: "55%", height: "80%", borderRadius: "50%", background: "radial-gradient(circle, rgba(232,190,255,.5) 0%, rgba(232,190,255,0) 70%)", filter: "blur(70px)" }} />
        {/* Desktop-only: eases toward white right where the medallion sits.
            Kept off mobile/tablet, where the layout is single-column and
            centered — this blob's footprint would otherwise sit right under
            the hero text/buttons and wash out their contrast. */}
        {isDesktop && (
          <div style={{ position: "absolute" as const, bottom: "-10%", right: "5%", width: "40%", height: "70%", background: "radial-gradient(circle, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 70%)", filter: "blur(60px)" }} />
        )}
        <div style={{ maxWidth: maxW, margin: "0 auto", position: "relative" as const, textAlign: isWide ? "left" as const : "center" as const, display: isDesktop ? "flex" : "block", alignItems: "center", gap: 56, width: "100%" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: isWide ? "flex-start" : "center", marginBottom: 22 }}>
              <DormiLogo size={56} white />
              <span style={{ fontSize: 26, fontWeight: 800, color: "white", fontFamily: QS }}>DormiTrack</span>
            </div>
            <h1 style={{ margin: "0 0 14px", fontSize: isDesktop ? 42 : isWide ? 34 : 27, fontWeight: 800, color: "white", fontFamily: QS, lineHeight: 1.22, maxWidth: 580, letterSpacing: -0.5 }}>
              Boarding House Student Monitoring and Tracking System for BISU Calape
            </h1>
            <p style={{ margin: "0 0 30px", fontSize: 15, color: "rgba(255,255,255,.9)", fontFamily: IN, lineHeight: 1.75, maxWidth: 520 }}>
              DormiTrack helps students, parents, landlords, and the BISU Calape Housing Office keep track of boarding house stays in one place — real enter/exit records, payments, boarding house information, and communication, all in a single system.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, justifyContent: isWide ? "flex-start" : "center" }}>
              <GlassButton variant="primary" onClick={() => go("landing")}>Log In</GlassButton>
              <GlassButton onClick={() => go("roleSelect")}>Sign Up</GlassButton>
              {showInstallButton && <GlassButton onClick={handleInstall}><Download size={16} color="white" /> Install App</GlassButton>}
            </div>
          </div>
          {/* Significantly larger than before, with generous whitespace
              around it so the bigger size still feels intentional rather
              than cramped. No disc behind it — just the purple mark (1P),
              gently floating (see dtFloat). A soft white glow (plus the
              usual drop shadow for depth) keeps it legible sitting on the
              hero's purple blob background. Shown at every size, scaled
              per device tier, same responsive convention as the rest of
              the page. Aspect ratio is never touched — only `size` (both
              dimensions together) changes. */}
          <div style={{ flexShrink: 0, filter: "drop-shadow(0 0 54px rgba(255,255,255,.55)) drop-shadow(0 24px 46px rgba(31,16,64,.3))", animation: "dtFloat 5s ease-in-out infinite", marginTop: isDesktop ? 0 : 20 }}>
            <DormiLogo size={isDesktop ? 420 : isWide ? 280 : 190} />
          </div>
        </div>
      </div>

      {/* Wave divider — a flat color change from hero to body reads as an
          abrupt edge; this blends them together instead. */}
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 60, marginTop: -51, position: "relative" as const, zIndex: 2 }}>
        <path d="M0,32 C280,90 420,0 720,28 C1020,56 1180,4 1440,36 L1440,90 L0,90 Z" fill="#FCFBFF" />
      </svg>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: isDesktop ? "56px 40px 56px" : isWide ? "48px 40px 48px" : "40px 20px 40px", position: "relative" as const, overflow: "hidden" }}>
        <div style={{ position: "absolute" as const, top: 120, right: -140, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(151,114,246,.1),transparent 70%)", pointerEvents: "none" as const }} />
        <div style={{ position: "absolute" as const, top: 950, left: -160, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(236,72,153,.07),transparent 70%)", pointerEvents: "none" as const }} />
        <div style={{ position: "absolute" as const, top: 1800, right: -120, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,.08),transparent 70%)", pointerEvents: "none" as const }} />
        <div style={{ maxWidth: maxW, margin: "0 auto", position: "relative" as const }}>

          {/* About */}
          <section style={{ marginBottom: 52 }}>
            <SectionHeading title="What is DormiTrack?" isWide={isWide} />
            <p style={{ margin: 0, fontSize: 14.5, color: "#4B5563", fontFamily: IN, lineHeight: 1.85, maxWidth: 720 }}>
              DormiTrack is a boarding house student monitoring and tracking system built for students living near
              Bohol Island State University (BISU) Calape Campus. It connects students, their parents or guardians,
              boarding house landlords, and the campus Housing Office in one real-time system — replacing scattered
              paper logs and manual coordination with a single, shared source of truth for who's staying where,
              who's checked in or out, and how payments and concerns are being handled.
            </p>
          </section>

          {/* Purpose */}
          <section style={{ marginBottom: 52 }}>
            <SectionHeading title="Why DormiTrack exists" isWide={isWide} />
            <div style={{ display: "grid", gridTemplateColumns: isWide ? "1fr 1fr" : "1fr", gap: 12 }}>
              {PURPOSE.map(t => (
                <div key={t} className="dt-lift-card" style={{
                  display: "flex", alignItems: "center", background: "white", borderRadius: 16,
                  padding: "18px 20px", minHeight: 108, borderLeft: "4px solid #9772F6",
                  boxShadow: "0 4px 16px rgba(97,63,173,.1)", boxSizing: "border-box" as const,
                }}>
                  <span style={{
                    fontSize: 13.5, color: "#374151", fontFamily: IN, lineHeight: 1.6, fontWeight: 600,
                    display: "-webkit-box" as any, WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                  }}>{t}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section style={{ marginBottom: 52 }}>
            <SectionHeading title="What DormiTrack does" isWide={isWide} />
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3,1fr)" : isWide ? "repeat(2,1fr)" : "1fr", gap: 16 }}>
              {FEATURES.map(({ Icon, color, bg, title, desc }) => (
                <div key={title} className="dt-lift-card" style={{ background: "white", borderRadius: 20, padding: "22px 20px", boxShadow: "0 6px 22px rgba(97,63,173,.1)", borderTop: `3px solid ${color}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={20} color={color} />
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{title}</p>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#6B7280", fontFamily: IN, lineHeight: 1.65 }}>{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* User Roles */}
          <section style={{ marginBottom: 52 }}>
            <SectionHeading title="Built for everyone involved" isWide={isWide} />
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4,1fr)" : isWide ? "repeat(2,1fr)" : "1fr", gap: 16 }}>
              {ROLES.map(({ Icon, label, desc }) => (
                <div key={label} className="dt-lift-card" style={{ background: "white", borderRadius: 20, padding: "24px 20px", boxShadow: "0 6px 22px rgba(97,63,173,.1)", textAlign: "center" as const }}>
                  <div style={{ width: 54, height: 54, borderRadius: "50%", backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 20px rgba(117,73,246,.4)" }}>
                    <Icon size={24} color="white" />
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works */}
          <section style={{ marginBottom: 52 }}>
            <SectionHeading title="Getting started" isWide={isWide} />
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4,1fr)" : isWide ? "repeat(2,1fr)" : "1fr", gap: 16 }}>
              {[
                { n: "1", t: "Create an account", d: "Sign up as a Student, Parent/Guardian, or Landlord." },
                { n: "2", t: "Get verified", d: "Students register their boarding house stay for landlord/Housing Office approval." },
                { n: "3", t: "Use DormiTrack daily", d: "Check in/out, pay bills, message, and stay updated with real announcements." },
                { n: "4", t: "Stay connected", d: "Parents and the Housing Office monitor real activity, in real time." },
              ].map(({ n, t, d }) => (
                <div key={n} className="dt-lift-card" style={{ background: "white", borderRadius: 20, padding: "22px 20px", boxShadow: "0 6px 22px rgba(97,63,173,.1)", position: "relative" as const }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, boxShadow: "0 6px 16px rgba(117,73,246,.35)", position: "relative" as const }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "white", fontFamily: QS }}>{n}</span>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, position: "relative" as const }}>{t}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.6, position: "relative" as const }}>{d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Call to Action — no card/box at all now. Previously this section
              had its own `overflow:hidden`, which — even with no solid fill —
              still clipped the blobs at this section's own straight
              boundary, reading as a "card" outline. Removed that, so the
              blobs bleed freely into the surrounding page (only the much
              larger, looser Body wrapper below still bounds them), landing
              on the page's actual base background instead of being boxed
              into this section specifically. Text and buttons use the same
              dark/brand-purple treatment every other section already uses
              on the light page background. */}
          <section style={{
            textAlign: "center" as const, marginBottom: 32, position: "relative" as const,
            padding: isWide ? "64px 48px" : "48px 26px",
          }}>
            <div style={{ position: "absolute" as const, top: "-25%", left: "-12%", width: "45%", height: "150%", borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #9772F6 0%, rgba(151,114,246,0) 68%)", filter: "blur(60px)", opacity: 0.55, pointerEvents: "none" as const }} />
            <div style={{ position: "absolute" as const, top: "-25%", right: "-12%", width: "45%", height: "150%", borderRadius: "50%", background: "radial-gradient(circle at 60% 65%, #7549F6 0%, rgba(117,73,246,0) 68%)", filter: "blur(60px)", opacity: 0.5, pointerEvents: "none" as const }} />
            <div style={{ width: 60, height: 60, borderRadius: 20, background: "linear-gradient(135deg,#F5F0FF,#EDE4FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", position: "relative" as const, boxShadow: "0 6px 18px rgba(97,63,173,.15)" }}>
              <DormiLogo size={34} />
            </div>
            <p style={{
              margin: "0 0 10px", fontSize: isWide ? 30 : 22, fontWeight: 800, fontFamily: QS, position: "relative" as const, letterSpacing: -0.4,
              backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text" as const, WebkitTextFillColor: "transparent" as const, color: "#7549F6",
            }}>Ready to get started?</p>
            <p style={{ margin: "0 0 30px", fontSize: 14.5, color: "#6B7280", fontFamily: IN, position: "relative" as const, maxWidth: 420, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>Log in to your account, or sign up if you're new to DormiTrack.</p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" as const, position: "relative" as const }}>
              <button onClick={() => go("landing")} className="dt-glass-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 50, padding: "0 30px", borderRadius: 16, border: "none", backgroundImage: GRAD, color: "white", fontSize: 14, fontWeight: 800, fontFamily: QS, cursor: "pointer", boxShadow: "0 10px 26px rgba(117,73,246,.35)" }}>Log In</button>
              <button onClick={() => go("roleSelect")} className="dt-glass-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 50, padding: "0 30px", borderRadius: 16, border: "2px solid #9772F6", background: "white", color: "#7549F6", fontSize: 14, fontWeight: 800, fontFamily: QS, cursor: "pointer" }}>Sign Up</button>
              {showInstallButton && (
                <button onClick={handleInstall} className="dt-glass-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 50, padding: "0 26px", borderRadius: 16, border: "2px solid #E5E7EB", background: "white", color: "#374151", fontSize: 14, fontWeight: 800, fontFamily: QS, cursor: "pointer" }}>
                  <Download size={15} color="#374151" /> Install App
                </button>
              )}
            </div>
          </section>

          {/* Footer */}
          <footer style={{ textAlign: "center" as const, padding: "8px 0 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
              <DormiLogo size={20} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: QS }}>DormiTrack</span>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>BISU Calape Campus · Boarding House Student Monitoring and Tracking System</p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <button onClick={() => setLegalDoc("privacy")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9CA3AF", fontFamily: IN, textDecoration: "underline" }}>Privacy Policy</button>
              <button onClick={() => setLegalDoc("terms")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9CA3AF", fontFamily: IN, textDecoration: "underline" }}>Terms & Conditions</button>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
