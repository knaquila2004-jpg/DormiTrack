// ── Chat / Messaging System — live Supabase-backed store ──────────────────────
// Same external shape as the old mock (module-level cache + pub/sub +
// useSyncExternalStore, so the inbox/badges/open thread all re-render
// automatically), but every function/hook now reads/writes real
// conversations/conversation_members/messages rows instead of static arrays.
//
// Every function keeps its original `role: Role` parameter for call-site
// compatibility with Chat.tsx (same strategy as notificationStore.ts) even
// though identity is now resolved for real via auth.uid() — a session is
// always exactly one real, specific user already, so `role` is mostly
// vestigial here (kept only where Chat.tsx already passes it).
//
// Real-time note: like notifications, this polls (every 4s while a chat
// screen is mounted, plus an immediate refresh after every local send/
// mutation) rather than using Supabase Realtime — consistent with every
// other "live-feeling" screen in this app (PendingVerificationScreen,
// ParentLinkingScreen), not a full push-based chat.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Role } from "./shared";
import { supabase } from "../lib/supabase";
import { getMyLinkedStudentId } from "./studentAssignmentStore";
import { getRoommates } from "./registrationStore";

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
  photoUrl: string | null;
  context?: { boardingHouse?: string; room?: string; bed?: string; studentName?: string };
}

export interface GroupChat {
  id: string;
  name: string;
  photoInitials: string;
  photoColor: string;
  hasCustomPhoto: boolean;
  createdBy: string;
  createdAt: number;
  memberIds: string[];
}

