// webapp/src/components/chat/userList.tsx
import { useEffect, useState } from "react";
import UserRow from "./UserRow";
import { getSocket } from "../../socket";
import ProfileModal from "./profileModal";
import { useUserCache } from "../../hooks/useUserCache";

export type UserStatus =
  | "default"
  | "outgoing"
  | "incoming"
  | "friend";

type UserWithStatus = {
  id: number;
  login: string;
  avatar: string | null;
  status: UserStatus;
  online: boolean;
};

type Props = {
  myUserId: number;
  selectedUserId: number | null;
  onSelectUser: (id: number) => void;
};

export default function UserList({
  myUserId,
  selectedUserId,
  onSelectUser,
}: Props) {
  const socket = getSocket();
  const { update } = useUserCache();

  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [viewingProfileId, setViewingProfileId] =
    useState<number | null>(null);

  useEffect(() => {
    const refresh = () => socket.emit("users:list");

    const onUsersList = (data: UserWithStatus[]) => {
      update(data);        // 🔥 ОБНОВЛЯЕМ КЭШ
      setUsers(data);
    };

    refresh();

    socket.on("users:list", onUsersList);
    socket.on("user:new", refresh);
    socket.on("user:state:update", refresh);
    //socket.on("users:online", refresh);

    return () => {
      socket.off("users:list", onUsersList);
      socket.off("user:new", refresh);
      socket.off("user:state:update", refresh);
     // socket.off("users:online", refresh);
    };
  }, [socket, update]);

  function handleFriendClick(user: UserWithStatus) {
    switch (user.status) {
      case "default":
        socket.emit("friend:request", { targetId: user.id });
        break;
      case "outgoing":
        socket.emit("friend:cancel", { targetId: user.id });
        break;
      case "incoming":
        socket.emit("friend:accept", { targetId: user.id });
        break;
      case "friend":
        socket.emit("friend:remove", { targetId: user.id });
        break;
    }
  }

  const displayedUsers = users.filter((u) => u.id !== myUserId);

  return (
    <>
      <div className="user-list">
        {displayedUsers.map((u) => (
          <UserRow
            key={u.id}
            id={u.id}
            login={u.login}
            status={u.status}
            selected={u.id === selectedUserId}
            online={u.online}
            onSelect={() => onSelectUser(u.id)}
            onFriend={() => handleFriendClick(u)}
            onReject={() =>
              socket.emit("friend:reject", { targetId: u.id })
            }
            onInvite={() =>
              socket.emit("game:invite", { targetId: u.id })
            }
            onProfile={() => setViewingProfileId(u.id)}
          />
        ))}
      </div>

      {viewingProfileId !== null && (
        <ProfileModal
          userId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}
    </>
  );
}
