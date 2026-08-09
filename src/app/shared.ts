import React from "react";
import { Wifi, Droplet, Zap, BookOpen, Utensils, Shirt, Video, Car, Clock, Shield } from "lucide-react";

// ── Gradient constants ────────────────────────────────────────────────────────
export const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
export const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";

// ── Map center (BISU Main Campus, Tagbilaran City, Bohol) ─────────────────────
export const MAP_CENTER = { lat: 9.6539, lng: 123.8547 };

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
  gallery: { url: string; label: string }[]; desc: string; rating: number;
  amenities: Amenity[]; rooms: RoomData[];
  contact?: string;
  rules?: string[];
  payment?: {
    rent: number;
    electric: { type: "fixed" | "metered"; amount?: number };
    water: { type: "fixed" | "metered"; amount?: number };
    internet: { type: "included" | "separate"; amount?: number };
  };
  lat: number; lng: number;
  municipality: string;
  status: "active" | "pending" | "suspended";
};

export type RegRequest = {
  studentName: string; house: BoardingHouse; room: RoomData; bed?: string;
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

export const BOARDING_HOUSES: BoardingHouse[] = [
  {
    id: "bh1", name: "Sunshine Boarding House", address: "Cangumba, Calape, Bohol",
    lat: 9.8940, lng: 123.8590, municipality: "Calape", status: "active",
    landlord: "Mr. Ramon Villaflor", cover: IMG.ext1, rating: 4.8,
    desc: "A bright, secure, and student-friendly boarding house just 5 minutes from the BISU campus. Newly renovated rooms with fast Wi-Fi and 24/7 security.",
    gallery: [
      { url: IMG.ext1, label: "Exterior" }, { url: IMG.bed1, label: "Interior" },
      { url: IMG.study, label: "Hallway" }, { url: IMG.bed2, label: "Rooms" },
      { url: IMG.kitchen, label: "Kitchen" }, { url: IMG.books, label: "Study Area" },
      { url: IMG.common, label: "Common Area" },
    ],
    amenities: AMENITIES,
    contact: "09171234567",
    rules: [
      "Curfew starts at 10:00 PM.",
      "Visitors allowed only during visiting hours (8AM–8PM).",
      "Keep noise levels to a minimum after 9PM.",
      "Maintain cleanliness in all common areas.",
      "No smoking inside the boarding house.",
      "No illegal substances or weapons allowed.",
      "Report any damaged facilities to the landlord immediately.",
      "Respect fellow occupants at all times.",
      "Use electricity and water responsibly.",
      "Pets are not allowed.",
    ],
    payment: { rent: 2500, electric: { type: "metered" }, water: { type: "fixed", amount: 250 }, internet: { type: "included" } },
    rooms: [
      { id: "r1", name: "Room A", photo: IMG.bed1, cap: 6, occ: 6, description: "Ground floor room with 6 individual beds, excellent ventilation, and a large window overlooking the garden.", photos: [IMG.bed1, IMG.study, IMG.books], roomAmenities: ["Air-conditioned", "Shared CR", "Study Table", "Cabinet", "Wi-Fi", "Window"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed1},{id:"b2",label:"Bed 2",status:"occupied",photo:IMG.study},{id:"b3",label:"Bed 3",status:"occupied",photo:IMG.books},{id:"b4",label:"Bed 4",status:"occupied"},{id:"b5",label:"Bed 5",status:"occupied"},{id:"b6",label:"Bed 6",status:"occupied"}] },
      { id: "r2", name: "Room B", photo: IMG.bed2, cap: 6, occ: 3, description: "Spacious room on the second floor with a garden view. Comes with built-in cabinets and a shared study area.", photos: [IMG.bed2, IMG.desk, IMG.common], roomAmenities: ["Electric Fan", "Shared CR", "Study Table", "Cabinet", "Wi-Fi", "Balcony"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed2},{id:"b2",label:"Bed 2",status:"occupied"},{id:"b3",label:"Bed 3",status:"occupied"},{id:"b4",label:"Bed 4",status:"available",photo:IMG.desk},{id:"b5",label:"Bed 5",status:"reserved",photo:IMG.common},{id:"b6",label:"Bed 6",status:"available"}] },
      { id: "r3", name: "Room C", photo: IMG.bed3, cap: 4, occ: 3, description: "Corner room with natural lighting and a quiet environment. Ideal for studious and focused students.", photos: [IMG.bed3, IMG.books], roomAmenities: ["Air-conditioned", "Private CR", "Study Table", "Cabinet", "Wi-Fi", "Window"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed3},{id:"b2",label:"Bed 2",status:"occupied"},{id:"b3",label:"Bed 3",status:"occupied",photo:IMG.books},{id:"b4",label:"Bed 4",status:"available"}] },
      { id: "r4", name: "Room D", photo: IMG.bed4, cap: 4, occ: 1, description: "Top-floor room with a great breeze. Quiet neighborhood view. Two beds are currently under maintenance.", photos: [IMG.bed4, IMG.study, IMG.desk], roomAmenities: ["Air-conditioned", "Shared CR", "Study Table", "Cabinet", "Wi-Fi", "Window"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed4},{id:"b2",label:"Bed 2",status:"available",photo:IMG.study},{id:"b3",label:"Bed 3",status:"maintenance"},{id:"b4",label:"Bed 4",status:"available"}] },
    ],
  },
  {
    id: "bh2", name: "Greenview Student Residence", address: "Poblacion, Calape, Bohol",
    lat: 9.8886, lng: 123.8672, municipality: "Calape", status: "active",
    landlord: "Mrs. Elena Gascon", cover: IMG.ext2, rating: 4.6,
    desc: "Quiet, affordable residence surrounded by greenery. Ideal for students who value a calm study environment with spacious shared facilities.",
    gallery: [
      { url: IMG.ext2, label: "Exterior" }, { url: IMG.bed3, label: "Interior" },
      { url: IMG.desk, label: "Study Area" }, { url: IMG.bed4, label: "Rooms" },
      { url: IMG.counter, label: "Kitchen" }, { url: IMG.common, label: "Common Area" },
    ],
    amenities: AMENITIES.filter(a => !["Parking", "Curfew"].includes(a.label)),
    contact: "09189876543",
    rules: [
      "Curfew at 11:00 PM on weekdays, 12:00 AM on weekends.",
      "No visitors after 9:00 PM.",
      "Clean up after yourself in the kitchen and dining area.",
      "No loud music or excessive noise at any time.",
      "Laundry schedule must be followed.",
      "Electricity and water bills are shared monthly.",
      "Damages caused by tenants are the tenant's responsibility.",
      "Rooms must be kept clean and organized.",
    ],
    payment: { rent: 2000, electric: { type: "fixed", amount: 400 }, water: { type: "fixed", amount: 200 }, internet: { type: "separate", amount: 299 } },
    rooms: [
      { id: "r1", name: "Room 101", photo: IMG.bed3, cap: 5, occ: 5, description: "First floor room with easy access to the common area. Fully air-conditioned with private bathroom.", photos: [IMG.bed3, IMG.common], roomAmenities: ["Air-conditioned", "Private CR", "Study Table", "Cabinet", "Wi-Fi"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed3},{id:"b2",label:"Bed 2",status:"occupied"},{id:"b3",label:"Bed 3",status:"occupied",photo:IMG.common},{id:"b4",label:"Bed 4",status:"occupied"},{id:"b5",label:"Bed 5",status:"occupied"}] },
      { id: "r2", name: "Room 102", photo: IMG.bed4, cap: 5, occ: 2, description: "Bright and airy room with large windows and a shared bathroom. Great for students who enjoy natural light.", photos: [IMG.bed4, IMG.desk, IMG.books], roomAmenities: ["Electric Fan", "Shared CR", "Study Table", "Cabinet", "Window"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed4},{id:"b2",label:"Bed 2",status:"occupied"},{id:"b3",label:"Bed 3",status:"available",photo:IMG.desk},{id:"b4",label:"Bed 4",status:"available"},{id:"b5",label:"Bed 5",status:"reserved",photo:IMG.books}] },
      { id: "r3", name: "Room 201", photo: IMG.bed1, cap: 4, occ: 4, description: "Second floor room with scenic views. All beds currently occupied.", photos: [IMG.bed1, IMG.study], roomAmenities: ["Air-conditioned", "Private CR", "Study Table", "Cabinet", "Wi-Fi", "Balcony"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed1},{id:"b2",label:"Bed 2",status:"occupied",photo:IMG.study},{id:"b3",label:"Bed 3",status:"occupied"},{id:"b4",label:"Bed 4",status:"occupied"}] },
      { id: "r4", name: "Room 202", photo: IMG.bed2, cap: 6, occ: 4, description: "Spacious 6-bed room on the second floor.", photos: [IMG.bed2, IMG.desk, IMG.common], roomAmenities: ["Air-conditioned", "Shared CR", "Study Table", "Cabinet", "Wi-Fi", "Window"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed2},{id:"b2",label:"Bed 2",status:"occupied"},{id:"b3",label:"Bed 3",status:"occupied"},{id:"b4",label:"Bed 4",status:"occupied"},{id:"b5",label:"Bed 5",status:"available",photo:IMG.desk},{id:"b6",label:"Bed 6",status:"available"}] },
    ],
  },
  {
    id: "bh3", name: "Casa Verde Dormitory", address: "Tultugan, Calape, Bohol",
    lat: 9.8790, lng: 123.8750, municipality: "Calape", status: "pending",
    landlord: "Mr. Danilo Reyes", cover: IMG.ext3, rating: 4.9,
    desc: "Premium dormitory with modern amenities, dedicated study areas, and a friendly community.",
    gallery: [
      { url: IMG.ext3, label: "Exterior" }, { url: IMG.bed2, label: "Interior" },
      { url: IMG.study, label: "Study Area" }, { url: IMG.bed1, label: "Rooms" },
      { url: IMG.kitchen, label: "Kitchen" }, { url: IMG.books, label: "Common Area" },
    ],
    amenities: AMENITIES,
    contact: "09205551234",
    rules: [
      "Strict 10:30 PM curfew every day.",
      "No male visitors in female floors and vice versa.",
      "Common areas must be cleaned after use.",
      "Gate pass required for overnight stays outside.",
      "Monthly room inspections will be conducted.",
      "No cooking inside rooms.",
      "Internet is shared — no bandwidth-heavy activities.",
      "Security cameras are installed in all common areas.",
      "Lost keys incur a ₱200 replacement fee.",
    ],
    payment: { rent: 3000, electric: { type: "metered" }, water: { type: "metered" }, internet: { type: "included" } },
    rooms: [
      { id: "r1", name: "Unit 1", photo: IMG.bed2, cap: 4, occ: 2, description: "Premium semi-private unit with modern furniture.", photos: [IMG.bed2, IMG.desk], roomAmenities: ["Air-conditioned", "Private CR", "Study Table", "Cabinet", "Wi-Fi", "Balcony"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed2},{id:"b2",label:"Bed 2",status:"occupied"},{id:"b3",label:"Bed 3",status:"available",photo:IMG.desk},{id:"b4",label:"Bed 4",status:"available"}] },
      { id: "r2", name: "Unit 2", photo: IMG.bed1, cap: 4, occ: 4, description: "Fully occupied cozy unit.", photos: [IMG.bed1, IMG.common], roomAmenities: ["Air-conditioned", "Shared CR", "Study Table", "Cabinet", "Wi-Fi"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed1},{id:"b2",label:"Bed 2",status:"occupied",photo:IMG.common},{id:"b3",label:"Bed 3",status:"occupied"},{id:"b4",label:"Bed 4",status:"occupied"}] },
      { id: "r3", name: "Unit 3", photo: IMG.bed3, cap: 6, occ: 1, description: "Large 6-bed unit on the top floor with panoramic views.", photos: [IMG.bed3, IMG.study, IMG.books, IMG.desk], roomAmenities: ["Air-conditioned", "Shared CR", "Study Table", "Cabinet", "Wi-Fi", "Window", "Balcony"], beds: [{id:"b1",label:"Bed 1",status:"occupied",photo:IMG.bed3},{id:"b2",label:"Bed 2",status:"available",photo:IMG.study},{id:"b3",label:"Bed 3",status:"available",photo:IMG.books},{id:"b4",label:"Bed 4",status:"reserved",photo:IMG.desk},{id:"b5",label:"Bed 5",status:"available"},{id:"b6",label:"Bed 6",status:"available"}] },
    ],
  },
];
