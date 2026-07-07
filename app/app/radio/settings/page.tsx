import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { RadioProfileForm } from "@/components/radio/radio-profile-form";
import styles from "../radio.module.css";
import Link from "next/link";

export const metadata = {
  title: "Station Settings  -  Artist Vault",
};

export default async function RadioSettingsPage() {
  const session = await requireSession();

  if (session.role !== "radio_station" && session.role !== "admin") {
    redirect("/vault");
  }

  const station = await db.radioStation.findUnique({
    where: { userId: session.userId },
  });

  if (!station) redirect("/radio/signup/profile");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>📻 Artist Vault</div>
        <p className={styles.copy}>Radio Station Portal</p>
        <nav className={styles.nav}>
          <Link href="/radio/dashboard">🎵 New Releases</Link>
          <Link href="/radio/notifications">🔔 Notifications</Link>
          <Link href="/radio/settings">⚙️ Station Settings</Link>
        </nav>
        <div className={styles.stationCard}>
          <strong>{station.stationName}</strong>
          {station.city && station.state && (
            <div className={styles.copy}>{station.city}, {station.state}</div>
          )}
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.heading}>Station Settings</h1>
            <p className={styles.subheading}>Update your profile and notification preferences</p>
          </div>
        </div>

        <div className={styles.settingsPage}>
          <RadioProfileForm userId={session.userId} />
        </div>
      </div>
    </div>
  );
}
