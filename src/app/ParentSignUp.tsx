import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, Check, Eye, EyeOff, Mail, Lock,
  AlertCircle, CheckCircle, User, Link2, UserCheck,
  RefreshCw, Edit3, HelpCircle,
} from "lucide-react";
import { GRAD, GRAD_H, Screen } from "./shared";

const STEPS = ["Personal", "Student", "Account"];

const RELATIONS = [
  "Father", "Mother", "Guardian", "Grandfather", "Grandmother",
  "Brother", "Sister", "Aunt", "Uncle", "Relative", "Foster Parent", "Other",
];

export function ParentSignUpScreen({ go, onComplete }: { go: (s: Screen) => void; onComplete: (studentId: string) => void }) {
  const QS = "'Quicksand',sans-serif";
  const IN = "'Inter',sans-serif";

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // ── Step 0: Personal Info ─────────────────────────────────────────────────
  const [firstName, setFirstName]     = useState("");
  const [middleName, setMiddleName]   = useState("");
  const [lastName, setLastName]       = useState("");
  const [relation, setRelation]       = useState("");
  const [specifyRelation, setSpecify] = useState("");
  const [sex, setSex]                 = useState("");
  const [contact, setContact]         = useState("");
  const [address, setAddress]         = useState("");

  // ── Step 1: Student Info ──────────────────────────────────────────────────
  const [studentId, setStudentId]     = useState("");

  // ── Step 2: Account ───────────────────────────────────────────────────────
  const username = (() => {
    const f  = firstName.trim().toLowerCase().replace(/\s+/g, "");
    const mi = middleName.trim().toLowerCase().replace(/\s+/g, "")[0] ?? "";
    const l  = lastName.trim().toLowerCase().replace(/\s+/g, "");
    if (!f && !l) return "";
    return [f, mi, l].filter(Boolean).join("_");
  })();

  const [email, setEmail]               = useState("");
  const [emailNA, setEmailNA]           = useState(false);
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPw] = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // ── Styles (match StudentSignUpScreen exactly) ────────────────────────────
  const inputStyle = (hasErr: boolean): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box" as const,
    padding: "13px 14px", borderRadius: 14,
    border: `1.5px solid ${hasErr ? "#EF4444" : "#E5E7EB"}`,
    background: "#F9FAFB", color: "#1F2937",
    fontSize: 14, fontFamily: IN, outline: "none",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: "#374151",
    fontFamily: QS, marginBottom: 6, display: "block",
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 16 };

  const selectStyle = (hasErr: boolean): React.CSSProperties => ({
    ...inputStyle(hasErr),
    appearance: "none" as const, WebkitAppearance: "none" as const,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
    paddingRight: 40, cursor: "pointer",
  });

  const err = (key: string) =>
    errors[key] ? (
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#EF4444", fontFamily: IN }}>{errors[key]}</p>
    ) : null;

  // ── Per-step validation ───────────────────────────────────────────────────
  const validate0 = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    else if (!/^[a-zA-Z\s]+$/.test(firstName)) e.firstName = "Letters only.";
    if (middleName && !/^[a-zA-Z\s]+$/.test(middleName)) e.middleName = "Letters only.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    else if (!/^[a-zA-Z\s]+$/.test(lastName)) e.lastName = "Letters only.";
    if (!relation) e.relation = "Please select your relation to the student.";
    if (relation === "Other" && !specifyRelation.trim()) e.specifyRelation = "Please specify your relation.";
    if (!sex) e.sex = "Please select your sex.";
    if (!contact.trim()) e.contact = "Contact number is required.";
    else if (!/^09\d{9}$/.test(contact.trim())) e.contact = "Must be 11 digits starting with 09.";
    if (!address.trim()) e.address = "Complete address is required.";
    return e;
  };

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!studentId.trim()) e.studentId = "Student ID is required.";
    else if (!/^\d{6}$/.test(studentId.trim())) e.studentId = "Student ID must be exactly 6 digits.";
    return e;
  };

  const validate2 = () => {
    const e: Record<string, string> = {};
    if (!username) e.username = "Username is auto-generated — please fill in your name first.";
    if (!emailNA) {
      if (!email.trim()) e.email = "Email address is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Must be a valid email address.";
    }
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Password must be at least 6 characters.";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const nextStep = () => {
    setSubmitted(true);
    const validators = [validate0, validate1, validate2];
    const e = validators[step]();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setSubmitted(false);
      setErrors({});
      if (step < 2) setStep(s => s + 1);
      else onComplete(studentId);
    }
  };

  // ── Progress bar (identical to StudentSignUpScreen) ───────────────────────
  const ProgressBar = () => (
    <div style={{ padding: "4px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
              <div
                onClick={() => i < step && setStep(i)}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: i <= step ? GRAD : "#E5E7EB",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: i <= step ? "0 2px 8px rgba(151,114,246,.35)" : "none",
                  cursor: i < step ? "pointer" : "default", transition: "transform .15s",
                }}
                onMouseEnter={e => { if (i < step) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}>
                {i < step
                  ? <Check size={13} color="white" strokeWidth={3} />
                  : <span style={{ fontSize: 11, fontWeight: 800, color: i <= step ? "white" : "#9CA3AF", fontFamily: QS }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: i <= step ? "#9772F6" : "#9CA3AF", fontFamily: QS, marginTop: 4, whiteSpace: "nowrap" as const }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? "#9772F6" : "#E5E7EB", marginBottom: 14, transition: "background .3s" }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const stepHeadings = ["Personal Information", "Student Information", "Account Details"];
  const stepSubtitles = [
    "Provide your personal information to continue.",
    "Enter the student ID to link your account.",
    "Set up your login credentials.",
  ];

  const card = (children: React.ReactNode) => (
    <div style={{ background: "white", borderRadius: 24, padding: "20px 18px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
      {children}
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: "48px 20px 24px", backgroundImage: GRAD_H, position: "relative" as const }}>
        <button
          onClick={() => step === 0 ? go("roleSelect") : setStep(s => s - 1)}
          style={{ position: "absolute" as const, top: 48, left: 16, background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "36px 0 6px", fontFamily: QS }}>{stepHeadings[step]}</h1>
        <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, margin: 0 }}>{stepSubtitles[step]}</p>
      </div>

      <div style={{ height: 16 }} />
      <ProgressBar />

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "0 16px 32px" }}>

        {/* ── STEP 0: Personal Info ── */}
        {step === 0 && card(<>
          {/* First + Middle Name side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>First Name <span style={{ color: "#EF4444" }}>*</span></label>
              <input value={firstName} onChange={e => setFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                placeholder="Kyla" style={inputStyle(!!errors.firstName)} />
              {err("firstName")}
            </div>
            <div>
              <label style={labelStyle}>Middle Name</label>
              <input value={middleName} onChange={e => setMiddleName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                placeholder="Lodripas" style={inputStyle(!!errors.middleName)} />
              {err("middleName")}
            </div>
          </div>

          {/* Last Name */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Last Name <span style={{ color: "#EF4444" }}>*</span></label>
            <input value={lastName} onChange={e => setLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
              placeholder="Naquila" style={inputStyle(!!errors.lastName)} />
            {err("lastName")}
          </div>

          {/* Relation to Student */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Relation to Student <span style={{ color: "#EF4444" }}>*</span></label>
            <select value={relation} onChange={e => { setRelation(e.target.value); setSpecify(""); }}
              style={{ ...selectStyle(!!errors.relation), color: relation ? "#1F2937" : "#9CA3AF" }}>
              <option value="" disabled hidden>Select</option>
              {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {err("relation")}
          </div>

          {/* Specify relation if Other */}
          {relation === "Other" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Specify Relation <span style={{ color: "#EF4444" }}>*</span></label>
              <input value={specifyRelation} onChange={e => setSpecify(e.target.value)}
                placeholder="e.g. Step-parent, Legal Guardian..." style={inputStyle(!!errors.specifyRelation)} />
              {err("specifyRelation")}
            </div>
          )}

          {/* Sex */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Sex <span style={{ color: "#EF4444" }}>*</span></label>
            <select value={sex} onChange={e => setSex(e.target.value)}
              style={{ ...selectStyle(!!errors.sex), color: sex ? "#1F2937" : "#9CA3AF" }}>
              <option value="" disabled hidden>Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            {err("sex")}
          </div>

          {/* Contact */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Contact Number <span style={{ color: "#EF4444" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF", fontFamily: IN }}>+63</span>
              <input value={contact} onChange={e => setContact(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="09XXXXXXXXX" style={{ ...inputStyle(!!errors.contact), paddingLeft: 46 }} />
            </div>
            {err("contact")}
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>Complete Address <span style={{ color: "#EF4444" }}>*</span></label>
            <textarea value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Purok, Barangay, Municipality, Province" rows={3}
              style={{ ...inputStyle(!!errors.address), resize: "none" as const, lineHeight: 1.55 }} />
            {err("address")}
          </div>
        </>)}

        {/* ── STEP 1: Student Info ── */}
        {step === 1 && card(<>
          <div>
            <label style={labelStyle}>Student ID Number <span style={{ color: "#EF4444" }}>*</span></label>
            <input value={studentId} onChange={e => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="XXXXXX (6 digits)" style={inputStyle(!!errors.studentId)} />
            {err("studentId")}
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "6px 0 0", fontFamily: IN, fontStyle: "italic", lineHeight: 1.5 }}>
              The Student ID is used to link the parent account with the student account in the DormiTrack system.
            </p>
          </div>
        </>)}

        {/* ── STEP 2: Account Details ── */}
        {step === 2 && card(<>
          {/* Username — auto */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Username <span style={{ color: "#EF4444" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <User size={15} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input value={username || "—"} readOnly
                style={{ ...inputStyle(!!errors.username), paddingLeft: 38, paddingRight: 54, background: "#F3F4F6", color: username ? "#9772F6" : "#9CA3AF", fontWeight: username ? 700 : 400, cursor: "default" }} />
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#F0E6FF", borderRadius: 8, padding: "3px 8px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>AUTO</span>
              </div>
            </div>
            {err("username")}
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0", fontFamily: IN }}>Generated from your name — updates as you type.</p>
          </div>

          {/* Email */}
          <div style={fieldStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Email Address</label>
              <button
                onClick={() => { setEmailNA(!emailNA); setEmail(""); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: `2px solid ${emailNA ? "#9772F6" : "#D1D5DB"}`,
                  background: emailNA ? GRAD : "white",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "all .2s",
                }}>
                  {emailNA && <Check size={8} color="white" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 11, color: emailNA ? "#9772F6" : "#9CA3AF", fontFamily: QS, fontWeight: 700 }}>Not applicable</span>
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <Mail size={15} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input value={email} onChange={e => setEmail(e.target.value)} disabled={emailNA}
                placeholder="kylanaquila@gmail.com"
                style={{ ...inputStyle(!!errors.email), paddingLeft: 38, opacity: emailNA ? 0.45 : 1, cursor: emailNA ? "not-allowed" : "text", background: emailNA ? "#F3F4F6" : "#F9FAFB" }} />
            </div>
            {err("email")}
          </div>

          {/* Password */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Password <span style={{ color: "#EF4444" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <Lock size={15} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                style={{ ...inputStyle(!!errors.password), paddingLeft: 38, paddingRight: 44 }} />
              <button onClick={() => setShowPass(s => !s)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                {showPass ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            {err("password")}
          </div>

          {/* Confirm Password */}
          <div>
            <label style={labelStyle}>Confirm Password <span style={{ color: "#EF4444" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <Lock size={15} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                style={{ ...inputStyle(!!errors.confirmPassword), paddingLeft: 38, paddingRight: 44 }} />
              <button onClick={() => setShowConfirm(s => !s)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            {confirmPassword && password === confirmPassword && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
                <CheckCircle size={13} color="#16A34A" />
                <span style={{ fontSize: 11, color: "#16A34A", fontFamily: IN }}>Passwords match</span>
              </div>
            )}
            {err("confirmPassword")}
          </div>
        </>)}

        {/* Validation summary */}
        {submitted && Object.keys(errors).length > 0 && (
          <div style={{ background: "#FEF2F2", borderRadius: 16, padding: "12px 16px", marginBottom: 16, border: "1px solid #FECACA", display: "flex", gap: 10 }}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "#DC2626", margin: 0, fontFamily: IN, lineHeight: 1.55 }}>
              Please fix <strong>{Object.keys(errors).length}</strong> error{Object.keys(errors).length > 1 ? "s" : ""} before continuing.
            </p>
          </div>
        )}

        <button onClick={nextStep}
          style={{ width: "100%", height: 52, borderRadius: 24, border: "none", background: GRAD, color: "white", fontSize: 15, fontWeight: 800, fontFamily: QS, cursor: "pointer", boxShadow: "0 8px 24px rgba(151,114,246,.35)" }}>
          {step < 2 ? "Next" : "Create Account"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 16, fontFamily: IN }}>
          Already have an account?{" "}
          <button onClick={() => go("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9772F6", fontWeight: 700, fontSize: 12, fontFamily: QS }}>Sign In</button>
        </p>

      </div>
    </div>
  );
}

// ── Mock student IDs that "exist" in the DormiTrack database ──────────────────
const KNOWN_STUDENT_IDS = new Set(["123456", "654321", "111111", "202425", "200001"]);

const LOADING_MESSAGES = [
  "Connecting to the student's account...",
  "Searching for the Student ID...",
  "Verifying student information...",
  "Establishing a secure connection...",
  "Linking parent and student accounts...",
  "Almost done...",
];

export function ParentLinkingScreen({
  go,
  studentId,
  onEditStudentId,
}: {
  go: (s: Screen) => void;
  studentId: string;
  onEditStudentId: () => void;
}) {
  const QS = "'Quicksand',sans-serif";
  const IN = "'Inter',sans-serif";

  type Phase = "loading" | "success" | "error";
  const [phase, setPhase] = useState<Phase>("loading");
  const [msgIdx, setMsgIdx] = useState(0);
  const [fadeMsg, setFadeMsg] = useState(true);
  const [angle, setAngle] = useState(0);
  const [fadePhase, setFadePhase] = useState(true);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  // Spinner animation
  useEffect(() => {
    if (phase !== "loading") return;
    const spin = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      setAngle(((ts - startRef.current) / 1000) * 360);
      rafRef.current = requestAnimationFrame(spin);
    };
    rafRef.current = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // Cycle loading messages
  useEffect(() => {
    if (phase !== "loading") return;
    const cycle = setInterval(() => {
      setFadeMsg(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
        setFadeMsg(true);
      }, 300);
    }, 1600);
    return () => clearInterval(cycle);
  }, [phase]);

  // Auto-verify after 3.5 s
  useEffect(() => {
    const t = setTimeout(() => {
      const found = KNOWN_STUDENT_IDS.has(studentId.trim());
      setFadePhase(false);
      setTimeout(() => { setPhase(found ? "success" : "error"); setFadePhase(true); }, 400);
    }, 3500);
    return () => clearTimeout(t);
  }, [studentId]);

  const tryAgain = () => {
    setPhase("loading");
    setMsgIdx(0);
    setFadeMsg(true);
    setFadePhase(true);
    startRef.current = 0;
    const t = setTimeout(() => {
      const found = KNOWN_STUDENT_IDS.has(studentId.trim());
      setFadePhase(false);
      setTimeout(() => { setPhase(found ? "success" : "error"); setFadePhase(true); }, 400);
    }, 3000);
    return () => clearTimeout(t);
  };

  const card: React.CSSProperties = {
    background: "white", borderRadius: 24, padding: "24px 20px",
    boxShadow: "0 4px 24px rgba(0,0,0,.07)", marginBottom: 16,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: "52px 20px 28px", backgroundImage: GRAD_H, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <Link2 size={24} color="white" />
        </div>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 8px", fontFamily: QS }}>Linking Parent Account</h1>
        <p style={{ color: "rgba(255,255,255,.75)", fontSize: 12, margin: 0, fontFamily: IN, lineHeight: 1.55, padding: "0 16px" }}>
          Please wait while we connect your account with your student's DormiTrack account.
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "24px 16px 32px", opacity: fadePhase ? 1 : 0, transition: "opacity .35s" }}>

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <>
            <div style={{ ...card, textAlign: "center", padding: "40px 20px" }}>
              {/* Outer ring */}
              <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 28px" }}>
                <svg width={100} height={100} style={{ position: "absolute", top: 0, left: 0 }}>
                  <circle cx={50} cy={50} r={44} fill="none" stroke="#F3E8FF" strokeWidth={6} />
                  <circle cx={50} cy={50} r={44} fill="none" stroke="url(#spinGrad)" strokeWidth={6}
                    strokeDasharray={`${Math.PI * 88 * 0.7} ${Math.PI * 88 * 0.3}`}
                    strokeLinecap="round"
                    transform={`rotate(${angle - 90} 50 50)`} />
                  <defs>
                    <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#9772F6" />
                      <stop offset="100%" stopColor="#7549F6" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center icon */}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Link2 size={26} color="#9772F6" />
                </div>
              </div>

              {/* Two account bubbles */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "#F3E8FF", borderRadius: 16, padding: "10px 14px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                  <UserCheck size={20} color="#9772F6" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>Parent</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#9772F6", opacity: 0.3 + i * 0.3 }} />
                  ))}
                </div>
                <div style={{ background: "#EDE9FE", borderRadius: 16, padding: "10px 14px", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                  <User size={20} color="#7C3AED" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", fontFamily: QS }}>Student</span>
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, color: "#4B5563", fontFamily: QS, margin: "0 0 6px", opacity: fadeMsg ? 1 : 0, transition: "opacity .3s" }}>
                {LOADING_MESSAGES[msgIdx]}
              </p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontFamily: IN }}>Student ID: <strong style={{ color: "#9772F6" }}>{studentId}</strong></p>
            </div>

            <div style={{ ...card, background: "#FAFAFA", border: "1px dashed #E5E7EB", padding: "14px 18px" }}>
              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, fontFamily: IN, lineHeight: 1.6, textAlign: "center" }}>
                Please do not close or navigate away from this screen while verification is in progress.
              </p>
            </div>
          </>
        )}

        {/* ── SUCCESS ── */}
        {phase === "success" && (
          <>
            <div style={{ ...card, textAlign: "center", padding: "36px 20px" }}>
              {/* Animated checkmark */}
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#16A34A,#15803D)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(22,163,74,.3)" }}>
                <CheckCircle size={40} color="white" strokeWidth={2} />
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#15803D", margin: "0 0 10px", fontFamily: QS }}>Accounts Successfully Linked!</h2>
              <p style={{ fontSize: 13, color: "#4B5563", margin: "0 0 24px", fontFamily: IN, lineHeight: 1.6 }}>
                Great! Your Parent account has been successfully linked to the student's DormiTrack account. You can now monitor your student's boarding house information, payment status, and other available records.
              </p>

              {/* Link status */}
              <div style={{ background: "#F0FDF4", borderRadius: 16, padding: "16px 18px", textAlign: "left", display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  { label: "Parent Account", ok: true },
                  { label: "Student Account", ok: true },
                  { label: "Link Status", value: "Connected" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#374151", fontFamily: QS, fontWeight: 700 }}>{row.label}</span>
                    {row.ok !== undefined
                      ? <Check size={14} color="#16A34A" strokeWidth={3} />
                      : <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", fontFamily: QS, display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={11}/> {row.value}</span>}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => go("dashboard")} style={{ width: "100%", height: 52, borderRadius: 24, border: "none", background: GRAD, color: "white", fontSize: 15, fontWeight: 800, fontFamily: QS, cursor: "pointer", boxShadow: "0 8px 24px rgba(151,114,246,.35)" }}>
              Continue to Dashboard
            </button>
          </>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <>
            <div style={{ ...card, textAlign: "center", padding: "36px 20px" }}>
              {/* Warning icon */}
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#EF4444)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(239,68,68,.25)" }}>
                <AlertCircle size={40} color="white" strokeWidth={2} />
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#DC2626", margin: "0 0 10px", fontFamily: QS }}>Student Account Not Found</h2>
              <p style={{ fontSize: 13, color: "#4B5563", margin: "0 0 12px", fontFamily: IN, lineHeight: 1.6 }}>
                We couldn't find a DormiTrack student account associated with the Student ID Number you entered.
              </p>
              <div style={{ background: "#FEF3C7", borderRadius: 14, padding: "12px 16px", textAlign: "left", marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: "#92400E", margin: 0, fontFamily: IN, lineHeight: 1.6 }}>
                  Please check that the Student ID Number is correct, or ask the student to create their DormiTrack account first before linking.
                </p>
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, fontFamily: IN }}>
                Entered ID: <strong style={{ color: "#EF4444" }}>{studentId}</strong>
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, marginBottom: 16 }}>
              <button onClick={onEditStudentId} style={{ width: "100%", height: 52, borderRadius: 24, border: "2px solid #9772F6", background: "white", color: "#9772F6", fontSize: 14, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Edit3 size={16} /> Edit Student ID
              </button>
              <button onClick={tryAgain} style={{ width: "100%", height: 52, borderRadius: 24, border: "none", background: GRAD, color: "white", fontSize: 14, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 8px 24px rgba(151,114,246,.3)" }}>
                <RefreshCw size={16} /> Try Again
              </button>
            </div>

            {/* Info box */}
            <div style={{ background: "white", borderRadius: 20, padding: "18px 18px", boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <HelpCircle size={16} color="#9772F6" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: QS }}>Why couldn't we find the account?</span>
              </div>
              {[
                "The Student ID Number is incorrect.",
                "The student has not yet registered in DormiTrack.",
                "The student account has not been activated yet.",
              ].map((reason, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#9772F6", marginTop: 5, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.55 }}>{reason}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
