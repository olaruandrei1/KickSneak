import { getRecentBroadcasts } from "./actions";
import { getRoles } from "@/app/users/actions";
import NotificationsClient from "@/components/NotificationsClient";

export const revalidate = 0; // Disable cache for real-time notifications history

export default async function NotificationsPage() {
  const [roles, history] = await Promise.all([
    getRoles(),
    getRecentBroadcasts()
  ]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Broadcast Notificări Push</h1>
        <p className="page-subtitle">Trimite anunțuri de sistem, promoții sau avertismente către grupuri targetate sau utilizatori individuali.</p>
      </div>
      <NotificationsClient roles={roles} initialHistory={history} />
    </div>
  );
}
