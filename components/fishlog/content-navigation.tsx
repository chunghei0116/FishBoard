"use client";
import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";

type ContentNavigation = {
  path: string;
  push: (href: string) => void;
  replace: (href: string) => void;
};
const Context = createContext<ContentNavigation | null>(null);
export const ContentNavigationProvider = Context.Provider;
export function useContentPath() { return useContext(Context)?.path; }
/** Forms keep their normal routes when rendered outside the island popup. */
export function useContentNavigation() {
  const router = useRouter();
  return useContext(Context) ?? router;
}
