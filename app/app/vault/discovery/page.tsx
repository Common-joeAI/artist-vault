import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { DiscoveryClient } from "./discovery-client";

export const metadata = {
  title: "AI Discovery — Artist Vault",
};

export default async function DiscoveryPage() {
  const session = await requireSession();
  const profile = await db.artistProfile.findFirst({
    where: { ownerUserId: session.userId },
    select: { id: true, name: true },
  });

  // Get last discovery job
  const lastJob = await db.externalDiscoveryJob.findFirst({
    where: { ownerUserId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
          🔍 AI Discovery
        </h2>
        <p style={{ color: "#9ca3af", marginTop: "0.4rem" }}>
          Find music you've released outside your distributor — YouTube, Spotify,
          and more. Claude will analyze the results and flag anything missing from
          your vault.
        </p>
      </div>

      <DiscoveryClient
        artistProfileId={profile?.id ?? null}
        artistName={profile?.name ?? null}
        lastJob={lastJob ? {
          status: lastJob.status,
          completedAt: lastJob.completedAt?.toISOString() ?? null,
          discovered: (lastJob.discoveredJson as unknown[]) ?? [],
          aiSummary: (lastJob.aiSummaryJson as { summary?: string } | null)?.summary ?? null,
        } : null}
      />
    </div>
  );
}
