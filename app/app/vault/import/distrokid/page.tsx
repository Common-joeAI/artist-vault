import DistroKidImportClient from "@/components/distrokid/DistroKidImportClient";
import DistroKidTsvImport from "@/components/distrokid/DistroKidTsvImport";

export const dynamic = "force-dynamic";

export default function DistroKidImportPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "24px 0" }}>
      <DistroKidTsvImport />
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 32 }}>
        <DistroKidImportClient />
      </div>
    </div>
  );
}
