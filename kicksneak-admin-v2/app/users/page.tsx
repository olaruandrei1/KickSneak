import { getUsers, getRoles } from "./actions";
import UsersClient from "@/components/UsersClient";

export const revalidate = 0; // Disable cache for real-time user dashboard data

export default async function UsersPage() {
  const [initialUsers, roles] = await Promise.all([
    getUsers({ page: 1, pageSize: 8 }),
    getRoles()
  ]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Administrare Utilizatori</h1>
        <p className="page-subtitle">Modifică rolurile conturilor înregistrate pe platformă, suspendă sau blochează accesul utilizatorilor abuzivi.</p>
      </div>
      <UsersClient initialUsers={initialUsers} roles={roles} />
    </div>
  );
}
