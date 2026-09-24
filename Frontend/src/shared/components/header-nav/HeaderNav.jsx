import { Fragment } from "react";
import { Bell } from "@phosphor-icons/react";
import { usePageNavigate } from "../back-button/usePageBack.js";
import { useChatRealtime } from "../../../features/chat/realtime/useChatRealtime.js";
import "./HeaderNav.css";

export default function HeaderNav() {
  const navigateTo = usePageNavigate();
  const { attentionCounts } = useChatRealtime();

  const items = [
    {
      id: "notifications",
      label: "Notifications",
      Icon: Bell,
      count: attentionCounts.notifications,
      path: "/notifications",
    },
  ];

  return (
    <div className="header-nav" role="toolbar" aria-label="Header navigation">
      {items.map(({ Icon, count, id, label, path }, index) => (
        <Fragment key={id}>
          {index > 0 && (
            <div className="header-nav__divider" aria-hidden="true" />
          )}
          <button
            type="button"
            id={`header-nav-${id}`}
            className="header-nav__btn"
            onClick={() => navigateTo(path)}
            aria-label={label}
            title={label}
          >
            <span className="header-nav__icon-wrap">
              <Icon size={22} weight="regular" />
              {count > 0 && (
                <span
                  className="header-nav__badge"
                  aria-label={`${count} ${label}`}
                >
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </span>
            <span className="header-nav__label">{label}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}
