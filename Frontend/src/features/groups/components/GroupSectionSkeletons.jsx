import Skeleton from "../../../shared/components/skeleton/Skeleton.jsx";
import { PostCardSkeleton } from "../../../shared/components/skeleton/PageSkeletons.jsx";

import "./GroupSectionSkeletons.css";

const rowKeys = (count) => Array.from({ length: count }, (_, index) => index);

function SectionHeaderSkeleton({ action = false }) {
  return (
    <div className="group-section-skeleton__header">
      <Skeleton variant="text" width={96} height={11} />
      {action && <Skeleton variant="button" width={104} height={34} />}
    </div>
  );
}

function PersonSkeleton() {
  return (
    <div className="group-section-skeleton__person">
      <Skeleton variant="avatar" width={42} height={42} />
      <div className="group-section-skeleton__identity">
        <Skeleton variant="text" width="8.5rem" height={14} />
        <Skeleton variant="text" width="5rem" height={11} />
      </div>
    </div>
  );
}

function DateSkeleton() {
  return (
    <div className="group-section-skeleton__date">
      <Skeleton variant="text" width={48} height={9} />
      <Skeleton variant="text" width={72} height={11} />
    </div>
  );
}

function MemberRowsSkeleton({ count = 3 }) {
  return rowKeys(count).map((index) => (
    <div key={index} className="group-member-row group-section-skeleton__row">
      <Skeleton variant="avatar" width={42} height={42} />
      <div className="group-member-identity group-section-skeleton__identity">
        <Skeleton variant="text" width="8.5rem" height={14} />
        <Skeleton variant="text" width="5rem" height={11} />
      </div>
      <DateSkeleton />
      <Skeleton variant="button" width={82} height={34} />
    </div>
  ));
}

function InvitationRowsSkeleton({ count = 2, recipientView = false }) {
  return rowKeys(count).map((index) => (
    <div
      key={index}
      className={`${
        recipientView ? "user-group-invitation-row" : "group-invitation-row"
      } group-section-skeleton__row`}
    >
      {recipientView ? (
        <div className="group-section-skeleton__identity">
          <Skeleton variant="text" width={44} height={9} />
          <Skeleton variant="text" width="8rem" height={14} />
        </div>
      ) : (
        <PersonSkeleton />
      )}
      <PersonSkeleton />
      <DateSkeleton />
      {recipientView ? (
        <div className="group-section-skeleton__actions">
          <Skeleton variant="button" width={72} height={34} />
          <Skeleton variant="button" width={72} height={34} />
        </div>
      ) : (
        <Skeleton variant="button" width={82} height={34} />
      )}
    </div>
  ));
}

function JoinRequestRowsSkeleton({ count = 3 }) {
  return rowKeys(count).map((index) => (
    <div
      key={index}
      className="group-join-request-row group-section-skeleton__row"
    >
      <Skeleton variant="avatar" width={42} height={42} />
      <div className="group-join-request-identity group-section-skeleton__identity">
        <Skeleton variant="text" width="8.5rem" height={14} />
        <Skeleton variant="text" width="5rem" height={11} />
      </div>
      <DateSkeleton />
      <div className="group-section-skeleton__actions">
        <Skeleton variant="button" width={38} height={38} />
        <Skeleton variant="button" width={38} height={38} />
      </div>
    </div>
  ));
}

function EventCardsSkeleton({ count = 3 }) {
  return rowKeys(count).map((index) => (
    <article key={index} className="group-event-card group-section-skeleton__event-card">
      <div className="group-event-date-block group-section-skeleton__event-date">
        <Skeleton variant="text" width={28} height={10} />
        <Skeleton variant="text" width={40} height={34} />
        <Skeleton variant="text" width={28} height={10} />
      </div>
      <div className="group-event-details group-section-skeleton__event-details">
        <Skeleton variant="text" width="42%" height={20} />
        <Skeleton variant="text" width="54%" height={12} />
        <Skeleton variant="text" width="76%" height={13} />
        <div className="group-section-skeleton__person">
          <Skeleton variant="avatar" width={30} height={30} />
          <Skeleton variant="text" width="9rem" height={12} />
        </div>
      </div>
      <div className="group-event-rsvp group-section-skeleton__event-actions">
        <Skeleton variant="button" width={122} height={44} />
        <Skeleton variant="button" width={122} height={44} />
      </div>
    </article>
  ));
}

