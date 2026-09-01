import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "../pages/Auth/LoginPage";
import RegisterPage from "../pages/Auth/RegisterPage";
import FeedPage from "../pages/feed/FeedPage";
import PostPage from "../pages/feed/PostPage";
import ProfilePage from "../pages/Profile/ProfilePage";
import FollowRequestsPage from "../pages/Profile/FollowRequestsPage";
import LoginPage from "../../features/auth/LoginPage";
import RegisterPage from "../../features/auth/RegisterPage";
import FeedPage from "../../features/feed/FeedPage";
import PostPage from "../../features/feed/PostPage";
import ProfilePage from "../../features/profile/ProfilePage";
import ChatPage from "../../features/chat/ChatPage";
import MessageRequestsPage from "../../features/chat/MessageRequestsPage";
import FollowRequestsPage from "../../features/profile/FollowRequestsPage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<FeedPage />} />
        <Route path="/posts/:postId" element={<PostPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/follow-requests" element={<FollowRequestsPage />} />
        <Route path="/messages" element={<ChatPage />} />
        <Route path="/messages/:userId" element={<ChatPage />} />
        <Route path="/message-requests" element={<MessageRequestsPage />} />
        <Route path="/follow-requests" element={<FollowRequestsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
