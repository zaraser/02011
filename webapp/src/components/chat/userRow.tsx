// webapp/src/components/chat/userRow.tsx

import "../../style/chat/userRow.css";

type UserStatus =
  | "default"
  | "outgoing"
  | "incoming"
  | "friend";

  type Props = {
    id: number;
    login: string;
    status: UserStatus;
    selected: boolean;
  
    onSelect: () => void;
    onFriend: () => void;
    onReject: () => void;
    onInvite: () => void;
  };
  
  export default function UserRow({
    login,
    status,
    selected,
    onSelect,
    onFriend,
    onReject,
    onInvite,
  }: Props) {
    const shortLogin =
      login.length > 7 ? login.slice(0, 7) + "..." : login;
  const statusClass =
    status === "outgoing"
      ? "friend-outgoing"
      : status === "incoming"
        ? "friend-incoming"
        : status === "friend"
          ? "friend-confirmed"
          : "friend-default";
  
    return (
      <div
        className={`chat-user-item ${selected ? "selected" : ""}`}
        onClick={onSelect}
      >
        <span className="user-login">{shortLogin}</span>
  
        <div
          className="user-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {status === "incoming" ? (
            <>
              <button
                className={`action-icon ${statusClass}`}
                title="Принять заявку"
                onClick={onFriend}
              >
                ✅
              </button>
  
              <button
                className="action-icon"
                title="Отклонить заявку"
                onClick={onReject}
              >
                ❌
              </button>
            </>
          ) : (
            <button
              className={`action-icon ${statusClass}`}
              title="Friend action"
              onClick={onFriend}
            >
              🤝
            </button>
          )}
  
          <button
            className="action-icon"
            onClick={onInvite}
            aria-label="Invite to Pong"
            title="Пригласить в игру"
          >
            🏓
          </button>
        </div>
      </div>
    );
  }
  