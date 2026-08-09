// ── Chat / Messaging System — module-level store ───────────────────────────────
// Same architecture as reportStore.ts / notificationStore.ts: one in-memory
// store (no backend in this prototype), a tiny pub/sub layer, and
// useSyncExternalStore-backed hooks so the inbox, unread badges, and open
// conversation all re-render instantly and automatically — no manual refresh.
//
// Contact model: this app only ever lets you "be" one persona per role
// (the same singleton STUDENT_DATA/PARENT_DATA/BH_DATA pattern used
// throughout the rest of the app). Conversations are therefore keyed by a
// stable, order-independent pair of contact ids, so the same thread reads
// correctly regardless of which role is currently viewing it.

import { useMemo, useSyncExternalStore } from "react";
import type { Role } from "./shared";
import { STUDENT_DATA, BH_DATA } from "./StudentHome";
import { PARENT_DATA } from "./ParentHome";
import { INITIAL_PAYMENTS } from "./LandlordPayments";
import { addNotification } from "./notificationStore";

export type MessageStatus = "sent" | "delivered" | "read";

export type AttachmentKind = "photo" | "document";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: MessageStatus;
  attachment?: AttachmentKind;
}

export interface ChatContact {
  id: string;
  name: string;
  role: Role;
  roleLabel: string;
  subtitle?: string;
  online: boolean;
  initials: string;
  color: string;
  context?: { boardingHouse?: string; room?: string; bed?: string; studentName?: string };
}

export interface GroupChat {
  id: string;
  name: string;
  photoInitials: string;
  photoColor: string;
  hasCustomPhoto: boolean;  // false → render the default group icon instead of initials
  createdBy: string;        // contact id of the creator / group admin
  createdAt: number;
  memberIds: string[];      // includes the creator
}

