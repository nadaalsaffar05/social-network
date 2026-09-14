import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "@phosphor-icons/react";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import "./NotificationsPage.css";

export default function NotificationsPage() {
  const navigate = useNavigate();

  return (
    <div className="notifications-layout">
      <div className="notifications-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="notifications-container">
        {/*<header className="notifications-header-card">*/}
        {/*  <div className="notifications-header-left">*/}
        {/*    <button*/}
        {/*      type="button"*/}
        {/*      className="notifications-back-btn"*/}
        {/*      aria-label="Go back"*/}
        {/*      onClick={() => navigate(-1)}*/}
        {/*    >*/}
        {/*      <ArrowLeft size={20} />*/}
        {/*    </button>*/}
        {/*    <h1 className="notifications-title">*/}
        {/*      Notifications*/}
        {/*    </h1>*/}
        {/*  </div>*/}
        {/*</header>*/}

        <main className="notifications-content">
          <div className="notifications-empty">
            <div className="notifications-empty-icon-wrap">
              <Bell size={48} className="notifications-empty-icon" weight="duotone" />
            </div>
            <h3 className="notifications-empty-title">No notifications yet</h3>
            <p className="notifications-empty-text">
              You're all caught up! When you receive new notifications, likes, comments, or mentions, they will appear here.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