export interface ConversationSummary {
  kind: "direct" | "group";
  key: string;
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

export function conversationId(a: string, b: string): string { return [a, b].sort().join("__"); }

function toContact(id: string, name: string, role: Role, subtitle?: string, context?: ChatContact["context"], photoUrl: string | null = null): ChatContact {
  const n = name || "—";
  return { id, name: n, role, roleLabel: ROLE_LABEL[role], subtitle, online: false, initials: initials(n) || "?", color: colorFor(n || id), photoUrl, context };
}
const EMPTY_SELF: ChatContact = toContact("", "You", "student");

// ── Store internals ─────────────────────────────────────────────────────────
let _selfId: string | null = null;
let _loadedForRole: Role | null = null;
let _self: ChatContact = EMPTY_SELF;
let _roster: ChatContact[] = [];          // real 1:1-authorized contacts
let _groupEligible: ChatContact[] = [];   // roster ∪ roommates (students only)
let _contactCache = new Map<string, ChatContact>();
let _messages: ChatMessage[] = [];
let _groups: GroupChat[] = [];
let _directKeyToConvId = new Map<string, string>();

const _listeners = new Set<() => void>();
function _emit() { _listeners.forEach(l => l()); }
function subscribe(listener: () => void): () => void { _listeners.add(listener); return () => { _listeners.delete(listener); }; }
function getMessagesSnapshot(): ChatMessage[] { return _messages; }
function getGroupsSnapshot(): GroupChat[] { return _groups; }

async function fetchUserBasics(ids: string[]): Promise<Map<string, { name: string; role: Role; photoUrl: string | null }>> {
  const map = new Map<string, { name: string; role: Role; photoUrl: string | null }>();
  if (!ids.length) return map;
  const { data } = await supabase.from("users").select("id, first_name, last_name, role, photo_url").in("id", ids);
  for (const u of data ?? []) map.set(u.id, { name: [u.first_name, u.last_name].filter(Boolean).join(" "), role: u.role as Role, photoUrl: u.photo_url ?? null });
  return map;
}

// ── Roster resolution (real permission model per role) ──────────────────────
async function loadSelfAndRoster(uid: string, role: Role): Promise<{ self: ChatContact; roster: ChatContact[]; groupEligible: ChatContact[] }> {
  const { data: selfUser } = await supabase.from("users").select("first_name, last_name, photo_url").eq("id", uid).single();
  const self = toContact(uid, selfUser ? [selfUser.first_name, selfUser.last_name].filter(Boolean).join(" ") : "You", role, undefined, undefined, selfUser?.photo_url ?? null);

  const roster: ChatContact[] = [];

  if (role === "student") {
    const { data: sa } = await supabase.from("student_assignments").select("boarding_house_id").eq("student_id", uid).eq("is_current", true).maybeSingle();
    if (sa) {
      const { data: bh } = await supabase.from("boarding_houses").select("landlord_id, name, landlords(display_name, users(photo_url))").eq("id", sa.boarding_house_id).maybeSingle();
      if (bh?.landlord_id) roster.push(toContact(bh.landlord_id, (bh as any).landlords?.display_name ?? "Landlord", "landlord", bh.name, undefined, (bh as any).landlords?.users?.photo_url ?? null));
    }
    const { data: links } = await supabase.from("parent_student_links").select("parent_id, parents(relation, relation_other, users(first_name,last_name,photo_url))").eq("student_id", uid).eq("status", "linked");
    for (const l of links ?? []) {
      const u = (l as any).parents?.users;
      const relation = (l as any).parents?.relation === "Other" ? (l as any).parents?.relation_other : (l as any).parents?.relation;
      roster.push(toContact(l.parent_id, u ? [u.first_name, u.last_name].filter(Boolean).join(" ") : "Parent", "parent", relation ?? undefined, undefined, u?.photo_url ?? null));
    }
    const { data: admins } = await supabase.from("users").select("id, first_name, last_name, photo_url").eq("role", "admin").limit(10);
    for (const a of admins ?? []) roster.push(toContact(a.id, [a.first_name, a.last_name].filter(Boolean).join(" ") || "Housing Director", "admin", "DormiTrack Housing Office", undefined, a.photo_url ?? null));

    const groupEligible = [...roster];
    const roommates = await getRoommates(uid);
    for (const r of roommates) groupEligible.push(toContact(r.studentId, r.studentName, "student", r.studentIdNo, undefined, r.photo));
    return { self, roster, groupEligible };
  }

  if (role === "parent") {
    const studentId = await getMyLinkedStudentId();
    if (studentId) {
      const { data: su } = await supabase.from("users").select("first_name,last_name,photo_url").eq("id", studentId).maybeSingle();
      roster.push(toContact(studentId, su ? [su.first_name, su.last_name].filter(Boolean).join(" ") : "Student", "student", undefined, undefined, su?.photo_url ?? null));
      const { data: sa } = await supabase.from("student_assignments").select("boarding_house_id").eq("student_id", studentId).eq("is_current", true).maybeSingle();
      if (sa) {
        const { data: bh } = await supabase.from("boarding_houses").select("landlord_id, name, landlords(display_name, users(photo_url))").eq("id", sa.boarding_house_id).maybeSingle();
        if (bh?.landlord_id) roster.push(toContact(bh.landlord_id, (bh as any).landlords?.display_name ?? "Landlord", "landlord", bh.name, undefined, (bh as any).landlords?.users?.photo_url ?? null));
      }
    }
    const { data: admins } = await supabase.from("users").select("id, first_name, last_name, photo_url").eq("role", "admin").limit(10);
    for (const a of admins ?? []) roster.push(toContact(a.id, [a.first_name, a.last_name].filter(Boolean).join(" ") || "Housing Director", "admin", "DormiTrack Housing Office", undefined, a.photo_url ?? null));
    return { self, roster, groupEligible: [...roster] };
  }

  if (role === "landlord") {
    const { data: bhs } = await supabase.from("boarding_houses").select("id, name").eq("landlord_id", uid);
    const bhIds = (bhs ?? []).map(b => b.id);
    const bhNameById = new Map((bhs ?? []).map(b => [b.id, b.name]));
    if (bhIds.length) {
      const { data: sas } = await supabase.from("student_assignments").select("student_id, boarding_house_id, rooms(name), beds(label)").in("boarding_house_id", bhIds).eq("is_current", true);
      const studentIds = (sas ?? []).map(s => s.student_id);
      const basics = await fetchUserBasics(studentIds);
      const nameByStudentId = new Map<string, string>();
      for (const sa of sas ?? []) {
        const b = basics.get(sa.student_id);
        if (!b) continue;
        nameByStudentId.set(sa.student_id, b.name);
        roster.push(toContact(sa.student_id, b.name, "student", bhNameById.get(sa.boarding_house_id), {
          boardingHouse: bhNameById.get(sa.boarding_house_id), room: (sa as any).rooms?.name, bed: (sa as any).beds?.label,
        }, b.photoUrl));
      }
      const { data: links } = await supabase.from("parent_student_links").select("parent_id, student_id").in("student_id", studentIds).eq("status", "linked");
      const parentIds = [...new Set((links ?? []).map(l => l.parent_id))];
      const parentBasics = await fetchUserBasics(parentIds);
      for (const l of links ?? []) {
        if (roster.some(c => c.id === l.parent_id)) continue;
        const b = parentBasics.get(l.parent_id);
        if (!b) continue;
        roster.push(toContact(l.parent_id, b.name, "parent", "Guardian", { studentName: nameByStudentId.get(l.student_id) }, b.photoUrl));
      }
    }
    const { data: admins } = await supabase.from("users").select("id, first_name, last_name, photo_url").eq("role", "admin").limit(10);
    for (const a of admins ?? []) roster.push(toContact(a.id, [a.first_name, a.last_name].filter(Boolean).join(" ") || "Housing Director", "admin", "DormiTrack Housing Office", undefined, a.photo_url ?? null));
    return { self, roster, groupEligible: [...roster] };
  }

  // admin: everyone
  const { data: students } = await supabase.from("users").select("id, first_name, last_name, photo_url").eq("role", "student").limit(500);
  for (const s of students ?? []) roster.push(toContact(s.id, [s.first_name, s.last_name].filter(Boolean).join(" "), "student", undefined, undefined, s.photo_url ?? null));
  const { data: parents } = await supabase.from("users").select("id, first_name, last_name, photo_url").eq("role", "parent").limit(500);
  for (const p of parents ?? []) roster.push(toContact(p.id, [p.first_name, p.last_name].filter(Boolean).join(" "), "parent", undefined, undefined, p.photo_url ?? null));
  const { data: landlords } = await supabase.from("users").select("id, first_name, last_name, photo_url").eq("role", "landlord").limit(500);
  for (const l of landlords ?? []) roster.push(toContact(l.id, [l.first_name, l.last_name].filter(Boolean).join(" "), "landlord", undefined, undefined, l.photo_url ?? null));
  return { self, roster, groupEligible: [...roster] };
}

async function ensureRoster(role: Role): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  _selfId = uid;
  if (_loadedForRole === role && _self.id === uid) return;
  const { self, roster, groupEligible } = await loadSelfAndRoster(uid, role);
  _self = self; _roster = roster; _groupEligible = groupEligible; _loadedForRole = role;
  for (const c of roster) _contactCache.set(c.id, c);
  for (const c of groupEligible) _contactCache.set(c.id, c);
  _contactCache.set(uid, self);
  _emit();
}

