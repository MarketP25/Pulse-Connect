import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions"; // adjust path if needed

export const getSessionUser = async () => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("🔒 No active session found");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role || "guest",
    region: session.user.region || "global"
  };
};
