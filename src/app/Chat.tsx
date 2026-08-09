// ── Messages / Chat screens ─────────────────────────────────────────────────
// One shared, role-aware implementation (inbox + direct thread + group chat)
// used by all four roles, matching the pattern the rest of the app uses for
// shared screens (NotificationsScreen, MapScreen, etc. in App.tsx). Kept in
// its own file since chat is a large, self-contained feature.

import React, { useEffect, useRef, useState } from "react";
import {
  ChevronLeft, Search, Plus, Send, Paperclip, Check, CheckCheck,
  MessageCircle, X, Image as ImageIcon, FileText, Users, Camera,
  Info, UserPlus, LogOut, Trash2, Pencil, ChevronRight,
} from "lucide-react";
import type { Role } from "./shared";
import {
  ChatContact, GroupChat, MessageStatus, AttachmentKind, ConversationSummary,
  getAuthorizedContacts, getGroupEligibleContacts, getSelfContact, getContactById,
  useConversations, useMessages, useGroup,
  sendMessage, markConversationRead, conversationId,
  createGroup, sendGroupMessage, markGroupRead, renameGroup, setGroupPhoto,
  addGroupMembers, removeGroupMember, leaveGroup, deleteGroup,
} from "./chatStore";
import type { NotificationType } from "./notificationStore";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dateLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function previewText(text: string, attachment?: AttachmentKind): string {
  if (text) return text;
  if (attachment === "photo") return "Photo";
  if (attachment === "document") return "Document";
  return "";
}

// ── Avatars ──────────────────────────────────────────────────────────────────
function Avatar({ initials, color, online, size = 46 }: { initials: string; color: string; online?: boolean; size?: number }) {
  return (
    <div style={{ position: "relative" as const, width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.32, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "white", fontWeight: 800, fontFamily: QS, fontSize: size * 0.36 }}>{initials}</span>
      </div>
      {online && <div style={{ position: "absolute" as const, bottom: -1, right: -1, width: Math.round(size * 0.28), height: Math.round(size * 0.28), borderRadius: "50%", background: "#22C55E", border: "2px solid white" }} />}
    </div>
  );
}

function ContactAvatar({ contact, size = 46 }: { contact: ChatContact; size?: number }) {
  return <Avatar initials={contact.initials} color={contact.color} online={contact.online} size={size} />;
}

function GroupAvatar({ group, size = 46 }: { group: GroupChat; size?: number }) {
  if (!group.hasCustomPhoto) {
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.32, background: group.photoColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Users size={size * 0.46} color="white" />
      </div>
    );
  }
  return <Avatar initials={group.photoInitials} color={group.photoColor} size={size} />;
}

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === "read") return <CheckCheck size={12} color="#60A5FA" />;
  if (status === "delivered") return <CheckCheck size={12} color="rgba(255,255,255,.75)" />;
  return <Check size={12} color="rgba(255,255,255,.75)" />;
}

// ── Generic confirm dialog (matches the app's existing confirm-dialog style) ─
function ConfirmDialog({ icon: Icon, iconBg, iconColor, title, message, cancelLabel = "Cancel", confirmLabel, confirmColor, onCancel, onConfirm }: {
  icon: React.ElementType; iconBg: string; iconColor: string; title: string; message: string;
  cancelLabel?: string; confirmLabel: string; confirmColor: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }} onClick={onCancel}>
      <div style={{ background: "white", borderRadius: 24, padding: 24, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Icon size={20} color={iconColor} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1F2937", margin: "0 0 8px", fontFamily: QS }}>{title}</h3>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 20px", fontFamily: IN, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "none", color: "#6B7280", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: QS }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: confirmColor, border: "none", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: QS }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Plus button action sheet ─────────────────────────────────────────────────