// ── Conversations + messages ─────────────────────────────────────────────────
async function loadConversationsAndMessages(uid: string) {
  const { data: myMemberships } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", uid);
  const convIds = (myMemberships ?? []).map(m => m.conversation_id);
  if (!convIds.length) return { groups: [] as GroupChat[], messages: [] as ChatMessage[], directKeyToConvId: new Map<string, string>(), extraContacts: new Map<string, ChatContact>() };

  const [{ data: convs }, { data: allMembers }, { data: msgs }] = await Promise.all([
    supabase.from("conversations").select("id, kind, direct_key, group_name, group_photo_url, created_by, created_at").in("id", convIds),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", convIds),
    supabase.from("messages").select("id, conversation_id, sender_id, text, attachment_kind, status, created_at").in("conversation_id", convIds).order("created_at", { ascending: true }),
  ]);

  const membersByConv = new Map<string, string[]>();
  for (const m of allMembers ?? []) {
    const arr = membersByConv.get(m.conversation_id) ?? [];
    arr.push(m.user_id);
    membersByConv.set(m.conversation_id, arr);
  }

  const directKeyToConvId = new Map<string, string>();
  const groups: GroupChat[] = [];
  for (const c of convs ?? []) {
    if (c.kind === "direct" && c.direct_key) directKeyToConvId.set(c.direct_key, c.id);
    if (c.kind === "group") {
      const name = c.group_name ?? "Group";
      groups.push({
        id: c.id, name, photoInitials: initials(name) || "GC", photoColor: colorFor(name || c.id),
        hasCustomPhoto: !!c.group_photo_url, createdBy: c.created_by, createdAt: new Date(c.created_at).getTime(),
        memberIds: membersByConv.get(c.id) ?? [],
      });
    }
  }

  const messages: ChatMessage[] = (msgs ?? []).map(m => ({
    id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, text: m.text ?? "",
    timestamp: new Date(m.created_at).getTime(), status: m.status as MessageStatus,
    attachment: (m.attachment_kind ?? undefined) as AttachmentKind | undefined,
  }));

  const allMemberIds = new Set<string>();
  for (const ids of membersByConv.values()) for (const id of ids) allMemberIds.add(id);
  const known = new Set([..._roster.map(c => c.id), ..._groupEligible.map(c => c.id), uid]);
  const missingIds = [...allMemberIds].filter(id => !known.has(id));
  const extraContacts = new Map<string, ChatContact>();
  if (missingIds.length) {
    const basics = await fetchUserBasics(missingIds);
    for (const [id, b] of basics) extraContacts.set(id, toContact(id, b.name, b.role, undefined, undefined, b.photoUrl));
  }

  return { groups, messages, directKeyToConvId, extraContacts };
}

