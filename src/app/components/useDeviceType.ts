// Shared device-tier detection — single source of truth for both App.tsx's
// shell (MobileShell/AdminShellFrame) and every individual admin screen that
// needs to lay itself out differently at desktop width (stat grids, tables,
// header spacing). Three tiers, matching DormiTrack's responsive spec:
//  - "mobile"  — a genuinely narrow browser (real phone or shrunk window)
//  - "tablet"  — the in-between range
//  - "desktop" — wide enough for a real desktop layout (admin only, in practice)
import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 500;
export const DESKTOP_BREAKPOINT = 1024;

export type DeviceType = "mobile" | "tablet" | "desktop";

function computeDeviceType(): DeviceType {
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  return w <= MOBILE_BREAKPOINT ? "mobile" : w >= DESKTOP_BREAKPOINT ? "desktop" : "tablet";
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(computeDeviceType);
  useEffect(() => {
    const check = () => setDeviceType(computeDeviceType());
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return deviceType;
}