export interface ConversationSummary {
  kind: "direct" | "group";
  key: string;                 // conversationId for direct, group id for group — used to open the thread
  title: string;
  subtitle: string;
  avatarInitials: string;
  avatarColor: string;
  online?: boolean;
  memberCount?: number;
  contact?: ChatContact;
  group?: GroupChat;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

const ROLE_LABEL: Record<Role, string> = {
  student: "Student", parent: "Parent / Guardian", landlord: "Landlord", admin: "Admin",
};

const initials = (name: string) => name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
const AVATAR_COLORS = ["#9772F6", "#3B82F6", "#16A34A", "#EC4899", "#D97706", "#0891B2", "#6366F1"];
const colorFor = (seed: string) => AVATAR_COLORS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// ── Contacts / personas ─────────────────────────────────────────────────────
// Every registered student (from the landlord's own payment roster, so room/
// bed context lines up with what's shown elsewhere) plus one synthetic
// linked parent per student.
const STUDENT_ROSTER: ChatContact[] = INITIAL_PAYMENTS.map((p, i) => ({
  id: `student-${p.id}`, name: p.name, role: "student", roleLabel: ROLE_LABEL.student,
  subtitle: p.id, online: i % 2 === 0,
  initials: initials(p.name), color: colorFor(p.name),
  context: { boardingHouse: BH_DATA.name, room: p.room, bed: p.bed },
}));

const SELF_INDEX = INITIAL_PAYMENTS.findIndex(p => p.id === STUDENT_DATA.id);

const PARENT_FIRST_NAMES = ["Elena", "Rosario", "Ana", "Carlos", "Teresa", "Ramon", "Lourdes"];
const PARENT_ROSTER: ChatContact[] = INITIAL_PAYMENTS.map((p, i) => {
  const surname = p.name.split(" ").slice(-1)[0];
  const isSelf = i === SELF_INDEX;
  const name = isSelf ? PARENT_DATA.name : `${PARENT_FIRST_NAMES[i % PARENT_FIRST_NAMES.length]} ${surname}`;
  return {
    id: `parent-${p.id}`, name, role: "parent" as const, roleLabel: ROLE_LABEL.parent,
    subtitle: isSelf ? PARENT_DATA.relationship : "Guardian",
    online: isSelf ? true : i % 3 === 0,
    initials: initials(name), color: colorFor(name),
    context: { boardingHouse: BH_DATA.name, room: p.room, bed: p.bed, studentName: p.name },
  };
});

export const LANDLORD_CONTACT: ChatContact = {
  id: "landlord-1", name: BH_DATA.landlord, role: "landlord", roleLabel: ROLE_LABEL.landlord,
  subtitle: BH_DATA.name, online: true, initials: initials(BH_DATA.landlord), color: "#9772F6",
};
export const ADMIN_CONTACT: ChatContact = {
  id: "admin-1", name: "Housing Director", role: "admin", roleLabel: ROLE_LABEL.admin,
  subtitle: "DormiTrack Housing Office", online: true, initials: "HD", color: "#3B82F6",
};

const STUDENT_SELF = STUDENT_ROSTER[SELF_INDEX];
const PARENT_SELF = PARENT_ROSTER[SELF_INDEX];

/** The one persona each role actually "is" in this single-account-per-role prototype. */
const SELF_CONTACT: Record<Role, ChatContact> = {
  student: STUDENT_SELF, parent: PARENT_SELF, landlord: LANDLORD_CONTACT, admin: ADMIN_CONTACT,
};

const ALL_CONTACTS: ChatContact[] = [...STUDENT_ROSTER, ...PARENT_ROSTER, LANDLORD_CONTACT, ADMIN_CONTACT];
export function getContactById(id: string): ChatContact | undefined { return ALL_CONTACTS.find(c => c.id === id); }
export function getSelfContact(role: Role): ChatContact { return SELF_CONTACT[role]; }

/** Best-effort bridge for other screens (e.g. the Occupants roster) that key
 *  a student by name rather than this store's contact id. */
export function findStudentContactByName(name: string): ChatContact | undefined {
  return STUDENT_ROSTER.find(c => c.name === name);
}

/** Who each role is authorized to message — the actual permission model. */
export function getAuthorizedContacts(role: Role): ChatContact[] {
  switch (role) {
    case "student":  return [LANDLORD_CONTACT, PARENT_SELF, ADMIN_CONTACT];
    case "parent":   return [STUDENT_SELF, LANDLORD_CONTACT, ADMIN_CONTACT];
    case "landlord": return [...STUDENT_ROSTER, ...PARENT_ROSTER, ADMIN_CONTACT];
    case "admin":    return [...STUDENT_ROSTER, ...PARENT_ROSTER, LANDLORD_CONTACT];
  }
}

export function isAuthorized(role: Role, contactId: string): boolean {
  return getAuthorizedContacts(role).some(c => c.id === contactId);
}

/** Who each role may add to a group. Same relationship model as 1:1 chat,
 *  except a student may also loop in other students registered at the same
 *  boarding house (e.g. roommates) — a group-only allowance, since 1:1
 *  student-to-student messaging isn't part of the base chat feature. */
export function getGroupEligibleContacts(role: Role): ChatContact[] {
  if (role === "student") {
    const roommates = STUDENT_ROSTER.filter(c => c.id !== STUDENT_SELF.id);
    return [...roommates, LANDLORD_CONTACT, PARENT_SELF, ADMIN_CONTACT];
  }
  return getAuthorizedContacts(role);
}

export function conversationId(a: string, b: string): string { return [a, b].sort().join("__"); }

// ── Seed data ────────────────────────────────────────────────────────────────
let _seq = 0;
function seedThread(idA: string, idB: string, msgs: { from: string; text: string; minutesAgo: number; unread?: boolean }[]): ChatMessage[] {
  const cid = conversationId(idA, idB);
  return msgs.map(m => ({
    id: `msg_seed_${_seq++}`, conversationId: cid, senderId: m.from, text: m.text,
    timestamp: Date.now() - m.minutesAgo * 60000,
    status: m.unread ? "delivered" : "read",
  }));
}

const SEED: ChatMessage[] = [
  // Student ↔ Landlord
  ...seedThread(STUDENT_SELF.id, LANDLORD_CONTACT.id, [
    { from: LANDLORD_CONTACT.id, text: "Hi Juan! Just a reminder that August rent is due on the 10th.", minutesAgo: 200 },
    { from: STUDENT_SELF.id,     text: "Good day po! I already submitted my payment for verification.", minutesAgo: 190 },
    { from: LANDLORD_CONTACT.id, text: "Noted, I'll check it shortly. Please also send the receipt for electricity.", minutesAgo: 170 },
    { from: STUDENT_SELF.id,     text: "Thank you, sir. I'll submit it today.", minutesAgo: 165, unread: false },
  ]),
  // Student ↔ Parent
  ...seedThread(STUDENT_SELF.id, PARENT_SELF.id, [
    { from: PARENT_SELF.id,  text: "Kumusta ka na diyan sa dorm? Ok ka lang ba?", minutesAgo: 480 },
    { from: STUDENT_SELF.id, text: "Ok naman po ako Ma. Nag-check in na ako kanina.", minutesAgo: 470 },
    { from: PARENT_SELF.id,  text: "Salamat sa update. Ingat lagi ha.", minutesAgo: 460, unread: true },
  ]),
  // Landlord ↔ other students
  ...seedThread(LANDLORD_CONTACT.id, STUDENT_ROSTER[0].id, [
    { from: STUDENT_ROSTER[0].id, text: "Sir, may problema po sa faucet namin sa Room A.", minutesAgo: 60, unread: true },
  ]),
  ...seedThread(LANDLORD_CONTACT.id, STUDENT_ROSTER[5].id, [
    { from: LANDLORD_CONTACT.id,  text: "Hi Sofia, welcome to Naquila Boarding House! Let me know if you need anything.", minutesAgo: 1440 },
    { from: STUDENT_ROSTER[5].id, text: "Thank you po, sir!", minutesAgo: 1430 },
  ]),
  // Landlord ↔ Admin
  ...seedThread(LANDLORD_CONTACT.id, ADMIN_CONTACT.id, [
    { from: ADMIN_CONTACT.id,    text: "Please update your boarding house's fire safety compliance documents this month.", minutesAgo: 2880 },
    { from: LANDLORD_CONTACT.id, text: "Noted, I'll upload them by this week.", minutesAgo: 2850 },
  ]),
];

// ── Store internals ─────────────────────────────────────────────────────────
let _messages: ChatMessage[] = [...SEED];
let _groups: GroupChat[] = [];
const _listeners = new Set<() => void>();
function _emit() { _listeners.forEach(l => l()); }
function subscribe(listener: () => void): () => void { _listeners.add(listener); return () => { _listeners.delete(listener); }; }
function getMessagesSnapshot(): ChatMessage[] { return _messages; }
function getGroupsSnapshot(): GroupChat[] { return _groups; }

export function useAllMessages(): ChatMessage[] {
  return useSyncExternalStore(subscribe, getMessagesSnapshot, getMessagesSnapshot);
}
export function useAllGroups(): GroupChat[] {
  return useSyncExternalStore(subscribe, getGroupsSnapshot, getGroupsSnapshot);
}

export function useMessages(convId: string): ChatMessage[] {
  const all = useAllMessages();
  return useMemo(() => all.filter(m => m.conversationId === convId).sort((a, b) => a.timestamp - b.timestamp), [all, convId]);
}

/** Live view of a single group (membership, name, photo) for the open thread / info panel. */
export function useGroup(groupId: string): GroupChat | undefined {
  const all = useAllGroups();
  return useMemo(() => all.find(g => g.id === groupId), [all, groupId]);
}

export function useConversations(role: Role): ConversationSummary[] {
  const allMessages = useAllMessages();
  const allGroups = useAllGroups();
  const self = SELF_CONTACT[role];
  const contacts = getAuthorizedContacts(role);
  return useMemo(() => {
    const direct: ConversationSummary[] = contacts.map(contact => {
      const cid = conversationId(self.id, contact.id);
      const msgs = allMessages.filter(m => m.conversationId === cid);
      const lastMessage = msgs.length ? msgs.reduce((a, b) => (b.timestamp > a.timestamp ? b : a)) : null;
      const unreadCount = msgs.filter(m => m.senderId !== self.id && m.status !== "read").length;
      return {
        kind: "direct" as const, key: cid, title: contact.name, subtitle: contact.roleLabel,
        avatarInitials: contact.initials, avatarColor: contact.color, online: contact.online,
        contact, lastMessage, unreadCount,
      };
    });
    const groups: ConversationSummary[] = allGroups.filter(g => g.memberIds.includes(self.id)).map(group => {
      const msgs = allMessages.filter(m => m.conversationId === group.id);
      const lastMessage = msgs.length ? msgs.reduce((a, b) => (b.timestamp > a.timestamp ? b : a)) : null;
      const unreadCount = msgs.filter(m => m.senderId !== self.id && m.status !== "read").length;
      return {
        kind: "group" as const, key: group.id, title: group.name, subtitle: `${group.memberIds.length} members`,
        avatarInitials: group.photoInitials, avatarColor: group.photoColor, memberCount: group.memberIds.length,
        group, lastMessage, unreadCount,
      };
    });
    return [...direct, ...groups].sort((a, b) => {
      if (a.lastMessage && b.lastMessage) return b.lastMessage.timestamp - a.lastMessage.timestamp;
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return (b.group?.createdAt ?? 0) - (a.group?.createdAt ?? 0);
    });
  }, [allMessages, allGroups, self, contacts]);
}

export function useUnreadChatCount(role: Role): number {
  const list = useConversations(role);
  return useMemo(() => list.reduce((s, c) => s + c.unreadCount, 0), [list]);
}

export function sendMessage(fromRole: Role, contactId: string, text: string, attachment?: AttachmentKind): void {
  const trimmed = text.trim();
  if (!trimmed && !attachment) return;
  const self = SELF_CONTACT[fromRole];
  const cid = conversationId(self.id, contactId);
  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${_seq++}`, conversationId: cid, senderId: self.id,
    text: trimmed, timestamp: Date.now(), status: "sent", attachment,
  };
  _messages = [..._messages, msg];
  _emit();

  // Simulate a brief send → delivered transition, like a real chat client.
  setTimeout(() => {
    _messages = _messages.map(m => m.id === msg.id ? { ...m, status: "delivered" as MessageStatus } : m);
    _emit();
  }, 600);

  // Only role-switchable personas have a real notification inbox to reach —
  // the wider student/parent roster are read-only contacts for landlord/admin.
  const recipientRole = (Object.keys(SELF_CONTACT) as Role[]).find(r => SELF_CONTACT[r].id === contactId);
  if (recipientRole) {
    const preview = attachment ? `Sent ${attachment === "photo" ? "a photo" : "a document"}` : trimmed;
    addNotification({
      role: recipientRole, type: "message", title: `New message from ${self.name}`,
      description: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
      destination: "messages", relatedId: self.id,
    });
  }
}

export function markConversationRead(role: Role, contactId: string): void {
  const self = SELF_CONTACT[role];
  const cid = conversationId(self.id, contactId);
  let changed = false;
  _messages = _messages.map(m => {
    if (m.conversationId === cid && m.senderId !== self.id && m.status !== "read") { changed = true; return { ...m, status: "read" as MessageStatus }; }
    return m;
  });
  if (changed) _emit();
}

// ── Group chat ───────────────────────────────────────────────────────────────

export function createGroup(role: Role, name: string, memberContactIds: string[]): GroupChat {
  const self = SELF_CONTACT[role];
  const trimmedName = name.trim();
  const group: GroupChat = {
    id: `group_${Date.now()}_${_seq++}`,
    name: trimmedName,
    photoInitials: initials(trimmedName) || "GC",
    photoColor: colorFor(trimmedName || "Group"),
    hasCustomPhoto: false,
    createdBy: self.id,
    createdAt: Date.now(),
    memberIds: Array.from(new Set([self.id, ...memberContactIds])),
  };
  _groups = [group, ..._groups];
  _emit();
  return group;
}

export function sendGroupMessage(fromRole: Role, groupId: string, text: string, attachment?: AttachmentKind): void {
  const trimmed = text.trim();
  if (!trimmed && !attachment) return;
  const self = SELF_CONTACT[fromRole];
  const group = _groups.find(g => g.id === groupId);
  if (!group || !group.memberIds.includes(self.id)) return;

  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${_seq++}`, conversationId: groupId, senderId: self.id,
    text: trimmed, timestamp: Date.now(), status: "sent", attachment,
  };
  _messages = [..._messages, msg];
  _emit();

