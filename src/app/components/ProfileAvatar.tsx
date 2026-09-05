// Shared profile-photo avatar + upload/remove UI — used by every role's
// Profile screen (Student/Parent/Landlord/Admin). Previously each of those
// screens duplicated the same small camera-badge + "Remove Photo" text link
// underneath it; this replaces both with a single tap target on the avatar
// itself: with no existing photo, tapping it opens the file picker directly
// (the camera badge stays as the visual cue); with an existing photo, tapping
// it opens a small action sheet ("Change Photo" / "Remove Photo") instead —
// the camera badge and the standalone remove link are both gone once a photo
// exists, since the avatar itself is now the single entry point for both actions.
import React, { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";

const QS = "'Quicksand',sans-serif";

export function ProfileAvatar({
  photo, fallback, size = 108, onSelectFile, onRemove,
}: {
  photo: string | null;
  fallback: React.ReactNode;
  size?: number;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <div style={{ position: "relative" as const, display: "inline-block" }}>
        <div
          onClick={() => { if (photo) setShowMenu(true); else inputRef.current?.click(); }}
          style={{ width: size, height: size, borderRadius: "50%", background: photo ? "transparent" : "rgba(255,255,255,.2)", border: "3px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}
        >
          {photo ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} alt="profile" /> : fallback}
        </div>
        {/* Camera badge only makes sense as "add a photo" — once one exists, tapping
            the avatar opens the action sheet below instead, so the badge (and the old
            separate "Remove Photo" link) both disappear. */}
        {!photo && (
          <div style={{ position: "absolute" as const, bottom: -6, right: -6, width: 28, height: 28, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.15)", pointerEvents: "none" as const }}>
            <Camera size={13} color="#9772F6" />
          </div>
        )}
        <input
          ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files?.[0];
            e.target.value = ""; // lets the same file be re-selected next time
            if (f) onSelectFile(f);
          }}
        />
      </div>

      {showMenu && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowMenu(false)}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "10px 16px 28px", width: "100%", maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E5E7EB", margin: "6px auto 16px" }} />
            <button onClick={() => { setShowMenu(false); inputRef.current?.click(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 6px", background: "none", border: "none", borderBottom: "1px solid #F3F4F6", cursor: "pointer", textAlign: "left" as const }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Camera size={15} color="#9772F6" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>Change Photo</span>
            </button>
            <button onClick={() => { setShowMenu(false); onRemove(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 6px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Trash2 size={15} color="#EF4444" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", fontFamily: QS }}>Remove Photo</span>
            </button>
            <button onClick={() => setShowMenu(false)} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "white", color: "#6B7280", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: QS }}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
