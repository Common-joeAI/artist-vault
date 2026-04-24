import Link from "next/link";
import * as DistroKidModule from "@/components/distrokid/DistroKidImportClient";

const DistroKidImportClient =
  (DistroKidModule as any).default ?? (DistroKidModule as any).DistroKidImportClient;

export default function DistroKidImporterPage() {
  return (
    <main style={{ padding: "24px", display: "grid", gap: "16px" }}>
      <div>
        <div
          style={{
            fontSize: "12px",
            opacity: 0.7,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Release import
        </div>

        <h1 style={{ margin: "8px 0 6px" }}>DistroKid importer</h1>

        <p style={{ margin: 0, maxWidth: "780px" }}>
          Import releases from your DistroKid catalog into Artist Vault drafts.
        </p>
      </div>

      <div>
        <Link href="/vault/pro/releases/new/workflow">
          Back to release workflow
        </Link>
      </div>

      <DistroKidImportClient />
    </main>
  );
}
