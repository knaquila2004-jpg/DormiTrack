// Module-level store — persists between component mounts in the same session

export type ReportStatus   = "pending" | "in-progress" | "resolved" | "closed";
export type ReportCategory =
  | "room-issue" | "bathroom" | "electrical" | "water" | "internet"
  | "noise" | "maintenance" | "safety" | "cleanliness" | "roommate"
  | "lost-item" | "other";
export type ReportPriority = "low" | "medium" | "high";

export interface StudentReport {
  id: string;
  studentName: string;
  studentId: string;
  boardingHouse: string;
  roomNumber: string;
  bedNumber: string;
  category: ReportCategory;
  priority: ReportPriority;
  title: string;
  description: string;
  imageColors?: string[];
  dateSubmitted: string;
  timeSubmitted: string;
  status: ReportStatus;
  landlordResponse?: string;
  landlordResponseDate?: string;
  statusHistory: { status: ReportStatus; date: string; note?: string }[];
}

export const CATEGORY_META: Record<ReportCategory, { label: string; color: string; bg: string }> = {
  "room-issue":   { label: "Room Issue",          color: "#9772F6", bg: "#F5F0FF" },
  "bathroom":     { label: "Bathroom Issue",       color: "#0891B2", bg: "#ECFEFF" },
  "electrical":   { label: "Electrical Problem",   color: "#D97706", bg: "#FEF3C7" },
  "water":        { label: "Water Supply",         color: "#3B82F6", bg: "#EFF6FF" },
  "internet":     { label: "Internet Connection",  color: "#6366F1", bg: "#EEF2FF" },
  "noise":        { label: "Noise Complaint",      color: "#EC4899", bg: "#FDF2F8" },
  "maintenance":  { label: "Maintenance Request",  color: "#16A34A", bg: "#DCFCE7" },
  "safety":       { label: "Safety Concern",       color: "#EF4444", bg: "#FEE2E2" },
  "cleanliness":  { label: "Cleanliness",          color: "#0891B2", bg: "#ECFEFF" },
  "roommate":     { label: "Roommate Concern",     color: "#F59E0B", bg: "#FEF3C7" },
  "lost-item":    { label: "Lost Item",            color: "#8B5CF6", bg: "#EDE9FE" },
  "other":        { label: "Other",                color: "#6B7280", bg: "#F3F4F6" },
};

export const PRIORITY_META: Record<ReportPriority, { label: string; color: string; bg: string; dot: string }> = {
  low:    { label: "Low",    color: "#16A34A", bg: "#DCFCE7", dot: "#16A34A" },
  medium: { label: "Medium", color: "#D97706", bg: "#FEF3C7", dot: "#D97706" },
  high:   { label: "High",   color: "#EF4444", bg: "#FEE2E2", dot: "#EF4444" },
};

export const STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string; dot: string }> = {
  "pending":     { label: "Pending Review", color: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" },
  "in-progress": { label: "In Progress",   color: "#3B82F6", bg: "#EFF6FF", dot: "#3B82F6" },
  "resolved":    { label: "Resolved",      color: "#16A34A", bg: "#DCFCE7", dot: "#22C55E" },
  "closed":      { label: "Closed",        color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF" },
};

const INITIAL: StudentReport[] = [
  {
    id: "sr1",
    studentName: "Juan Dela Cruz", studentId: "2024-BISU-0042",
    boardingHouse: "Naquila BH", roomNumber: "Room A", bedNumber: "Bed 2",
    category: "electrical", priority: "high",
    title: "Broken Electric Fan in Room A",
    description: "The electric fan assigned to Bed 2 has been broken since last week. It's very hot especially at night and is affecting my sleep and studies.",
    imageColors: ["#FCA5A5", "#FCD34D"],
    dateSubmitted: "Aug 1, 2026", timeSubmitted: "9:14 AM",
    status: "in-progress",
    landlordResponse: "I have noted your concern and will send a repair person by August 5. Sorry for the inconvenience.",
    landlordResponseDate: "Aug 2, 2026",
    statusHistory: [
      { status: "pending",     date: "Aug 1, 9:14 AM" },
      { status: "in-progress", date: "Aug 2, 10:00 AM", note: "Landlord acknowledged" },
    ],
  },
  {
    id: "sr2",
    studentName: "Juan Dela Cruz", studentId: "2024-BISU-0042",
    boardingHouse: "Naquila BH", roomNumber: "Room A", bedNumber: "Bed 2",
    category: "water", priority: "medium",
    title: "Low Water Pressure in Shared Bathroom",
    description: "The water pressure in the shared bathroom has been very low for 3 days. It takes too long to fill a pail and affects our daily routine.",
    dateSubmitted: "Jul 28, 2026", timeSubmitted: "7:30 AM",
    status: "resolved",
    landlordResponse: "Plumber has fixed the water line issue. Water pressure should be back to normal now.",
    landlordResponseDate: "Jul 29, 2026",
    statusHistory: [
      { status: "pending",     date: "Jul 28, 7:30 AM" },
      { status: "in-progress", date: "Jul 28, 11:00 AM", note: "Plumber contacted" },
      { status: "resolved",    date: "Jul 29, 2:00 PM",  note: "Issue fixed by plumber" },
    ],
  },
  {
    id: "sr3",
    studentName: "Maria Santos", studentId: "2024-BISU-0055",
    boardingHouse: "Naquila BH", roomNumber: "Room B", bedNumber: "Bed 1",
    category: "cleanliness", priority: "medium",
    title: "Shared Bathroom Not Cleaned for a Week",
    description: "The shared bathroom on the ground floor has not been properly cleaned in over 7 days. There is visible mold near the drain and the toilet is dirty.",
    dateSubmitted: "Aug 3, 2026", timeSubmitted: "6:40 AM",
    status: "pending",
    statusHistory: [{ status: "pending", date: "Aug 3, 6:40 AM" }],
  },
];

let _store: StudentReport[] = [...INITIAL];

export function getReports(): StudentReport[] { return _store; }
export function addReport(r: StudentReport): void { _store = [r, ..._store]; }
export function updateReport(id: string, updates: Partial<StudentReport>): void {
  _store = _store.map(r => r.id === id ? { ...r, ...updates } : r);
}
