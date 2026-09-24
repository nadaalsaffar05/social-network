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
import {
  Children,
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { logoutUser } from "../../../api/auth.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import "./FeedNavigation.css";

function DockItem({
  children,
  onClick,
  mouseY,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
  disabled = false,
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

  function handleKeyDown(event) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={disabled ? undefined : onClick}
      className="feed-dock-item"
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
    >
      {Children.map(children, (child) => cloneElement(child, { isHovered }))}
    </motion.div>
  );
}

function DockLabel({ children, isHovered }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => isHovered.on("change", (value) => setIsVisible(value === 1)), [isHovered]);

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

export default function FeedNavigation({ onCreatePost }) {
  const navigate = useNavigate();
  const navigateTo = usePageNavigate();
  const spring = { mass: 0.1, stiffness: 150, damping: 12 };
  const magnification = 80;
  const baseItemSize = 64;
  const panelWidth = 100;
  const distance = 200;
  const mouseY = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);
  const maxWidth = useMemo(
    () => Math.max(panelWidth, magnification + magnification / 2 + 4),
    [magnification],
  );
  const width = useSpring(
    useTransform(isHovered, [0, 1], [panelWidth, maxWidth]),
    spring,
  );

  async function handleLogout() {
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch {
      return;
    }
  }

  const items = [
    { icon: <House size={20} weight="fill" />, label: "Home", onClick: () => navigateTo("/home") },
    { icon: <PlusCircle size={20} weight="fill" />, label: "Create post", onClick: onCreatePost },
    { icon: <User size={20} />, label: "Profile", onClick: () => navigateTo("/profile") },
    { icon: <UsersThree size={20} />, label: "Groups", onClick: () => navigateTo("/groups")},
    { icon: <ChatCircle size={20} />, label: "Messages", onClick: () => navigateTo("/messages") },
    { icon: <Bell size={20} />, label: "Notifications", onClick: () => navigateTo("/notifications") },
    { icon: <SignOut size={20} />, label: "Log out", onClick: handleLogout },
  ];

  return (
    <motion.nav className="feed-dock" style={{ width }} aria-label="Main navigation">
      <motion.div
        className="feed-dock-panel border-glow"
        style={{ width: panelWidth }}
        onMouseMove={({ clientY }) => {
          isHovered.set(1);
          mouseY.set(clientY);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseY.set(Infinity);
        }}
      >
        {items.map((item) => (
          <DockItem
            key={item.label}
            {...item}
            mouseY={mouseY}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.nav>
  );
}
