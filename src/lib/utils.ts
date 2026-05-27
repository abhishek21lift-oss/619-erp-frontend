import { clsx, type ClassValue } from "clsx";

/** Merge class names safely with clsx (no tailwind-merge needed) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
