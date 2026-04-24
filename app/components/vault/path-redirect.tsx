"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function PathRedirect({ from, to }: { from: RegExp | string; to: string | ((pathname: string) => string) }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const matches = typeof from === "string" ? pathname === from : from.test(pathname);
    if (!matches) return;
    const target = typeof to === "string" ? to : to(pathname);
    if (target && target !== pathname) {
      router.replace(target);
    }
  }, [from, pathname, router, to]);

  return null;
}