async function refreshConversations(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const { groups, messages, directKeyToConvId, extraContacts } = await loadConversationsAndMessages(uid);
  _groups = groups; _messages = messages; _directKeyToConvId = directKeyToConvId;
  for (const [id, c] of extraContacts) _contactCache.set(id, c);
  _emit();
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useAllMessages(): ChatMessage[] {
  return useSyncExternalStore(subscribe, getMessagesSnapshot, getMessagesSnapshot);
}
export function useAllGroups(): GroupChat[] {
  return useSyncExternalStore(subscribe, getGroupsSnapshot, getGroupsSnapshot);
}

export function useMessages(convId: string): ChatMessage[] {
  const all = useAllMessages();
  return useMemo(() => {
    const realId = _directKeyToConvId.get(convId) ?? convId;
    return all.filter(m => m.conversationId === realId).sort((a, b) => a.timestamp - b.timestamp);
  }, [all, convId]);
}

export function useGroup(groupId: string): GroupChat | undefined {
  const all = useAllGroups();
  return useMemo(() => all.find(g => g.id === groupId), [all, groupId]);
}

export function useConversations(role: Role): ConversationSummary[] {
  useEffect(() => {
    let active = true;
    (async () => { await ensureRoster(role); if (active) await refreshConversations(); })();
    const interval = setInterval(() => { if (active) refreshConversations(); }, 4000);
    return () => { active = false; clearInterval(interval); };
  }, [role]);

  const allMessages = useAllMessages();
  const allGroups = useAllGroups();
  return useMemo(() => {
    const self = _self;
    const contacts = _roster;
    const direct: ConversationSummary[] = contacts.map(contact => {
      const key = conversationId(self.id, contact.id);
      const realId = _directKeyToConvId.get(key);
      const msgs = realId ? allMessages.filter(m => m.conversationId === realId) : [];
      const lastMessage = msgs.length ? msgs.reduce((a, b) => (b.timestamp > a.timestamp ? b : a)) : null;
      const unreadCount = msgs.filter(m => m.senderId !== self.id && m.status !== "read").length;
      return {
        kind: "direct" as const, key, title: contact.name, subtitle: contact.roleLabel,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMessages, allGroups, role]);
}

export function useUnreadChatCount(role: Role): number {
  const list = useConversations(role);
  return useMemo(() => list.reduce((s, c) => s + c.unreadCount, 0), [list]);
}

// ── Synchronous cache reads (populated by the hooks above) ──────────────────
export function getSelfContact(_role: Role): ChatContact { return _self; }
export function getContactById(id: string): ChatContact | undefined {
  if (id === _selfId) return _self;
  return _contactCache.get(id);
}
export function findStudentContactByName(name: string): ChatContact | undefined {
  return _roster.find(c => c.role === "student" && c.name === name)
    ?? _groupEligible.find(c => c.role === "student" && c.name === name);
}
export function getAuthorizedContacts(_role: Role): ChatContact[] { return _roster; }
export function isAuthorized(_role: Role, contactId: string): boolean { return _roster.some(c => c.id === contactId); }
export function getGroupEligibleContacts(_role: Role): ChatContact[] { return _groupEligible; }

// ── Actions ───────────────────────────────────────────────────────────────────
export async function sendMessage(_role: Role, contactId: string, text: string, attachment?: AttachmentKind): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed && !attachment) return;
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const { data: convId, error: convErr } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: contactId });
  if (convErr || !convId) { console.error("sendMessage:", convErr?.message); return; }
  const { error } = await supabase.from("messages").insert({ conversation_id: convId, sender_id: uid, text: trimmed || null, attachment_kind: attachment ?? null });
  if (error) { console.error("sendMessage:", error.message); return; }
  refreshConversations();
}

