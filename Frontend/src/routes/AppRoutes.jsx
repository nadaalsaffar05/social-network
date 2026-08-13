import { Navigate, Route, Routes } from 'react-router'

import LoginPage from '../pages/Login/LoginPage'
import RegisterPage from '../pages/Register/RegisterPage'
import HomePage from '../pages/Home/HomePage'
import ProfilePage from '../pages/Profile/ProfilePage'
import GroupsPage from '../pages/Groups/GroupsPage'
import GroupPage from '../pages/Group/GroupPage'
import NotificationsPage from '../pages/Notifications/NotificationsPage'
import ChatPage from '../pages/Chat/ChatPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/profile/:id" element={<ProfilePage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/groups/:id" element={<GroupPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/chat" element={<ChatPage />} />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}