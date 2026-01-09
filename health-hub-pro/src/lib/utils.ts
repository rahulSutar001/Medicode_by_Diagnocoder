import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get full Supabase Storage URL from a path
 * Handles both full URLs (returns as-is) and relative paths
 */
export function getStorageUrl(path: string | undefined | null): string {
  if (!path) return '';

  // If it's already a full URL, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Otherwise, construct the full Storage URL
  // Default bucket is 'medical-reports' based on backend config
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Handle case where path might already include the bucket
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  return `${supabaseUrl}/storage/v1/object/public/medical-reports/${cleanPath}`;
}
