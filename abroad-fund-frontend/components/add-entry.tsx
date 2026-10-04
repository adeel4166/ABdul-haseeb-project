"use client";

import { createContext, useContext, type ReactNode } from "react";

const AddEntryContext = createContext<(() => void) | null>(null);

export function AddEntryProvider({
  openAdd,
  children,
}: {
  openAdd: () => void;
  children: ReactNode;
}) {
  return <AddEntryContext.Provider value={openAdd}>{children}</AddEntryContext.Provider>;
}

export function useAddEntry() {
  const openAdd = useContext(AddEntryContext);
  if (!openAdd) throw new Error("useAddEntry must be used inside the desk window");
  return openAdd;
}
