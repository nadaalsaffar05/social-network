import React from 'react'
import Skeleton from './Skeleton'
import GradientWaves from '../../../features/feed/components/GradientWaves'
import { GRADIENT_WAVE_PROPS } from '../../../features/feed/constants'

/**
 * Skeleton component for individual user item in followers/following list
 */
export function UserItemSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="profile-user-item" style={{ opacity: 0.85 }}>
          <div className="user-item-left">
            <Skeleton variant="avatar" width={44} height={44} />
            <div className="user-item-info" style={{ gap: '6px', width: '140px' }}>
              <div className="user-item-name-row" style={{ gap: '8px' }}>
                <Skeleton variant="text" width={110} height={16} />
                <Skeleton variant="rectangular" width={45} height={18} radius={12} />
              </div>
              <Skeleton variant="text" width={80} height={12} />
            </div>
          </div>
          <div className="user-item-actions" style={{ gap: '8px' }}>
            <Skeleton variant="button" width={90} height={34} radius={8} />
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * Skeleton loader for Post Card inside profile feed
 */
export function PostCardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'rgb(255 255 255 / 4%)',
            border: '1px solid rgb(255 255 255 / 12%)',
            borderRadius: 'var(--radius-md, 16px)',
            padding: '20px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Skeleton variant="avatar" width={44} height={44} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="text" width="25%" height={12} />
            </div>
          </div>
          {/* Body content lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <Skeleton variant="text" width="90%" height={14} />
            <Skeleton variant="text" width="75%" height={14} />
            <Skeleton variant="text" width="40%" height={14} />
          </div>
          {/* Footer action bar */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgb(255 255 255 / 8%)' }}>
            <Skeleton variant="button" width={70} height={28} radius={8} />
            <Skeleton variant="button" width={80} height={28} radius={8} />
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * Full page Skeleton for ProfilePage (`/profile`)
 */
export function ProfileSkeleton() {
  return (
    <main className="profile-layout-container">
      <div className="profile-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>
      <div className="profile-page-content">
        {/* Topbar */}
        <header className="profile-page-topbar">
          <Skeleton variant="circular" width={38} height={38} />
          <Skeleton variant="text" width={100} height={24} style={{ margin: 0 }} />
        </header>

        <div className="profile-layout-grid">
          {/* LEFT SIDEBAR SKELETON */}
          <aside className="profile-sidebar" style={{ pointerEvents: 'none' }}>
            <div className="profile-avatar-wrapper" style={{ border: 'none', background: 'transparent' }}>
              <Skeleton variant="circular" width={130} height={130} />
            </div>

            <div className="profile-names-section" style={{ alignItems: 'center', width: '100%', gap: '8px' }}>
              <Skeleton variant="text" width="70%" height={22} />
              <Skeleton variant="text" width="45%" height={14} />
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', margin: '8px 0' }}>
              <Skeleton variant="text" width="85%" height={12} />
              <Skeleton variant="text" width="60%" height={12} />
            </div>

            <div className="profile-details-list" style={{ width: '100%', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Skeleton variant="circular" width={16} height={16} />
                <Skeleton variant="text" width="80%" height={14} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Skeleton variant="circular" width={16} height={16} />
                <Skeleton variant="text" width="60%" height={14} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Skeleton variant="circular" width={16} height={16} />
                <Skeleton variant="text" width="70%" height={14} />
              </div>
            </div>

            <div className="profile-sidebar-actions" style={{ width: '100%', gap: '10px', marginTop: '12px' }}>
              <Skeleton variant="button" width="100%" height={40} radius={12} />
              <Skeleton variant="button" width="100%" height={40} radius={12} />
            </div>
          </aside>

          {/* MAIN BODY SKELETON */}
          <section className="profile-main-body">
            {/* Stats Card Skeleton */}
            <div className="profile-stats-card">
              <div className="profile-stat-box" style={{ gap: '6px' }}>
                <Skeleton variant="text" width={32} height={22} />
                <Skeleton variant="text" width={55} height={12} />
              </div>
              <div className="profile-stat-divider" />
              <div className="profile-stat-box" style={{ gap: '6px' }}>
                <Skeleton variant="text" width={32} height={22} />
                <Skeleton variant="text" width={55} height={12} />
              </div>
              <div className="profile-stat-divider" />
              <div className="profile-stat-box" style={{ gap: '6px' }}>
                <Skeleton variant="text" width={32} height={22} />
                <Skeleton variant="text" width={40} height={12} />
              </div>
            </div>

            {/* Feed Cards Skeleton */}
            <div className="profile-feed-container">
              <PostCardSkeleton count={2} />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

/**
 * Skeleton loader for Follow Requests Page (`/follow-requests`)
 */
export function FollowRequestsSkeleton() {
  return (
    <div className="follow-requests-layout">
      <div className="follow-requests-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>
      <div className="follow-requests-container">
        {/* Header Card Skeleton */}
        <div className="follow-requests-header-card">
          <div className="follow-requests-header-left">
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width={160} height={24} style={{ margin: 0 }} />
          </div>
          <Skeleton variant="rectangular" width={32} height={24} radius={999} />
        </div>

        {/* Content list skeleton */}
        <div className="follow-requests-content">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="follow-request-card" style={{ opacity: 0.9 }}>
              <div className="follow-request-user">
                <Skeleton variant="avatar" width={52} height={52} />
                <div className="follow-request-info" style={{ gap: '6px', flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={16} />
                  <Skeleton variant="text" width="35%" height={12} />
                </div>
              </div>
              <div className="follow-request-actions" style={{ gap: '10px' }}>
                <Skeleton variant="button" width={85} height={36} radius={10} />
                <Skeleton variant="button" width={85} height={36} radius={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
