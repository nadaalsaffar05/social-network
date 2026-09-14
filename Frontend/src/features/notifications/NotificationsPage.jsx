import { Bell } from "@phosphor-icons/react";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import "./NotificationsPage.css";

export default function NotificationsPage() {
  return (
    <div className="notifications-layout">
      <div className="notifications-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="notifications-container">
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
