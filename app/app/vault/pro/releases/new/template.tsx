"use client";

import type { ReactNode } from "react";
import { PathRedirect } from "@/components/vault/path-redirect";

export default function ProReleaseNewTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <PathRedirect from="/vault/pro/releases/new" to="/vault/pro/releases/new/workflow" />
      {children}
    </>
  );
}
