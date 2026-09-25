"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RelationshipRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/partner");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-xs font-mono text-zinc-400">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span>Redirecting to Unified Partner Hub...</span>
      </div>
    </div>
  );
}
