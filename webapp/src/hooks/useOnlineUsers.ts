// webapp/src/hooks/useOnlineUsers.ts
import { useEffect, useState } from "react";
import { getSocket } from "../socket";

type UserData = {
  id: number;
  online: boolean;
};

export function useOnlineUsers(): number[] {
  const socket = getSocket();
  const [onlineIds, setOnlineIds] = useState<number[]>([]);

  useEffect(() => {
    const handler = (users: UserData[]) => {
      setOnlineIds(
        users.filter((u) => u.online).map((u) => u.id)
      );
    };

    // слушаем
    socket.on("users:list", handler);

    // 🔑 важно: сами запрашиваем данные
    socket.emit("users:list");

    return () => {
      socket.off("users:list", handler);
    };
  }, [socket]);

  return onlineIds;
}
