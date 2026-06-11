import { getChatSessions } from "./actions";
import ChatSupportClient from "@/components/ChatSupportClient";

export const revalidate = 0; // Disable cache for real-time chat dashboard data

export default async function ChatPage() {
  const initialSessions = await getChatSessions();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Asistență și Chat Suport</h1>
        <p className="page-subtitle">Vizualizează discuțiile active de pe site. Oferă răspunsuri în timp real și preia manual conversațiile asistate de AI.</p>
      </div>
      <ChatSupportClient initialSessions={initialSessions} />
    </div>
  );
}
