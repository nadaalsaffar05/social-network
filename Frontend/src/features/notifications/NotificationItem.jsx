import {
  BellIcon,
  CakeIcon,
  CalendarDotsIcon,
  ChatCircleIcon,
  CheckIcon,
  HeartIcon,
  UserPlusIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";

import Avatar from "../../shared/components/avatar/Avatar.jsx";
import { NOTIFICATION_TYPE } from "../../shared/constants/enums";
import { formatLocalDateTime } from "../../shared/utils/dateTime";
import { getUserDisplayName } from "../../shared/utils/user";

const dateOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const details = {
  [NOTIFICATION_TYPE.FOLLOW_REQUEST]: {
    Icon: UserPlusIcon,
    message: (actor) => `${actor} requested to follow you`,
  },
  [NOTIFICATION_TYPE.GROUP_INVITATION]: {
    Icon: UsersThreeIcon,
    message: (actor, group) => `${actor} invited you to join ${group}`,
  },
  [NOTIFICATION_TYPE.GROUP_JOIN_REQUEST]: {
    Icon: UsersThreeIcon,
    message: (actor, group) => `${actor} requested to join ${group}`,
  },
  [NOTIFICATION_TYPE.EVENT_CREATED]: {
    Icon: CalendarDotsIcon,
    message: (actor, group) => `${actor} created an event in ${group}`,
  },
  [NOTIFICATION_TYPE.EVENT_REMINDER]: {
    Icon: CalendarDotsIcon,
    message: (_, group) => `Reminder: an event in ${group} is coming up`,
  },
  [NOTIFICATION_TYPE.FOLLOW_ACCEPTED]: {
    Icon: UserPlusIcon,
    message: (actor) => `${actor} accepted your follow request`,
  },
  [NOTIFICATION_TYPE.POST_REACTION]: {
    Icon: HeartIcon,
    message: (actor) => `${actor} reacted to your post`,
  },
  [NOTIFICATION_TYPE.COMMENT_REACTION]: {
    Icon: HeartIcon,
    message: (actor) => `${actor} reacted to your comment`,
  },
  [NOTIFICATION_TYPE.COMMENT]: {
    Icon: ChatCircleIcon,
    message: (actor) => `${actor} commented on your post`,
  },
  [NOTIFICATION_TYPE.NEW_FOLLOWER]: {
    Icon: UserPlusIcon,
    message: (actor) => `${actor} started following you`,
  },
  [NOTIFICATION_TYPE.BIRTHDAY]: {
    Icon: CakeIcon,
    message: (actor) => `It’s ${actor}’s birthday today`,
  },
};

export default function NotificationItem({
  notification,
  isProcessing,
  onRead,
  onRespond,
}) {
  const actor = getUserDisplayName(notification.actor, "Someone");
  const group = notification.group_title || "your group";
  const { Icon, message } = details[notification.type] || {
    Icon: BellIcon,
    message: () => "You have a new notification",
  };

  return (
    <article
      className={`notification-card${notification.is_read ? "" : " notification-card--unread"}`}
      onClick={() => onRead(notification)}
    >
      <div className="notification-card__icon" aria-hidden="true">
        <Icon size={21} weight="duotone" />
      </div>
      {notification.actor && (
        <Avatar
          avatarPath={notification.actor.avatar_path}
          seed={notification.actor.id}
          className="notification-card__avatar"
        />
      )}
      <div className="notification-card__content">
        <p>{message(actor, group)}</p>
        <time dateTime={notification.created_at}>
          {formatLocalDateTime(notification.created_at, dateOptions)}
        </time>
        {notification.actionable && (
          <div
            className="notification-card__actions"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="notification-card__accept"
              disabled={isProcessing}
              onClick={() => onRespond(notification, "accept")}
            >
              <CheckIcon size={16} weight="bold" />
              Accept
            </button>
            <button
              type="button"
              className="notification-card__decline"
              disabled={isProcessing}
              onClick={() => onRespond(notification, "decline")}
            >
              <XIcon size={16} weight="bold" />
              Decline
            </button>
          </div>
        )}
      </div>
      {!notification.is_read && (
        <span className="notification-card__unread" aria-label="Unread" />
      )}
    </article>
  );
}