function ChatMessagesSkeleton({ compact = false }) {
  return (
    <div
      className={`group-section-skeleton__chat-messages${
        compact ? " group-section-skeleton__chat-messages--compact" : ""
      }`}
    >
      <Skeleton variant="text" width={72} height={12} className="group-section-skeleton__chat-day" />
      <div className="group-section-skeleton__chat-message">
        <Skeleton variant="text" width="12rem" height={14} />
        <Skeleton variant="text" width={42} height={10} />
      </div>
      <div className="group-section-skeleton__chat-message group-section-skeleton__chat-message--mine">
        <Skeleton variant="text" width="9rem" height={14} />
        <Skeleton variant="text" width={42} height={10} />
      </div>
      <div className="group-section-skeleton__chat-message">
        <Skeleton variant="text" width="14rem" height={14} />
        <Skeleton variant="text" width={42} height={10} />
      </div>
    </div>
  );
}

export function GroupPostsSkeleton({ count = 2, pagination = false }) {
  return (
    <section className="group-posts group-section-skeleton">
      {!pagination && <SectionHeaderSkeleton action />}
      <div className="group-posts-list group-section-skeleton__posts">
        <PostCardSkeleton count={count} />
      </div>
    </section>
  );
}

export function GroupChatSkeleton({ pagination = false }) {
  if (pagination) {
    return <ChatMessagesSkeleton compact />;
  }

  return (
    <section className="group-chat group-section-skeleton">
      <header className="group-chat-header">
        <Skeleton variant="text" width={160} height={20} />
      </header>
      <ChatMessagesSkeleton />
      <div className="chat-composer group-chat-composer group-section-skeleton__chat-composer">
        <Skeleton variant="rectangular" width="100%" height={48} />
        <Skeleton variant="circular" width={42} height={42} />
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </section>
  );
}

export function GroupEventsSkeleton({ count = 3, pagination = false }) {
  return (
    <section className="group-events group-section-skeleton">
      {!pagination && <SectionHeaderSkeleton action />}
      <div className="group-events-list">
        <EventCardsSkeleton count={count} />
      </div>
    </section>
  );
}

export function GroupMembersSkeleton({ count = 3, pagination = false }) {
  return (
    <section className="group-members group-section-skeleton">
      {!pagination && <SectionHeaderSkeleton />}
      <div className="group-members-list">
        <MemberRowsSkeleton count={count} />
      </div>
    </section>
  );
}

export function GroupInvitationsSkeleton({ count = 2, pagination = false }) {
  return (
    <section className="group-invitations group-section-skeleton">
      {!pagination && (
        <>
          <SectionHeaderSkeleton />
          <Skeleton variant="rectangular" width="100%" height={46} />
        </>
      )}
      <div className="group-invitations-list">
        <InvitationRowsSkeleton count={count} />
      </div>
    </section>
  );
}

export function GroupInvitationSearchSkeleton() {
  return (
    <div className="group-invitations-search-items group-section-skeleton">
      {rowKeys(2).map((index) => (
        <div
          key={index}
          className="group-invitations-search-result group-section-skeleton__search-result"
        >
          <Skeleton variant="avatar" width={38} height={38} />
          <div className="group-invitations-search-details">
            <Skeleton variant="text" width="8rem" height={14} />
            <Skeleton variant="text" width="5rem" height={11} />
          </div>
          <Skeleton variant="rectangular" width={54} height={22} radius={999} />
        </div>
      ))}
    </div>
  );
}

export function UserGroupInvitationsSkeleton({ count = 2, pagination = false }) {
  return (
    <section className="user-group-invitations group-section-skeleton">
      {!pagination && <SectionHeaderSkeleton />}
      <div className="user-group-invitations-list">
        <InvitationRowsSkeleton count={count} recipientView />
      </div>
    </section>
  );
}

export function GroupJoinRequestsSkeleton({ count = 3, pagination = false }) {
  return (
    <section className="group-join-requests group-section-skeleton">
      {!pagination && <SectionHeaderSkeleton />}
      <div className="group-join-requests-list">
        <JoinRequestRowsSkeleton count={count} />
      </div>
    </section>
  );
}

export function GroupPageSkeleton() {
  return (
    <main className="group-page">
      <div className="group-page-shell group-section-skeleton group-page-skeleton">
        <div className="group-page-header">
          <Skeleton variant="circular" width={32} height={32} />
        </div>
        <div className="group-page-layout">
          <section className="group-page-main">
            <div className="group-content">
              <div className="group-page-skeleton__tabs">
                <Skeleton variant="button" width={72} height={42} />
                <Skeleton variant="button" width={66} height={42} />
                <Skeleton variant="button" width={72} height={42} />
              </div>
              <div className="group-content-card">
                <GroupPostsSkeleton />
              </div>
            </div>
          </section>
          <aside className="group-page-side">
            <div className="details-card group-page-skeleton__details">
              <Skeleton variant="text" width="64%" height={22} />
              <Skeleton variant="text" width="100%" height={12} />
              <Skeleton variant="text" width="82%" height={12} />
              <Skeleton variant="text" width="52%" height={12} />
              <Skeleton variant="button" width="100%" height={42} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
