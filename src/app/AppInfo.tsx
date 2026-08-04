import React, { useState } from "react";
import {
  Settings, Bell, Info, Shield, ChevronDown, ChevronUp, ChevronRight,
  Globe, Moon, Mail, HelpCircle, FileText, Heart, Check, X,
} from "lucide-react";
import { GRAD } from "./shared";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

// ── Tiny toggle ───────────────────────────────────────────────────────────────
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: value ? "#9772F6" : "#D1D5DB", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .2s" }} />
    </div>
  );
}

// ── Accordion wrapper ─────────────────────────────────────────────────────────
function Accordion({ title, Icon, children, defaultOpen = false }: {
  title: string; Icon: React.ComponentType<{ size?: number; color?: string }>;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "white", borderRadius: 20, marginBottom: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: open ? "1px solid #F3F4F6" : "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color="#9772F6" />
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "left" }}>{title}</span>
        {open ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function Row({ icon, label, right, last = false, onClick }: {
  icon: React.ReactNode; label: string; right?: React.ReactNode; last?: boolean; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: last ? "none" : "1px solid #F9FAFB", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ width: 30, height: 30, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{label}</span>
      {right ?? <ChevronRight size={14} color="#D1D5DB" />}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 430, maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} color="#9CA3AF" /></button>
        </div>
        <div style={{ overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 20px 32px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Language picker ───────────────────────────────────────────────────────────
const LANGUAGES = ["English", "Filipino", "Cebuano", "Ilocano"];

// ── Main exported component ───────────────────────────────────────────────────
export function AppInfoSection() {
  // Settings state
  const [darkMode, setDarkMode]     = useState(false);
  // Privacy toggles (must be at top level — never inside .map)
  const [privacyToggles, setPrivacyToggles] = useState([true, true, true]);
  const togglePrivacy = (i: number) => setPrivacyToggles(t => t.map((v, j) => j === i ? !v : v));
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [language, setLanguage]   = useState("English");
  const [showLang, setShowLang]   = useState(false);

  // Modals
  const [modal, setModal] = useState<"help" | "terms" | "privacy" | "about" | null>(null);

  const sectionLabel = (text: string) => (
    <p style={{ fontSize: 10, fontWeight: 800, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase", letterSpacing: 0.8, margin: "4px 0 6px 4px" }}>{text}</p>
  );

  return (
    <>
      {/* Modals */}
      {modal === "help" && (
        <Modal title="Help & Support" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: "#6B7280", fontFamily: IN, lineHeight: 1.7, margin: "0 0 16px" }}>
            For assistance with your DormiTrack account, please contact our support team through any of the following channels.
          </p>
          {[
            { label: "Email Support", val: "support@dormitrack.edu.ph" },
            { label: "Hotline",       val: "+63 912 345 6789" },
            { label: "Office Hours",  val: "Mon–Fri, 8:00 AM – 5:00 PM" },
            { label: "Campus Office", val: "BISU Calape Campus, Student Affairs" },
          ].map(({ label, val }) => (
            <div key={label} style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: IN }}>{val}</p>
            </div>
          ))}
        </Modal>
      )}

      {modal === "terms" && (
        <Modal title="Terms & Privacy" onClose={() => setModal(null)}>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#9772F6", fontFamily: QS, margin: "0 0 6px" }}>Terms of Service</p>
          <p style={{ fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.7, margin: "0 0 16px" }}>
            By using DormiTrack, you agree to use the platform solely for its intended educational and boarding-house management purposes. Misuse of the system, including falsifying information, is strictly prohibited.
          </p>
          <p style={{ fontSize: 12, fontWeight: 800, color: "#9772F6", fontFamily: QS, margin: "0 0 6px" }}>Privacy Policy</p>
          <p style={{ fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.7, margin: 0 }}>
            DormiTrack collects only the personal information necessary to operate the platform. Your data is stored securely and is never sold to third parties. You may request deletion of your account at any time by contacting the BISU Housing Office.
          </p>
        </Modal>
      )}

      {modal === "privacy" && (
        <Modal title="Privacy Settings" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: "#6B7280", fontFamily: IN, lineHeight: 1.7, margin: "0 0 20px" }}>
            Control how DormiTrack uses and displays your information.
          </p>
          {[
            { label: "Show profile to other occupants", desc: "Other tenants in your boarding house can see your name and room." },
            { label: "Allow landlord to view full profile", desc: "Landlords can view your personal info and registration details." },
            { label: "Share activity data", desc: "Anonymized usage data helps improve DormiTrack for everyone." },
          ].map(({ label, desc }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: i < 2 ? "1px solid #F9FAFB" : "none" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: IN, lineHeight: 1.5 }}>{desc}</p>
              </div>
              <Toggle value={privacyToggles[i]} onToggle={() => togglePrivacy(i)} />
            </div>
          ))}
        </Modal>
      )}

      {modal === "about" && (
        <Modal title="About DormiTrack" onClose={() => setModal(null)}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>
              <Heart size={28} color="white" />
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>DormiTrack</h2>
            <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>Version 1.0.0</p>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", fontFamily: IN, lineHeight: 1.7, margin: "0 0 16px", textAlign: "center" }}>
            DormiTrack is the official boarding house management platform of Bohol Island State University (BISU) Calape Campus, designed to connect students, parents, landlords, and the Housing Director in one seamless system.
          </p>
          {[
            { label: "Developer",  val: "BISU-IT Capstone Team" },
            { label: "Campus",     val: "BISU Calape Campus" },
            { label: "Released",   val: "2025" },
            { label: "Contact",    val: "dormitrack@bisu.edu.ph" },
          ].map(({ label, val }, i, arr) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none" }}>
              <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: QS, fontWeight: 700 }}>{label}</span>
              <span style={{ fontSize: 12, color: "#1F2937", fontFamily: IN, fontWeight: 700 }}>{val}</span>
            </div>
          ))}
        </Modal>
      )}

      {/* Language picker sheet */}
      {showLang && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-end" }} onClick={() => setShowLang(false)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", padding: "16px 20px 32px" }} onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Select Language</p>
            {LANGUAGES.map(lang => (
              <button key={lang} onClick={() => { setLanguage(lang); setShowLang(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 0", background: "none", border: "none", borderBottom: "1px solid #F9FAFB", cursor: "pointer" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: lang === language ? "#9772F6" : "#1F2937", fontFamily: QS }}>{lang}</span>
                {lang === language && <Check size={16} color="#9772F6" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Settings ── */}
      <p style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px 4px", fontFamily: QS }}>App Info</p>

      <Accordion title="Settings" Icon={Settings} defaultOpen={false}>
        {sectionLabel("General")}
        <Row icon={<Globe size={15} color="#9772F6" />} label="Language"
          right={<button onClick={() => setShowLang(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}><span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700, fontFamily: QS }}>{language}</span><ChevronRight size={13} color="#D1D5DB" /></button>}
          onClick={() => setShowLang(true)} />
        <Row icon={<Moon size={15} color="#9772F6" />} label="Dark Mode"
          right={<Toggle value={darkMode} onToggle={() => setDarkMode(d => !d)} />} last />

        {sectionLabel("Notifications")}
        <Row icon={<Bell size={15} color="#9772F6" />} label="Push Notifications"
          right={<Toggle value={pushNotif} onToggle={() => setPushNotif(d => !d)} />} />
        <Row icon={<Mail size={15} color="#9772F6" />} label="Email Notifications"
          right={<Toggle value={emailNotif} onToggle={() => setEmailNotif(d => !d)} />} last />

        {sectionLabel("About")}
        <Row icon={<Info size={15} color="#9772F6" />} label="App Version"
          right={<span style={{ fontSize: 12, color: "#6B7280", fontWeight: 700, fontFamily: QS }}>v1.0.0</span>} />
        <Row icon={<HelpCircle size={15} color="#9772F6" />} label="Help & Support" onClick={() => setModal("help")} />
        <Row icon={<FileText size={15} color="#9772F6" />} label="Terms & Privacy" onClick={() => setModal("terms")} last />
      </Accordion>

      {/* ── Privacy ── */}
      <div style={{ background: "white", borderRadius: 20, marginBottom: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
        <Row icon={<Shield size={15} color="#9772F6" />} label="Privacy" onClick={() => setModal("privacy")} last />
      </div>

      {/* ── About DormiTrack ── */}
      <div style={{ background: "white", borderRadius: 20, marginBottom: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
        <Row icon={<Heart size={15} color="#9772F6" />} label="About DormiTrack" onClick={() => setModal("about")} last />
      </div>
    </>
  );
}
