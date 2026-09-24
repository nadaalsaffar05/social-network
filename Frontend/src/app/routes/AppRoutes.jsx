import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

const LoginPage = lazy(() => import("../../features/auth/LoginPage"));
const RegisterPage = lazy(() => import("../../features/auth/RegisterPage"));
const FeedPage = lazy(() => import("../../features/feed/FeedPage"));
const PostPage = lazy(() => import("../../features/feed/PostPage"));
const ProfilePage = lazy(() => import("../../features/profile/ProfilePage"));
const ChatPage = lazy(() => import("../../features/chat/ChatPage"));
const MessageRequestsPage = lazy(
  () => import("../../features/chat/MessageRequestsPage"),
);
const FollowRequestsPage = lazy(
  () => import("../../features/profile/FollowRequestsPage"),
);
const NotificationsPage = lazy(
  () => import("../../features/notifications/NotificationsPage"),
);
const GroupsPage = lazy(() => import("../../features/groups/GroupsPage"));
const GroupPage = lazy(() => import("../../features/groups/GroupPage"));

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<FeedPage />} />
          <Route path="/posts/:postId" element={<PostPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/follow-requests" element={<FollowRequestsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/messages" element={<ChatPage />} />
          <Route path="/messages/:userId" element={<ChatPage />} />
          <Route path="/message-requests" element={<MessageRequestsPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
