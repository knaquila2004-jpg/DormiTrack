import React from "react";
import { Wifi, Droplet, Zap, BookOpen, Utensils, Shirt, Video, Car, Clock, Shield } from "lucide-react";

// ── Gradient constants ────────────────────────────────────────────────────────
export const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
export const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";

// ── Map center (BISU Calape Campus, Calape, Bohol — this app's home campus) ───
export const MAP_CENTER = { lat: 9.8947193, lng: 123.8827641 };

// ── Screen & role types ───────────────────────────────────────────────────────
export type Screen =
  | "splash" | "landing" | "roleSelect" | "login" | "signup"
  | "forgotPassword" | "dashboard" | "payments" | "map"
  | "notifications" | "messages" | "profile" | "dormInfo" | "occupants"
  | "homeVisit" | "settings" | "rooms"
  | "adminUsers" | "adminReports" | "adminProfile" | "adminMap" | "adminSystem"
  | "studentSignup" | "landlordSignup" | "parentSignup" | "parentLinking" | "boardingReg" | "pendingVerify";

export type NavTab = { id: Screen; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>; label: string };
export type Role = "student" | "parent" | "landlord" | "admin";

// ── Data types ────────────────────────────────────────────────────────────────
export type BedStatus = "available" | "occupied" | "reserved" | "maintenance";
export type BedData = { id: string; label: string; status: BedStatus; photo?: string };
export type RoomData = {
  id: string; name: string; photo: string; cap: number; occ: number;
  description?: string;
  photos?: string[];
  roomAmenities?: string[];
  beds?: BedData[];
};
export type Amenity = { label: string; Icon: React.ComponentType<{ size?: number; color?: string }> };
export type BoardingHouse = {
  id: string; name: string; address: string; landlord: string; cover: string;
  gallery: { id?: string; url: string; label: string }[]; desc: string; rating: number;
  amenities: Amenity[]; rooms: RoomData[];
  contact?: string;
  rules?: string[];
  // Each fee's own `enabled` mirrors the landlord's Payment Setup toggle for it —
  // a disabled fee is still present here (so the landlord's own screens can still
  // show/edit it) but student-facing screens must check `enabled` before
  // displaying it, matching what the landlord actually turned on.
  payment?: {
    rent: { enabled: boolean; amount: number };
    electric: { enabled: boolean; type: "fixed" | "metered"; amount?: number };
    water: { enabled: boolean; type: "fixed" | "metered"; amount?: number };
    internet: { enabled: boolean; type: "included" | "separate"; amount?: number };
  };
  // Landlord's "Student Stay Information" settings — which optional questions
  // students are asked (and shown) while registering. Defaults to true so any
  // boarding house that predates these settings still behaves as "show everything".
  allowLengthOfStay?: boolean;
  allowMoveIn?: boolean;
  allowPersonality?: boolean;
  allowHobbies?: boolean;
  allowLifestyle?: boolean;
  allowNotes?: boolean;
  lat: number; lng: number;
  // The only area within which a student's check-in/check-out is accepted — set by the
  // landlord while pinning the boarding house's location (defaults to 50m for houses
  // created before this existed).
  checkinRadiusMeters: number;
  municipality: string;
  status: "active" | "pending" | "suspended";
};

export type RegRequest = {
  studentName: string; house: BoardingHouse; room: RoomData; bed?: string; bedId?: string;
  moveIn: string; moveOut: string; stayUnit: "Weeks" | "Months"; stayCount: string;
  traits: string[]; hobbies: string[]; lifestyle: string[]; notes: string; submittedDate: string;
};

export type StudentProfile = {
  firstName: string; middleName: string; lastName: string; username: string;
  age: string; birthdate: string; sex: string;
  contact: string; address: string;
  studentId: string; program: string; yearLevel: string; block: string;
  email: string;
};

// ── Landlord signup types ─────────────────────────────────────────────────────
export type LBed = { label: string; status: "available" | "occupied" | "reserved"; photo?: string };
export type LRoom = {
  id: string; name: string; desc: string; cap: string; occ: string;
  amenities: string[]; customAmenities: string[];
  beds: LBed[];
  roomPhoto?: string; crPhoto?: string;
  confirmed: boolean;
};
export type LPaymentExtra = { name: string; amount: string; type: "fixed" | "metered"; enabled: boolean; confirmed: boolean };

// ── Unsplash image helper ─────────────────────────────────────────────────────
const U = (id: string) => `https://images.unsplash.com/photo-${id}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080`;

export const IMG = {
  ext1: U("1628012209120-d9db7abf7eab"),
  ext2: U("1627141234469-24711efb373c"),
  ext3: U("1543071293-d91175a68672"),
  ext4: U("1614595737476-42487331b8a1"),
  bed1: U("1499916078039-922301b0eb9b"),
  bed2: U("1616486232086-81d47190669a"),
  bed3: U("1622429420441-60dd67f737a6"),
  bed4: U("1727706572437-4fcda0cbd66f"),
  kitchen: U("1585821570368-53a593a002be"),
  common: U("1618506425498-93e6a45e3af0"),
  counter: U("1630699034288-21159cfd7d74"),
  study: U("1781370764345-89b32df4705a"),
  books: U("1779703056727-3c8b2bd919bc"),
  desk: U("1761123489272-ab7534a498d8"),
};

// Clean default photo shown for a bed when the landlord hasn't uploaded one yet.
export const DEFAULT_BED_PHOTO = IMG.bed1;

export const AMENITIES: Amenity[] = [
  { label: "Wi-Fi", Icon: Wifi }, { label: "Water Included", Icon: Droplet },
  { label: "Electricity", Icon: Zap }, { label: "Study Area", Icon: BookOpen },
  { label: "Kitchen", Icon: Utensils }, { label: "Laundry Area", Icon: Shirt },
  { label: "CCTV", Icon: Video }, { label: "Parking", Icon: Car },
  { label: "Curfew", Icon: Clock }, { label: "Security", Icon: Shield },
];

export function roomStatus(r: RoomData): { label: string; color: string; bg: string } {
  const left = r.cap - r.occ;
  if (left <= 0) return { label: "Full", color: "#EF4444", bg: "#FEE2E2" };
  if (left === 1) return { label: "Almost Full", color: "#D97706", bg: "#FEF3C7" };
  return { label: "Available", color: "#16A34A", bg: "#DCFCE7" };
}

// BOARDING_HOUSES mock array removed — real listings now come from
// src/app/boardingHouseStore.ts (getActiveBoardingHouses / getBoardingHousesForLandlord),
// which query Supabase and map rows onto the BoardingHouse/RoomData/BedData
// shapes defined above.
