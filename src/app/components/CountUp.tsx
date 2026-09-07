import React from "react";
import { useCountUp } from "./useCountUp";

// Thin presentational wrapper around useCountUp — lets stat cards animate
// their number from a plain .map() without breaking the rules of hooks
// (a hook can't be called directly inside a loop/callback, but a component
// rendered once per item can).
export function CountUp({ value, suffix = "", duration }: { value: number; suffix?: string; duration?: number }) {
  const display = useCountUp(value, duration);
  return <>{display}{suffix}</>;
}
