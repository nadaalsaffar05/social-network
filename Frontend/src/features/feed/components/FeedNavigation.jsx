import {
  Bell,
  ChatCircle,
  House,
  SignOut,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";

import { logoutUser } from "../../../api/auth.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import "./FeedNavigation.css";

export default function FeedNavigation() {
  const navigate = useNavigate();
  const navigateTo = usePageNavigate();
  const location = useLocation();

  async function handleLogout() {
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch {
      // Keep the user on the current page when ending the session fails.
    }
  }

  const navItems = [
    {
      icon: <House size={20} weight="fill" />,
      label: "Home",
      path: "/home",
      onClick: () => navigateTo("/home"),
    },
    { icon: <UsersThree size={20} />, label: "Groups", disabled: true },
    {
      icon: <ChatCircle size={20} />,
      label: "Messages",
      path: "/messages",
      onClick: () => navigateTo("/messages"),
    },
    {
      icon: <User size={20} />,
      label: "Profile",
      path: "/profile",
      onClick: () => navigateTo("/profile"),
    },
    {
      icon: <Bell size={20} />,
      label: "Notifications",
      path: "/notifications",
      onClick: () => navigateTo("/notifications"),
    },
  ];

  return (
    <nav className="feed-navigation" aria-label="Main navigation">
      <button
        className="feed-navigation__brand"
        type="button"
        onClick={() => navigateTo("/home")}
      >
        <img src="/loop-logo.png" alt="" />
        <span>loop</span>
      </button>

      <div className="feed-navigation__items">
        {navItems.map((item) => {
          const isCurrent = item.path === location.pathname;

          return (
            <motion.button
              key={item.label}
              className={`feed-navigation__item${isCurrent ? " feed-navigation__item--current" : ""}`}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              aria-current={isCurrent ? "page" : undefined}
              whileHover={item.disabled ? undefined : { x: 5, scale: 1.025 }}
              whileTap={item.disabled ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              {item.icon}
              <span>{item.label}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        className="feed-navigation__item feed-navigation__logout"
        type="button"
        onClick={handleLogout}
        whileHover={{ x: 5, scale: 1.025 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      >
        <SignOut size={20} />
        <span>Log out</span>
      </motion.button>
    </nav>
  );
}
