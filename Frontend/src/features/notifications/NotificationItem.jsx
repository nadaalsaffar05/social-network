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
import {
  NOTIFICATION_TYPE,
  REQUEST_STATUS,
} from "../../shared/constants/enums";
import { formatLocalDateTime } from "../../shared/utils/dateTime";
import { getUserDisplayName } from "../../shared/utils/user";
import { usePageNavigate } from "../../shared/components/back-button/usePageBack.js";

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
    message: (actor, group, status) =>
      status === REQUEST_STATUS.ACCEPTED
        ? `You joined ${group}`
        : status === REQUEST_STATUS.DECLINED
          ? `You declined ${actor}'s invitation to join ${group}`
          : `${actor} invited you to join ${group}`,
  },
  [NOTIFICATION_TYPE.GROUP_JOIN_REQUEST]: {
    Icon: UsersThreeIcon,
    message: (actor, group, status) =>
      status === REQUEST_STATUS.ACCEPTED
        ? `${actor} joined ${group}`
        : status === REQUEST_STATUS.DECLINED
          ? `You declined ${actor}'s request to join ${group}`
          : `${actor} requested to join ${group}`,
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
    message: (actor) => `${actor} liked your post`,
  },
  [NOTIFICATION_TYPE.COMMENT_REACTION]: {
    Icon: HeartIcon,
    message: (actor) => `${actor} liked your comment`,
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

function getNotificationDestination(notification) {
  const actorProfilePath = notification.actor?.id
    ? `/profile/${notification.actor.id}`
    : "";

  switch (notification.type) {
    case NOTIFICATION_TYPE.FOLLOW_REQUEST:
      return "/follow-requests";
    case NOTIFICATION_TYPE.GROUP_INVITATION:
      return notification.group_id ? `/groups/${notification.group_id}` : "";
    case NOTIFICATION_TYPE.GROUP_JOIN_REQUEST:
      return notification.group_id
        ? `/groups/${notification.group_id}?tab=requests`
        : "";
    case NOTIFICATION_TYPE.EVENT_CREATED:
    case NOTIFICATION_TYPE.EVENT_REMINDER:
      return notification.group_id
        ? `/groups/${notification.group_id}?tab=events`
        : "";
    case NOTIFICATION_TYPE.POST_REACTION:
    case NOTIFICATION_TYPE.COMMENT_REACTION:
    case NOTIFICATION_TYPE.COMMENT:
      return notification.post_id
        ? `/posts/${notification.post_id}`
        : actorProfilePath;
    default:
      return actorProfilePath;
  }
}

export default function NotificationItem({
  notification,
  isProcessing,
  onRead,
  onRespond,
}) {
  const navigateTo = usePageNavigate();
  const actor = getUserDisplayName(notification.actor, "Someone");
  const group = notification.group_title || "your group";
  const { Icon, message } = details[notification.type] || {
    Icon: BellIcon,
    message: () => "You have a new notification",
  };
  const responseLabel =
    notification.type === NOTIFICATION_TYPE.FOLLOW_REQUEST
      ? ""
      : notification.action_status === REQUEST_STATUS.ACCEPTED
        ? "Accepted"
        : notification.action_status === REQUEST_STATUS.DECLINED
          ? "Declined"
          : "";

  function handleOpen() {
    onRead(notification);

    const destination = getNotificationDestination(notification);
    if (destination) {
      navigateTo(destination);
    }
  }

  return (
    <article
      className={`notification-card${notification.is_read ? "" : " notification-card--unread"}`}
      onClick={handleOpen}
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
        <p>{message(actor, group, notification.action_status)}</p>
        <time dateTime={notification.created_at}>
          {formatLocalDateTime(notification.created_at, dateOptions)}
        </time>
        {responseLabel && (
          <span
            className={`notification-card__status notification-card__status--${responseLabel.toLowerCase()}`}
          >
            {responseLabel}
          </span>
        )}
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
