import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Check, Eye, EyeOff, Mail, Lock, GraduationCap,
  AlertCircle,
} from "lucide-react";
import { GRAD, GRAD_H, Screen, StudentProfile } from "./shared";
import { supabase } from "../lib/supabase";

const YEAR_LEVEL_TO_INT: Record<string, number> = { "First Year": 1, "Second Year": 2, "Third Year": 3, "Fourth Year": 4 };

export function StudentSignUpScreen({ go, onSignup }: { go: (s: Screen) => void; onSignup: (p: StudentProfile) => void }) {
  const QS = "'Quicksand',sans-serif";
  const IN = "'Inter',sans-serif";

  const STEPS = ["Personal", "School", "Account"];
  const [step, setStep] = useState(0);

  // ── Personal Info ────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [sex, setSex] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");

  // ── School Info ──────────────────────────────────────────────────────────────
  const [studentId, setStudentId] = useState("");
  const [program, setProgram] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [block, setBlock] = useState("");

  // ── Account Info ─────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Errors ───────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [creating, setCreating] = useState(false);

  // ── Derived: auto-generated username ─────────────────────────────────────────
  const username = (() => {
    const f = firstName.trim().toLowerCase().replace(/\s+/g, "");
    const mi = middleName.trim().toLowerCase().replace(/\s+/g, "")[0] ?? "";
    const l = lastName.trim().toLowerCase().replace(/\s+/g, "");
    if (!f && !mi && !l) return "";
    return [f, mi, l].filter(Boolean).join("_");
  })();

  // ── Auto-calculate age from birthdate ────────────────────────────────────────
  useEffect(() => {
    if (!birthdate) return;
    const today = new Date();
    const dob = new Date(birthdate);
    let a = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
    setAge(a > 0 ? String(a) : "");
  }, [birthdate]);

  // ── Per-step validation ───────────────────────────────────────────────────────
  const validate0 = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!middleName.trim()) e.middleName = "Middle name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!birthdate) e.birthdate = "Birthdate is required.";
    if (!sex) e.sex = "Please select your sex.";
    if (!contact.trim()) e.contact = "Contact number is required.";
    else if (!/^\d{11}$/.test(contact.trim())) e.contact = "Contact number must be exactly 11 digits.";
    if (!address.trim()) e.address = "Complete address is required.";
    return e;
  };
  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!studentId.trim()) e.studentId = "Student ID is required.";
    else if (!/^\d{6}$/.test(studentId.trim())) e.studentId = "Student ID must be exactly 6 digits.";
    if (!program) e.program = "Please select your program.";
    if (!yearLevel) e.yearLevel = "Please select your year level.";
    if (!block) e.block = "Please select your block.";
    return e;
  };
  const validate2 = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "BISU email is required.";
    else if (!/^[^\s@]+@bisu\.edu\.ph$/.test(email.trim())) e.email = "Must be a valid @bisu.edu.ph email.";
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
      else createAccount();
    }
  };

  const createAccount = async () => {
    setCreating(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: "student",
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
      setCreating(false);
      setSubmitted(true);
      setErrors({ email: error?.message ?? "Could not create your account. Please try again." });
      return;
    }
    // username is unique per student — two people can easily generate the same
    // first_mi_last combination (e.g. two "Juan D. Dela Cruz"s), and so can a landlord or parent
    // signing up separately (their own usernames follow this same pattern too, and now share this
    // pool of the same names — see is_username_taken). Rather than letting either crash signup
    // outright, retry with an increasing numeric suffix appended directly after the last name (no
    // underscore): "juan_d_delacruz", then "juan_d_delacruz2", "juan_d_delacruz3", ...
    let finalUsername = username;
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data: taken } = await supabase.rpc("is_username_taken", { p_username: finalUsername });
      if (taken) { finalUsername = `${username}${attempt + 2}`; continue; }
      const { error: profileError } = await supabase.from("students").insert({
        user_id: data.user.id,
        student_id_no: studentId.trim(),
        username: finalUsername,
        age: age ? Number(age) : null,
        birthdate,
        program,
        year_level: YEAR_LEVEL_TO_INT[yearLevel] ?? null,
        block,
      });
      if (!profileError) { lastError = null; break; }
      lastError = profileError.message;
      const isUsernameConflict = profileError.code === "23505" && profileError.message.toLowerCase().includes("username");
      if (!isUsernameConflict) break; // a different failure (e.g. duplicate student ID) — don't mask it by retrying
      finalUsername = `${username}${attempt + 2}`;
    }
    setCreating(false);
    if (lastError) {
      setSubmitted(true);
      setErrors({ studentId: lastError });
      return;
    }
    onSignup({ firstName, middleName, lastName, username: finalUsername, age, birthdate, sex, contact, address, studentId, program, yearLevel, block, email });
    go("boardingReg");
  };

  const handleSubmit = nextStep;

  const err = (key: string) =>
    errors[key] ? (
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#EF4444", fontFamily: IN }}>{errors[key]}</p>
    ) : null;

  // ── Reusable field styles ─────────────────────────────────────────────────────
  const inputStyle = (hasErr: boolean): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "13px 14px",
    borderRadius: 14,
    border: `1.5px solid ${hasErr ? "#EF4444" : "#E5E7EB"}`,
    background: "#F9FAFB",
    color: "#1F2937",
    fontSize: 14,
    fontFamily: IN,
    outline: "none",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    fontFamily: QS,
    marginBottom: 6,
    display: "block",
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 16 };

  const programs = [
    "Bachelor of Science in Midwifery",
    "Bachelor of Science in Fisheries",
    "Bachelor of Science in Computer Science",
    "BIndTech - ELT",
    "BIndTech - FPST",
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education - English",
    "Bachelor of Secondary Education - Mathematics",
  ];

  const sectionCard = (title: string, children: React.ReactNode) => (
    <div style={{ background: "white", borderRadius: 24, padding: "20px 18px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: "#9772F6", fontFamily: QS, margin: "0 0 18px", letterSpacing: 0.2 }}>{title}</p>
      {children}
    </div>
  );

  const selectStyle = (hasErr: boolean): React.CSSProperties => ({
    ...inputStyle(hasErr),
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: 40,
    cursor: "pointer",
    color: sex || program || yearLevel || block ? "#1F2937" : "#9CA3AF",
  });

  const ProgressBar = () => (
    <div style={{ padding: "4px 20px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center" }}>
              <div
                onClick={() => i < step && setStep(i)}
                style={{ width: 28, height: 28, borderRadius: "50%", background: i <= step ? GRAD : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: i <= step ? "0 2px 8px rgba(151,114,246,.35)" : "none", cursor: i < step ? "pointer" : "default", transition: "transform .15s", }}
                onMouseEnter={e => { if (i < step) (e.currentTarget as HTMLDivElement).style.transform = "scale(1.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}>
                {i < step
                  ? <Check size={13} color="white" strokeWidth={3}/>
                  : <span style={{ fontSize: 11, fontWeight: 800, color: i <= step ? "white" : "#9CA3AF", fontFamily: QS }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: i <= step ? "#9772F6" : "#9CA3AF", fontFamily: QS, marginTop: 4, whiteSpace: "nowrap" as const }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? "#9772F6" : "#E5E7EB", marginBottom: 14, transition: "background .3s" }}/>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const stepTitles = ["Provide your personal information.", "Enter your school details.", "Set up your login credentials."];
  const stepHeadings = ["Personal Information", "School Information", "Account Information"];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC" }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: "48px 20px 24px", backgroundImage: GRAD_H, position: "relative" as const }}>
        <button onClick={() => step === 0 ? go("roleSelect") : setStep(s => s - 1)} style={{ position: "absolute" as const, top: 48, left: 16, background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: "white", fontSize: 22, fontWeight: 800, margin: "36px 0 6px", fontFamily: QS }}>{stepHeadings[step]}</h1>
        <p style={{ color: "rgba(255,255,255,.75)", fontSize: 13, margin: 0 }}>{stepTitles[step]}</p>
      </div>
      <div style={{ height: 16 }} />
      <ProgressBar />

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "0 16px 32px" }}>

        {/* ── STEP 0: Personal Info ── */}
        {step === 0 && (
          <div style={{ background: "white", borderRadius: 24, padding: "20px 18px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>First Name <span style={{ color: "#EF4444" }}>*</span></label>
                <input value={firstName} onChange={e => setFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))} placeholder="Kyla" style={inputStyle(!!errors.firstName)} />
                {err("firstName")}
              </div>
              <div>
                <label style={labelStyle}>Middle Name <span style={{ color: "#EF4444" }}>*</span></label>
                <input value={middleName} onChange={e => setMiddleName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))} placeholder="Lodripas" style={inputStyle(!!errors.middleName)} />
                {err("middleName")}
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Last Name <span style={{ color: "#EF4444" }}>*</span></label>
              <input value={lastName} onChange={e => setLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))} placeholder="Naquila" style={inputStyle(!!errors.lastName)} />
              {err("lastName")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Birthdate <span style={{ color: "#EF4444" }}>*</span></label>
                <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} style={{ ...inputStyle(!!errors.birthdate), color: birthdate ? "#1F2937" : "#9CA3AF" }} />
                {err("birthdate")}
              </div>
              <div>
                <label style={labelStyle}>Age</label>
                <input value={age} readOnly placeholder="Auto" style={{ ...inputStyle(false), background: "#F3F4F6", color: "#6B7280", cursor: "default" }} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Sex <span style={{ color: "#EF4444" }}>*</span></label>
              <select value={sex} onChange={e => setSex(e.target.value)} style={{ ...selectStyle(!!errors.sex), color: sex ? "#1F2937" : "#9CA3AF" }}>
                <option value="" disabled hidden>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {err("sex")}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Contact Number <span style={{ color: "#EF4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF", fontFamily: IN }}>+63</span>
                <input value={contact} onChange={e => setContact(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="09XXXXXXXXX" style={{ ...inputStyle(!!errors.contact), paddingLeft: 46 }} />
              </div>
              {err("contact")}
            </div>
            <div>
              <label style={labelStyle}>Complete Address <span style={{ color: "#EF4444" }}>*</span></label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Purok, Barangay, Municipality, Province" rows={3}
                style={{ ...inputStyle(!!errors.address), resize: "none" as const, lineHeight: 1.55 }} />
              {err("address")}
            </div>
          </div>
        )}

        {/* ── STEP 1: School Info ── */}
        {step === 1 && (
          <div style={{ background: "white", borderRadius: 24, padding: "20px 18px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Student ID <span style={{ color: "#EF4444" }}>*</span></label>
              <input value={studentId} onChange={e => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="XXXXXX (6 digits)" style={inputStyle(!!errors.studentId)} />
              {err("studentId")}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Program <span style={{ color: "#EF4444" }}>*</span></label>
              <select value={program} onChange={e => setProgram(e.target.value)} style={{ ...selectStyle(!!errors.program), color: program ? "#1F2937" : "#9CA3AF" }}>
                <option value="" disabled hidden>Select</option>
                {programs.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {err("program")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Year Level <span style={{ color: "#EF4444" }}>*</span></label>
                <select value={yearLevel} onChange={e => setYearLevel(e.target.value)} style={{ ...selectStyle(!!errors.yearLevel), color: yearLevel ? "#1F2937" : "#9CA3AF" }}>
                  <option value="" disabled hidden>Select</option>
                  {["First Year", "Second Year", "Third Year", "Fourth Year"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {err("yearLevel")}
              </div>
              <div>
                <label style={labelStyle}>Block <span style={{ color: "#EF4444" }}>*</span></label>
                <select value={block} onChange={e => setBlock(e.target.value)} style={{ ...selectStyle(!!errors.block), color: block ? "#1F2937" : "#9CA3AF" }}>
                  <option value="" disabled hidden>Select</option>
                  {["A", "B", "N/A"].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {err("block")}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Account Info ── */}
        {step === 2 && (
          <div style={{ background: "white", borderRadius: 24, padding: "20px 18px", marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: "relative" }}>
                <input value={username || "—"} readOnly
                  style={{ ...inputStyle(false), background: "#F3F4F6", color: username ? "#9772F6" : "#9CA3AF", fontWeight: username ? 700 : 400, cursor: "default", paddingRight: 54 }} />
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#F0E6FF", borderRadius: 8, padding: "3px 8px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>AUTO</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0", fontFamily: IN }}>Generated from your name — updates as you type.</p>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>BISU Email <span style={{ color: "#EF4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <Mail size={15} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="example@bisu.edu.ph" autoComplete="off"
                  style={{ ...inputStyle(!!errors.email), paddingLeft: 38 }} />
              </div>
              {err("email")}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password <span style={{ color: "#EF4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <Lock size={15} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.password), paddingLeft: 38, paddingRight: 44 }} />
                <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                  {showPass ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              {err("password")}
            </div>
            <div>
              <label style={labelStyle}>Confirm Password <span style={{ color: "#EF4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <Lock size={15} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" autoComplete="new-password"
                  style={{ ...inputStyle(!!errors.confirmPassword), paddingLeft: 38, paddingRight: 44 }} />
                <button onClick={() => setShowConfirm(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                  {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#EF4444", fontFamily: IN }}>Passwords do not match.</p>}
              {confirmPassword && password === confirmPassword && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#16A34A", fontFamily: IN, display: "flex", alignItems: "center", gap: 4 }}><Check size={11}/> Passwords match.</p>}
              {err("confirmPassword")}
            </div>
          </div>
        )}

        {/* Validation summary */}
        {submitted && Object.keys(errors).length > 0 && (
          <div style={{ background: "#FEF2F2", borderRadius: 16, padding: "12px 16px", marginBottom: 16, border: "1px solid #FECACA", display: "flex", gap: 10 }}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "#DC2626", margin: 0, fontFamily: IN, lineHeight: 1.55 }}>
              Please fix <strong>{Object.keys(errors).length}</strong> error{Object.keys(errors).length > 1 ? "s" : ""} before continuing.
            </p>
          </div>
        )}

        <button onClick={nextStep} disabled={creating}
          style={{ width: "100%", height: 52, borderRadius: 24, border: "none", background: creating ? "#C4B5FD" : GRAD, color: "white", fontSize: 15, fontWeight: 800, fontFamily: QS, cursor: creating ? "default" : "pointer", boxShadow: "0 8px 24px rgba(151,114,246,.35)" }}>
          {step < 2 ? "Next" : creating ? "Creating Account…" : "Create Account"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 16, fontFamily: IN }}>
          Already have an account?{" "}
          <button onClick={() => go("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9772F6", fontWeight: 700, fontSize: 12, fontFamily: QS }}>Log In</button>
        </p>
      </div>
    </div>
  );
}

// ── BOARDING HOUSE REGISTRATION FLOW ──────────────────────────────────────────

const TRAITS = ["Friendly","Quiet","Respectful","Responsible","Organized","Independent","Studious","Outgoing","Calm","Clean","Helpful","Disciplined"];
const HOBBIES = ["Reading","Gaming","Watching Movies","Cooking","Music","Sports","Photography","Drawing","Programming","Fitness","Traveling","Dancing","Singing","Cycling","Volunteering"];
const LIFESTYLE = ["Early Bird","Night Owl","Minimalist","Social","Private","Pet Lover","Non-Smoker"];

