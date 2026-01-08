// chat/src/handlers/index.ts
import { registerBlockHandlers } from "./block.js";
import { registerFriendHandlers } from "./friends.js";
import { registerMessageHandlers } from "./messages.js";
import { registerInviteHandlers } from "./invite.js";
import { registerAuthHandlers } from "./auth.js";

import { relationships } from "../services/relationship.service.js";
import { getAllSnapshotUsers } from "../repositories/users.repository.js";
import { isUserOnline } from "../socketRegistry.js";


type UserStatus =
  | "default"
  | "outgoing"
  | "incoming"
  | "friend";

function mapRelationshipToStatus(state: string): UserStatus {
  switch (state) {
    case "friends":
      return "friend";

    case "outgoing_request":
      return "outgoing";

    case "incoming_request":
      return "incoming";

    // ❗ blocked / blocked_by сознательно игнорируем
    default:
      return "default";
  }
}

export function registerAllHandlers(io: any, socket: any) {
  // 🔐 auth
  registerAuthHandlers(io, socket);

  // 👥 users list (ТОЛЬКО социальные статусы)
  socket.on("users:list", () => {
    const users = getAllSnapshotUsers()
      .filter((u) => u.id !== socket.user.id)
      .map((u) => {
        const relState = relationships.getState(socket.user.id, u.id);
  
        return {
          id: u.id,
          login: u.login,
          avatar: u.avatar,
          status: mapRelationshipToStatus(relState),
          online: isUserOnline(u.id),
        };
      });
  
    socket.emit("users:list", users);
  });
  

  // 🔒 block — ОТДЕЛЬНО
  registerBlockHandlers(io, socket);

  // 👥 friends
  registerFriendHandlers(io, socket);

  // 💬 messages
  // ⚠️ блокировка проверяется ВНУТРИ messages handlers
  registerMessageHandlers(io, socket);

  // 🎮 invite
  registerInviteHandlers(io, socket);
}