export async function markConversationRead(_role: Role, contactId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const convId = _directKeyToConvId.get(conversationId(uid, contactId));
  if (!convId) return;
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: convId });
  if (error) { console.error("markConversationRead:", error.message); return; }
  refreshConversations();
}

// ── Group chat ───────────────────────────────────────────────────────────────

export async function createGroup(role: Role, name: string, memberContactIds: string[]): Promise<GroupChat> {
  const trimmedName = name.trim();
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Not signed in.");
  // Goes through create_group_conversation (SECURITY DEFINER) rather than a
  // plain client insert — see 0026_create_group_conversation_rpc.sql for why
  // a raw insert+select here fails under RLS (the creator isn't a
  // conversation_members row yet at the instant the RETURNING clause is
  // evaluated).
  const { data: convId, error } = await supabase.rpc("create_group_conversation", { p_name: trimmedName, p_member_ids: memberContactIds });
  if (error || !convId) throw new Error(error?.message ?? "Could not create group.");
  await ensureRoster(role);
  await refreshConversations();
  const memberIds = Array.from(new Set([uid, ...memberContactIds]));
  return {
    id: convId, name: trimmedName, photoInitials: initials(trimmedName) || "GC", photoColor: colorFor(trimmedName || "Group"),
    hasCustomPhoto: false, createdBy: uid, createdAt: Date.now(), memberIds,
  };
}

export async function sendGroupMessage(_role: Role, groupId: string, text: string, attachment?: AttachmentKind): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed && !attachment) return;
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const { error } = await supabase.from("messages").insert({ conversation_id: groupId, sender_id: uid, text: trimmed || null, attachment_kind: attachment ?? null });
  if (error) { console.error("sendGroupMessage:", error.message); return; }
  refreshConversations();
}

export async function markGroupRead(_role: Role, groupId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: groupId });
  if (error) { console.error("markGroupRead:", error.message); return; }
  refreshConversations();
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { error } = await supabase.from("conversations").update({ group_name: trimmed }).eq("id", groupId);
  if (error) { console.error("renameGroup:", error.message); return; }
  refreshConversations();
}

export async function setGroupPhoto(_groupId: string): Promise<void> {
  // No real photo-upload path exists for group chat yet (same gap as report
  // attachments) — an honest no-op rather than persisting a fabricated
  // group_photo_url.
}

export async function addGroupMembers(groupId: string, memberIds: string[]): Promise<void> {
  const { error } = await supabase.from("conversation_members").insert(memberIds.map(user_id => ({ conversation_id: groupId, user_id })));
  if (error) { console.error("addGroupMembers:", error.message); return; }
  refreshConversations();
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  const { error } = await supabase.from("conversation_members").delete().eq("conversation_id", groupId).eq("user_id", memberId);
  if (error) { console.error("removeGroupMember:", error.message); return; }
  refreshConversations();
}

export async function leaveGroup(_role: Role, groupId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  await removeGroupMember(groupId, uid);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from("conversations").delete().eq("id", groupId);
  if (error) { console.error("deleteGroup:", error.message); return; }
  refreshConversations();
}
