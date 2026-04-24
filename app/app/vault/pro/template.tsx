"use client";

import type { ReactNode } from "react";
import { PathRedirect } from "@/components/vault/path-redirect";

export default function ProTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <PathRedirect from="/vault/pro" to="/vault/pro/home" />
      {children}
    </>
  );
}