function PlusActionSheet({ onClose, onNewChat, onCreateGroup }: { onClose: () => void; onNewChat: () => void; onCreateGroup: () => void }) {
  return (
    <div style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "10px 14px 28px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 10px" }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
        {[
          { Icon: MessageCircle, label: "New Chat", sub: "Message one person", color: "#9772F6", bg: "#F5F0FF", action: onNewChat },
          { Icon: Users, label: "Create Group Chat", sub: "Message multiple people at once", color: "#3B82F6", bg: "#EFF6FF", action: onCreateGroup },
        ].map(({ Icon, label, sub, color, bg, action }) => (
          <button key={label} onClick={action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", borderRadius: 16, border: "none", background: "none", cursor: "pointer", textAlign: "left" as const }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={19} color={color} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{label}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Shared searchable / role-filterable participant list ────────────────────
function ParticipantPicker({ contacts, selectedIds, onToggle }: { contacts: ChatContact[]; selectedIds: Set<string>; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Role | "all">("all");
  const roles = Array.from(new Set(contacts.map(c => c.role)));
  const shown = contacts.filter(c => {
    if (filter !== "all" && c.role !== filter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.roleLabel.toLowerCase().includes(s) || (c.subtitle ?? "").toLowerCase().includes(s);
  });
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F3F4F6", borderRadius: 14, padding: "10px 14px", marginBottom: 10 }}>
        <Search size={15} color="#9CA3AF" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, fontFamily: IN, color: "#1F2937" }} />
      </div>
      {roles.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" as const }}>
          {(["all", ...roles] as (Role | "all")[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 99, border: filter === f ? "none" : "1px solid #E5E7EB", cursor: "pointer", fontSize: 11, fontWeight: 800, fontFamily: QS, textTransform: "capitalize" as const, background: filter === f ? "#9772F6" : "white", color: filter === f ? "white" : "#6B7280", flexShrink: 0 }}>{f}</button>
          ))}
        </div>
      )}
      {shown.length === 0 && <p style={{ textAlign: "center" as const, color: "#9CA3AF", fontSize: 12, padding: "20px 0" }}>No matching contacts.</p>}
      {shown.map(c => {
        const selected = selectedIds.has(c.id);
        return (
          <div key={c.id} onClick={() => onToggle(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 8px", borderRadius: 14, cursor: "pointer", background: selected ? "rgba(151,114,246,.06)" : "transparent" }}>
            <ContactAvatar contact={c} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{c.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{c.roleLabel}{c.subtitle ? ` · ${c.subtitle}` : ""}</p>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: selected ? "none" : "1.5px solid #D1D5DB", background: selected ? "#9772F6" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {selected && <Check size={12} color="white" strokeWidth={3} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── New Chat (1:1) contact picker ────────────────────────────────────────────
function NewMessageModal({ role, onClose, onPick }: { role: Role; onClose: () => void; onPick: (c: ChatContact) => void }) {
  const contacts = getAuthorizedContacts(role);
  return (
    <div style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.5)", zIndex: 200, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", maxHeight: "85%", display: "flex", flexDirection: "column" as const }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #F3F4F6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>New Chat</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "12px 18px 24px" }}>
          <ParticipantPicker contacts={contacts} selectedIds={new Set()} onToggle={id => { const c = contacts.find(x => x.id === id); if (c) onPick(c); }} />
        </div>
      </div>
    </div>
  );
}

// ── New Group Chat page ──────────────────────────────────────────────────────
function NewGroupChatScreen({ role, onBack, onCreated }: { role: Role; onBack: () => void; onCreated: (groupId: string) => void }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasPhoto, setHasPhoto] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const contacts = getGroupEligibleContacts(role);
  const canCreate = name.trim().length > 0 && selected.size > 0;

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const create = () => {
    if (!canCreate) return;
    const group = createGroup(role, name, Array.from(selected));
    if (hasPhoto) setGroupPhoto(group.id);
    onCreated(group.id);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC", position: "relative" as const }}>
      <div style={{ flexShrink: 0, padding: "52px 20px 16px", backgroundImage: GRAD_H, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4 }}><ChevronLeft size={18} color="white" /></button>
        <h1 style={{ color: "white", fontSize: 18, fontWeight: 800, margin: 0, fontFamily: QS }}>New Group Chat</h1>
      </div>
      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "18px 20px 100px" }}>
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => setShowPhotoPicker(true)} style={{ position: "relative" as const, border: "none", background: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 76, height: 76, borderRadius: 24, background: hasPhoto ? "#9772F6" : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {hasPhoto ? <span style={{ color: "white", fontWeight: 800, fontFamily: QS, fontSize: 26 }}>{(name.trim() ? name.trim() : "GC").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}</span> : <Users size={30} color="#9CA3AF" />}
            </div>
            <div style={{ position: "absolute" as const, bottom: -4, right: -4, width: 26, height: 26, borderRadius: "50%", backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}><Camera size={12} color="white" /></div>
          </button>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>Add a group photo (optional)</p>
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 6, display: "block" }}>Group Name <span style={{ color: "#EF4444" }}>*</span></label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder='e.g. "Room 204 Residents"'
          style={{ width: "100%", boxSizing: "border-box" as const, padding: "13px 14px", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "white", color: "#1F2937", fontSize: 14, fontFamily: IN, outline: "none", marginBottom: 20 }} />

        <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 10 }}>
          Select Participants {selected.size > 0 && <span style={{ color: "#9772F6" }}>({selected.size} selected)</span>}
        </p>
        <ParticipantPicker contacts={contacts} selectedIds={selected} onToggle={toggle} />
      </div>

      {showPhotoPicker && (
        <div style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.5)", zIndex: 220, display: "flex", alignItems: "flex-end" as const }} onClick={() => setShowPhotoPicker(false)}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "10px 14px 28px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 10px" }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
            {[
              { Icon: ImageIcon, label: "Upload Photo" },
              { Icon: Camera, label: "Take Photo" },
            ].map(({ Icon, label }) => (
              <button key={label} onClick={() => { setHasPhoto(true); setShowPhotoPicker(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 8px", borderRadius: 16, border: "none", background: "none", cursor: "pointer", textAlign: "left" as const }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={18} color="#9772F6" /></div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: "absolute" as const, left: 0, right: 0, bottom: 0, padding: "14px 20px 26px", background: "white", borderTop: "1px solid #F3F4F6" }}>
        <button onClick={create} disabled={!canCreate} style={{ width: "100%", height: 50, borderRadius: 18, border: "none", cursor: canCreate ? "pointer" : "default", fontSize: 14, fontWeight: 800, fontFamily: QS, color: canCreate ? "white" : "#9CA3AF", background: canCreate ? GRAD : "#E5E7EB", boxShadow: canCreate ? "0 8px 24px rgba(151,114,246,.35)" : "none" }}>
          Create Group
        </button>
      </div>
    </div>
  );
}

// ── Add Members (existing group) ─────────────────────────────────────────────
function AddMembersModal({ role, group, onClose }: { role: Role; group: GroupChat; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const eligible = getGroupEligibleContacts(role).filter(c => !group.memberIds.includes(c.id));
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const add = () => {
    if (selected.size === 0) return;
    addGroupMembers(group.id, Array.from(selected));
    onClose();
  };
  return (
    <div style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.5)", zIndex: 260, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", maxHeight: "85%", display: "flex", flexDirection: "column" as const }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #F3F4F6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Add Members</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "12px 18px 12px" }}>
          {eligible.length === 0 ? (
            <p style={{ textAlign: "center" as const, color: "#9CA3AF", fontSize: 12, padding: "20px 0" }}>Everyone you can add is already in this group.</p>
          ) : (
            <ParticipantPicker contacts={eligible} selectedIds={selected} onToggle={toggle} />
          )}
        </div>
        {eligible.length > 0 && (
          <div style={{ padding: "10px 18px 22px", flexShrink: 0 }}>
            <button onClick={add} disabled={selected.size === 0} style={{ width: "100%", height: 48, borderRadius: 16, border: "none", cursor: selected.size ? "pointer" : "default", fontSize: 13, fontWeight: 800, fontFamily: QS, color: selected.size ? "white" : "#9CA3AF", background: selected.size ? GRAD : "#E5E7EB" }}>
              Add {selected.size > 0 ? `${selected.size} ` : ""}Member{selected.size === 1 ? "" : "s"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Group info panel ─────────────────────────────────────────────────────────
function GroupInfoModal({ role, group, onClose, onLeft }: { role: Role; group: GroupChat; onClose: () => void; onLeft: () => void }) {
  const self = getSelfContact(role);
  const isCreator = group.createdBy === self.id;
  const creator = getContactById(group.createdBy);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const saveName = () => { if (nameDraft.trim()) renameGroup(group.id, nameDraft); setEditingName(false); };

  return (
    <div style={{ position: "absolute" as const, inset: 0, background: "rgba(0,0,0,.5)", zIndex: 210, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#F7F8FC", borderRadius: "24px 24px 0 0", maxHeight: "88%", display: "flex", flexDirection: "column" as const }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 18px 14px", background: "white", borderBottom: "1px solid #F3F4F6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Group Info</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "20px 18px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", marginBottom: 20 }}>
            <div style={{ position: "relative" as const }}>
              <GroupAvatar group={group} size={76} />
              {isCreator && (
                <button onClick={() => setGroupPhoto(group.id)} style={{ position: "absolute" as const, bottom: -4, right: -4, width: 26, height: 26, borderRadius: "50%", backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white", cursor: "pointer" }}><Camera size={12} color="white" /></button>
              )}
            </div>
            {editingName ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, width: "100%" }}>
                <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} autoFocus
                  style={{ flex: 1, padding: "9px 12px", borderRadius: 12, border: "1.5px solid #9772F6", outline: "none", fontSize: 14, fontFamily: QS, fontWeight: 800, color: "#1F2937" }} />
                <button onClick={saveName} style={{ padding: "9px 14px", borderRadius: 12, border: "none", backgroundImage: GRAD, color: "white", fontSize: 12, fontWeight: 800, fontFamily: QS, cursor: "pointer" }}>Save</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{group.name}</p>
                {isCreator && <button onClick={() => { setNameDraft(group.name); setEditingName(true); }} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }}><Pencil size={13} color="#9772F6" /></button>}
              </div>
            )}
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>Created by {creator?.name ?? "Unknown"} · {dateLabel(group.createdAt)}</p>
          </div>

          {isCreator && (
            <button onClick={() => setShowAddMembers(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: "none", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,.05)", cursor: "pointer", marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center" }}><UserPlus size={16} color="#9772F6" /></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS, flex: 1, textAlign: "left" as const }}>Add Members</span>
              <ChevronRight size={15} color="#D1D5DB" />
            </button>
          )}

          <p style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.5, margin: "0 0 8px" }}>Members — {group.memberIds.length}</p>
          <div style={{ background: "white", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.05)", marginBottom: 20 }}>
            {group.memberIds.map((id, i) => {
              const member = getContactById(id);
              if (!member) return null;
              const isMemberCreator = id === group.createdBy;
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: i < group.memberIds.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                  <ContactAvatar contact={member} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{member.id === self.id ? "You" : member.name}</p>
                      {isMemberCreator && <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: "#F5F0FF", color: "#9772F6", fontFamily: QS }}>Creator</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{member.roleLabel}</p>
                  </div>
                  {isCreator && id !== self.id && (
                    <button onClick={() => removeGroupMember(group.id, id)} style={{ width: 28, height: 28, borderRadius: 9, background: "#FEF2F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={13} color="#EF4444" /></button>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => setShowLeaveConfirm(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: "none", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,.05)", cursor: "pointer", marginBottom: isCreator ? 10 : 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}><LogOut size={16} color="#D97706" /></div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#D97706", fontFamily: QS }}>Leave Group</span>
          </button>

          {isCreator && (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: "none", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,.05)", cursor: "pointer" }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={16} color="#EF4444" /></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", fontFamily: QS }}>Delete Group</span>
            </button>
          )}
        </div>
      </div>

      {showAddMembers && <AddMembersModal role={role} group={group} onClose={() => setShowAddMembers(false)} />}
      {showLeaveConfirm && (
        <ConfirmDialog icon={LogOut} iconBg="#FEF3C7" iconColor="#D97706" title="Leave this group?"
          message="Are you sure you want to leave this conversation? You will no longer receive messages from this group."
          confirmLabel="Leave Group" confirmColor="#D97706"
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={() => { leaveGroup(role, group.id); onLeft(); }} />
      )}
      {showDeleteConfirm && (
        <ConfirmDialog icon={Trash2} iconBg="#FEE2E2" iconColor="#EF4444" title="Delete this group?"
          message="This will permanently delete the group and its messages for all members. This cannot be undone."
          confirmLabel="Delete Group" confirmColor="#EF4444"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => { deleteGroup(group.id); onLeft(); }} />
      )}
    </div>
  );
}

// ── Direct message thread ────────────────────────────────────────────────────
function ChatThread({ role, contact, onBack }: { role: Role; contact: ChatContact; onBack: () => void }) {
  const self = getSelfContact(role);
  const cid = conversationId(self.id, contact.id);
  const messages = useMessages(cid);
  const [text, setText] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { markConversationRead(role, contact.id); }, [role, contact.id, messages.length]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    sendMessage(role, contact.id, text);
    setText("");
  };
  const sendAttachment = (kind: AttachmentKind) => {
    sendMessage(role, contact.id, "", kind);
    setShowAttach(false);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC", position: "relative" as const }}>
      <div style={{ flexShrink: 0, padding: "52px 16px 14px", backgroundImage: GRAD_H, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4, flexShrink: 0 }}><ChevronLeft size={18} color="white" /></button>
        <ContactAvatar contact={contact} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "white", fontFamily: QS, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{contact.name}</p>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,.75)", fontFamily: IN }}>{contact.roleLabel} · {contact.online ? "Online" : "Offline"}</p>
        </div>
      </div>

      {contact.context && contact.role !== "parent" && (
        <div style={{ flexShrink: 0, padding: "10px 16px", background: "white", borderBottom: "1px solid #F3F4F6", display: "flex", gap: 18, overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
          {contact.context.studentName && <ContextItem label="Student" val={contact.context.studentName} />}
          {contact.context.boardingHouse && <ContextItem label="Boarding House" val={contact.context.boardingHouse} />}
          {contact.context.room && <ContextItem label="Room" val={contact.context.room} />}
          {contact.context.bed && <ContextItem label="Bed" val={contact.context.bed} />}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "16px 14px" }}>
        {messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" as const, padding: "0 30px" }}>
            <ContactAvatar contact={contact} size={56} />
            <p style={{ margin: "12px 0 4px", fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{contact.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>Start your conversation with this {contact.roleLabel.toLowerCase()}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
            {messages.map(m => {
              const mine = m.senderId === self.id;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 6 }}>
                  <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column" as const, alignItems: mine ? "flex-end" : "flex-start" }}>
                    <div style={{ padding: "10px 14px", borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: mine ? GRAD : "white", boxShadow: mine ? undefined : "0 1px 4px rgba(0,0,0,.06)" }}>
                      {m.attachment ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 10, background: mine ? "rgba(255,255,255,.2)" : "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {m.attachment === "photo" ? <ImageIcon size={14} color={mine ? "white" : "#9772F6"} /> : <FileText size={14} color={mine ? "white" : "#9772F6"} />}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: mine ? "white" : "#1F2937", fontFamily: IN }}>{m.attachment === "photo" ? "Photo" : "Document"}</p>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: mine ? "white" : "#1F2937", fontFamily: IN, lineHeight: 1.45 }}>{m.text}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, padding: "0 4px" }}>
                      <span style={{ fontSize: 9, color: "#9CA3AF", fontFamily: IN }}>{timeLabel(m.timestamp)}</span>
                      {mine && <StatusIcon status={m.status} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showAttach && (
        <div style={{ position: "absolute" as const, left: 14, right: 14, bottom: 70, background: "white", borderRadius: 18, boxShadow: "0 8px 28px rgba(0,0,0,.15)", padding: 8, zIndex: 20, display: "flex", gap: 8 }}>
          <button onClick={() => sendAttachment("photo")} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 14, border: "none", background: "#F5F0FF", cursor: "pointer" }}>
            <ImageIcon size={18} color="#9772F6" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Photo</span>
          </button>
          <button onClick={() => sendAttachment("document")} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 14, border: "none", background: "#EFF6FF", cursor: "pointer" }}>
            <FileText size={18} color="#3B82F6" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Document</span>
          </button>
        </div>
      )}

      <div style={{ flexShrink: 0, padding: "10px 14px", background: "white", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setShowAttach(s => !s)} style={{ width: 38, height: 38, borderRadius: 12, background: showAttach ? "#F5F0FF" : "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Paperclip size={16} color={showAttach ? "#9772F6" : "#6B7280"} /></button>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message..." style={{ flex: 1, padding: "11px 14px", borderRadius: 20, border: "1.5px solid #E5E7EB", outline: "none", fontSize: 13, fontFamily: IN, color: "#1F2937" }} />
        <button onClick={send} disabled={!text.trim()} style={{ width: 38, height: 38, borderRadius: 12, background: text.trim() ? GRAD : "#E5E7EB", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={15} color={text.trim() ? "white" : "#9CA3AF"} /></button>
      </div>
    </div>
  );
}

// ── Group chat thread ─────────────────────────────────────────────────────────
function GroupChatThread({ role, groupId, onBack }: { role: Role; groupId: string; onBack: () => void }) {
  const self = getSelfContact(role);
  const group = useGroup(groupId);
  const messages = useMessages(groupId);
  const [text, setText] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (group) markGroupRead(role, groupId); }, [role, groupId, messages.length, group]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Deleted, or I left / was removed — back out to the inbox.
  useEffect(() => { if (!group || !group.memberIds.includes(self.id)) onBack(); }, [group, self.id, onBack]);

  if (!group) return null;

  const send = () => { if (!text.trim()) return; sendGroupMessage(role, groupId, text); setText(""); };
  const sendAttachment = (kind: AttachmentKind) => { sendGroupMessage(role, groupId, "", kind); setShowAttach(false); };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC", position: "relative" as const }}>
      <div style={{ flexShrink: 0, padding: "52px 16px 14px", backgroundImage: GRAD_H, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4, flexShrink: 0 }}><ChevronLeft size={18} color="white" /></button>
        <button onClick={() => setShowInfo(true)} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" as const }}>
          <GroupAvatar group={group} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "white", fontFamily: QS, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{group.name}</p>
            <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,.75)", fontFamily: IN }}>{group.memberIds.length} members</p>
          </div>
        </button>
        <button onClick={() => setShowInfo(true)} style={{ width: 34, height: 34, borderRadius: 12, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Info size={16} color="white" /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "16px 14px" }}>
        {messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" as const, padding: "0 30px" }}>
            <GroupAvatar group={group} size={56} />
            <p style={{ margin: "12px 0 4px", fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{group.name}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>Start the conversation with this group.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
            {messages.map(m => {
              const mine = m.senderId === self.id;
              const sender = getContactById(m.senderId);
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 6, gap: 8 }}>
                  {!mine && (sender ? <ContactAvatar contact={sender} size={26} /> : <div style={{ width: 26, flexShrink: 0 }} />)}
                  <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column" as const, alignItems: mine ? "flex-end" : "flex-start" }}>
                    {!mine && <span style={{ fontSize: 10, fontWeight: 700, color: "#9772F6", fontFamily: QS, margin: "0 0 2px 4px" }}>{sender?.name ?? "Unknown"}</span>}
                    <div style={{ padding: "10px 14px", borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: mine ? GRAD : "white", boxShadow: mine ? undefined : "0 1px 4px rgba(0,0,0,.06)" }}>
                      {m.attachment ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 10, background: mine ? "rgba(255,255,255,.2)" : "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {m.attachment === "photo" ? <ImageIcon size={14} color={mine ? "white" : "#9772F6"} /> : <FileText size={14} color={mine ? "white" : "#9772F6"} />}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: mine ? "white" : "#1F2937", fontFamily: IN }}>{m.attachment === "photo" ? "Photo" : "Document"}</p>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: mine ? "white" : "#1F2937", fontFamily: IN, lineHeight: 1.45 }}>{m.text}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, padding: "0 4px" }}>
                      <span style={{ fontSize: 9, color: "#9CA3AF", fontFamily: IN }}>{timeLabel(m.timestamp)}</span>
                      {mine && <StatusIcon status={m.status} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showAttach && (
        <div style={{ position: "absolute" as const, left: 14, right: 14, bottom: 70, background: "white", borderRadius: 18, boxShadow: "0 8px 28px rgba(0,0,0,.15)", padding: 8, zIndex: 20, display: "flex", gap: 8 }}>
          <button onClick={() => sendAttachment("photo")} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 14, border: "none", background: "#F5F0FF", cursor: "pointer" }}>
            <ImageIcon size={18} color="#9772F6" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Photo</span>
          </button>
          <button onClick={() => sendAttachment("document")} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 14, border: "none", background: "#EFF6FF", cursor: "pointer" }}>
            <FileText size={18} color="#3B82F6" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Document</span>
          </button>
        </div>
      )}

      <div style={{ flexShrink: 0, padding: "10px 14px", background: "white", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => setShowAttach(s => !s)} style={{ width: 38, height: 38, borderRadius: 12, background: showAttach ? "#F5F0FF" : "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Paperclip size={16} color={showAttach ? "#9772F6" : "#6B7280"} /></button>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message..." style={{ flex: 1, padding: "11px 14px", borderRadius: 20, border: "1.5px solid #E5E7EB", outline: "none", fontSize: 13, fontFamily: IN, color: "#1F2937" }} />
        <button onClick={send} disabled={!text.trim()} style={{ width: 38, height: 38, borderRadius: 12, background: text.trim() ? GRAD : "#E5E7EB", border: "none", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={15} color={text.trim() ? "white" : "#9CA3AF"} /></button>
      </div>

      {showInfo && <GroupInfoModal role={role} group={group} onClose={() => setShowInfo(false)} onLeft={() => { setShowInfo(false); onBack(); }} />}
    </div>
  );
}

function ContextItem({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <p style={{ margin: "0 0 1px", fontSize: 9, color: "#9CA3AF", fontWeight: 700, fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{val}</p>
    </div>
  );
}

// ── Messages inbox ───────────────────────────────────────────────────────────
export function MessagesScreen({ go, role, pendingDeepLink, onDeepLinkConsumed }: {
  go: (s: string) => void; role: Role;
  pendingDeepLink?: { type: NotificationType; relatedId?: string } | null;
  onDeepLinkConsumed?: () => void;
}) {
  const conversations = useConversations(role);
  const self = getSelfContact(role);
  const [open, setOpen] = useState<ConversationSummary | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [search, setSearch] = useState("");
  const [showPlusSheet, setShowPlusSheet] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  // Opened from a "message" notification, or another screen's "Message"
  // action — jump straight into that thread (direct or group).
  useEffect(() => {
    if (pendingDeepLink?.type === "message" && pendingDeepLink.relatedId) {
      const match = conversations.find(c => c.key === pendingDeepLink.relatedId || c.contact?.id === pendingDeepLink.relatedId);
      if (match) setOpen(match);
      onDeepLinkConsumed?.();
    }
  }, [pendingDeepLink, onDeepLinkConsumed, conversations]);

  if (creatingGroup) {
    return <NewGroupChatScreen role={role} onBack={() => setCreatingGroup(false)} onCreated={groupId => {
      setCreatingGroup(false);
      const match = conversations.find(c => c.key === groupId) ?? null;
      // Freshly created — conversations hasn't re-derived yet on this render; open by id directly.
      setOpen(match ?? { kind: "group", key: groupId, title: "", subtitle: "", avatarInitials: "", avatarColor: "", lastMessage: null, unreadCount: 0 });
    }} />;
  }

  if (open) {
    return open.kind === "group"
      ? <GroupChatThread role={role} groupId={open.key} onBack={() => setOpen(null)} />
      : <ChatThread role={role} contact={open.contact!} onBack={() => setOpen(null)} />;
  }

  const filtered = conversations.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return c.title.toLowerCase().includes(s)
      || c.subtitle.toLowerCase().includes(s)
      || (c.contact?.subtitle ?? "").toLowerCase().includes(s)
      || (c.contact?.context?.boardingHouse ?? "").toLowerCase().includes(s);
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC" }}>
      <div style={{ flexShrink: 0, padding: "52px 20px 16px", backgroundImage: GRAD_H }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => go("dashboard")} style={{ background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 4 }}><ChevronLeft size={18} color="white" /></button>
            <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: QS }}>Messages</h1>
          </div>
          <button onClick={() => setShowPlusSheet(true)} style={{ width: 34, height: 34, borderRadius: 12, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Plus size={18} color="white" /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.15)", borderRadius: 14, padding: "10px 14px" }}>
          <Search size={15} color="rgba(255,255,255,.85)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, fontFamily: IN, color: "white" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const }}>
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" as const }}>
            <MessageCircle size={44} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <p style={{ fontWeight: 800, fontSize: 15, color: "#374151", margin: "0 0 4px", fontFamily: QS }}>No Messages</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Your conversations will appear here.</p>
          </div>
        ) : (
          <div style={{ padding: "8px 12px 20px" }}>
            {filtered.map(c => (
              <div key={c.key} onClick={() => setOpen(c)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderRadius: 18, cursor: "pointer", background: c.unreadCount > 0 ? "rgba(151,114,246,.07)" : "transparent" }}>
                {c.kind === "group" ? <GroupAvatar group={c.group!} /> : <Avatar initials={c.avatarInitials} color={c.avatarColor} online={c.online} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</p>
                    {c.lastMessage && <span style={{ fontSize: 10, color: c.unreadCount > 0 ? "#9772F6" : "#9CA3AF", fontWeight: c.unreadCount > 0 ? 800 : 600, flexShrink: 0 }}>{timeLabel(c.lastMessage.timestamp)}</span>}
                  </div>
                  <p style={{ margin: "1px 0 3px", fontSize: 10, color: "#9772F6", fontWeight: 700, fontFamily: QS }}>{c.subtitle}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, color: c.unreadCount > 0 ? "#374151" : "#9CA3AF", fontWeight: c.unreadCount > 0 ? 700 : 400, fontFamily: IN, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                      {c.lastMessage
                        ? `${c.lastMessage.senderId === self.id ? "You: " : c.kind === "group" ? `${getContactById(c.lastMessage.senderId)?.name.split(" ")[0] ?? ""}: ` : ""}${previewText(c.lastMessage.text, c.lastMessage.attachment)}`
                        : "Start a conversation"}
                    </p>
                    {c.unreadCount > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#9772F6", color: "white", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>{c.unreadCount > 99 ? "99+" : c.unreadCount}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showPlusSheet && (
        <PlusActionSheet
          onClose={() => setShowPlusSheet(false)}
          onNewChat={() => { setShowPlusSheet(false); setShowNewChat(true); }}
          onCreateGroup={() => { setShowPlusSheet(false); setCreatingGroup(true); }}
        />
      )}
      {showNewChat && <NewMessageModal role={role} onClose={() => setShowNewChat(false)} onPick={c => { setShowNewChat(false); setOpen({ kind: "direct", key: conversationId(self.id, c.id), title: c.name, subtitle: c.roleLabel, avatarInitials: c.initials, avatarColor: c.color, online: c.online, contact: c, lastMessage: null, unreadCount: 0 }); }} />}
    </div>
  );
}
