import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import {
  Bell,
  ChatCircle,
  House,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { logoutUser } from "../../../api/auth.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { useChatRealtime } from "../../chat/realtime/useChatRealtime.js";
import "./FeedNavigation.css";

function DockItem({
  icon,
  label,
  onClick,
  disabled = false,
  mouseY,
  spring,
  distance,
  magnification,
  baseItemSize,
  badgeCount = 0,
}) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseY, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      top: 0,
      height: baseItemSize,
    };

    return value - rect.top - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize],
  );

  const size = useSpring(targetSize, spring);

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className="feed-dock-item"
      aria-label={badgeCount ? `${label}, ${badgeCount} unread` : label}
      disabled={disabled}
    >
      <DockIcon badgeCount={badgeCount}>{icon}</DockIcon>
      <DockLabel isHovered={isHovered}>{label}</DockLabel>
    </motion.button>
  );
}

function DockLabel({ children, isHovered }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(
    () => isHovered.on("change", (value) => setIsVisible(value === 1)),
    [isHovered],
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: 10 }}
          exit={{ opacity: 0, x: 0 }}
          transition={{ duration: 0.2 }}
          className="feed-dock-label"
          role="tooltip"
          style={{ y: "-50%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, badgeCount }) {
  return (
    <div className="feed-dock-icon">
      {children}
      {badgeCount > 0 && (
        <span className="feed-dock-badge" aria-hidden="true">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </div>
  );
}

export default function FeedNavigation({ onCreatePost, profile, isMobile = false }) {
  const navigate = useNavigate();
  const navigateTo = usePageNavigate();
  const { attentionCounts } = useChatRealtime();

  const spring = {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  };

  const magnification = 66;
  const baseItemSize = 58;
  const distance = 130;
  const mouseY = useMotionValue(Infinity);

  async function handleLogout() {
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch {
      return;
    }
  }

  const primaryItems = [
    {
      icon: <House size={20} weight="fill" />,
      label: "Home",
      onClick: () => navigateTo("/home"),
    },
    {
      icon: <UsersThree size={20} />,
      label: "Groups",
      onClick: () => navigateTo("/groups"),
    },
    {
      icon: <ChatCircle size={20} />,
      label: "Messages",
      onClick: () => navigateTo("/messages"),
      badgeCount: attentionCounts.messages,
    },
    {
      icon: <Bell size={20} />,
      label: "Notifications",
      onClick: () => navigateTo("/notifications"),
    },
  ];


  if (isMobile) {
    return (
      <nav className="feed-dock feed-dock--mobile" aria-label="Main navigation">
        <div className="feed-dock-panel feed-dock-panel--mobile border-glow">
          {primaryItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="feed-dock-item feed-dock-item--mobile"
              onClick={item.onClick}
              aria-label={
                item.badgeCount
                  ? `${item.label}, ${item.badgeCount} unread`
                  : item.label
              }
            >
              <DockIcon badgeCount={item.badgeCount || 0}>{item.icon}</DockIcon>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="feed-dock" aria-label="Main navigation">
      {/* Brand — outside the glass box, pinned to top */}
      <button
        type="button"
        className="feed-dock-brand"
        onClick={() => navigateTo("/home")}
        aria-label="Loop home"
      >
        <img src="/loop-wordmark.png" alt="" />
      </button>

      {/* Glass panel — nav items only */}
      <div
        className="feed-dock-panel"
        onMouseMove={({ clientY }) => {
          mouseY.set(clientY);
        }}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        <div className="feed-dock-items border-glow">
          {primaryItems.map((item) => (
            <DockItem
              key={item.label}
              {...item}
              mouseY={mouseY}
              spring={spring}
              distance={distance}
              magnification={magnification}
              baseItemSize={baseItemSize}
            />
          ))}
        </div>
      </div>

      {/* Profile card — outside the glass box, pinned to bottom */}
      {profile && (
        <div className="feed-dock-profile-card">
          <button
            type="button"
            className="feed-dock-profile-name-btn"
            onClick={() => navigateTo("/profile")}
            aria-label="Open your profile"
          >
            <Avatar avatarPath={profile.avatar_path} seed={profile.id} alt="" />
            <span>{profile.first_name || "Profile"}</span>
          </button>
          <button
            type="button"
            className="feed-dock-logout-btn"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <SignOut size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