  setTimeout(() => {
    _messages = _messages.map(m => m.id === msg.id ? { ...m, status: "delivered" as MessageStatus } : m);
    _emit();
  }, 600);

  const preview = attachment ? `Sent ${attachment === "photo" ? "a photo" : "a document"}` : trimmed;
  for (const memberId of group.memberIds) {
    if (memberId === self.id) continue;
    const recipientRole = (Object.keys(SELF_CONTACT) as Role[]).find(r => SELF_CONTACT[r].id === memberId);
    if (recipientRole) {
      addNotification({
        role: recipientRole, type: "message", title: `New message in ${group.name}`,
        description: `${self.name}: ${preview.length > 80 ? preview.slice(0, 80) + "…" : preview}`,
        destination: "messages", relatedId: group.id,
      });
    }
  }
}

export function markGroupRead(role: Role, groupId: string): void {
  const self = SELF_CONTACT[role];
  let changed = false;
  _messages = _messages.map(m => {
    if (m.conversationId === groupId && m.senderId !== self.id && m.status !== "read") { changed = true; return { ...m, status: "read" as MessageStatus }; }
    return m;
  });
  if (changed) _emit();
}

export function renameGroup(groupId: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  _groups = _groups.map(g => g.id === groupId ? { ...g, name: trimmed, photoInitials: initials(trimmed) || "GC" } : g);
  _emit();
}

export function setGroupPhoto(groupId: string): void {
  _groups = _groups.map(g => g.id === groupId ? { ...g, hasCustomPhoto: true } : g);
  _emit();
}

export function addGroupMembers(groupId: string, memberIds: string[]): void {
  _groups = _groups.map(g => g.id === groupId ? { ...g, memberIds: Array.from(new Set([...g.memberIds, ...memberIds])) } : g);
  _emit();
}

export function removeGroupMember(groupId: string, memberId: string): void {
  _groups = _groups.map(g => g.id === groupId ? { ...g, memberIds: g.memberIds.filter(id => id !== memberId) } : g);
  _emit();
}

export function leaveGroup(role: Role, groupId: string): void {
  removeGroupMember(groupId, SELF_CONTACT[role].id);
}

export function deleteGroup(groupId: string): void {
  _groups = _groups.filter(g => g.id !== groupId);
  _messages = _messages.filter(m => m.conversationId !== groupId);
  _emit();
}
