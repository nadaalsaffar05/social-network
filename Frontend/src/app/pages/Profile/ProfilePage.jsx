import { useParams } from 'react-router-dom'

export default function ProfilePage() {
  const { id } = useParams()

  return (
    <main>
      <h1>Profile</h1>
      <p>User ID: {id}</p>
    </main>
  )
}