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
  PlusCircle,
  SignOut,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { logoutUser } from "../../../api/auth.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import Avatar from "../../../shared/components/avatar/Avatar.jsx";
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
      aria-label={label}
      disabled={disabled}
    >
      <DockIcon>{icon}</DockIcon>
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

function DockIcon({ children }) {
  return <div className="feed-dock-icon">{children}</div>;
}

export default function FeedNavigation({ onCreatePost, profile }) {
  const navigate = useNavigate();
  const navigateTo = usePageNavigate();

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
      icon: <PlusCircle size={20} weight="fill" />,
      label: "Create post",
      onClick: onCreatePost,
    },
    {
      icon: <User size={20} />,
      label: "Profile",
      onClick: () => navigateTo("/profile"),
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
    },
    {
      icon: <Bell size={20} />,
      label: "Notifications",
      onClick: () => navigateTo("/notifications"),
    },
  ];

  return (
    <nav className="feed-dock" aria-label="Main navigation">
      <div
        className="feed-dock-panel border-glow"
        onMouseMove={({ clientY }) => {
          mouseY.set(clientY);
        }}
        onMouseLeave={() => mouseY.set(Infinity)}
      >
        <button
          type="button"
          className="feed-dock-brand"
          onClick={() => navigateTo("/home")}
          aria-label="Loop home"
        >
          <img src="/loop-wordmark.png" alt="" />
        </button>

        <div className="feed-dock-items">
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

        <div className="feed-dock-footer">
          <DockItem
            icon={<SignOut size={20} />}
            label="Log out"
            onClick={handleLogout}
            mouseY={mouseY}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          />

          {profile && (
            <button
              type="button"
              className="feed-dock-profile"
              onClick={() => navigateTo("/profile")}
              aria-label="Open your profile"
            >
              <Avatar
                avatarPath={profile.avatar_path}
                seed={profile.id}
                alt=""
              />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
