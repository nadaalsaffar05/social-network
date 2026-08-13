import { useParams } from 'react-router'

export default function GroupPage() {
  const { id } = useParams()

  return (
    <main>
      <h1>Group</h1>
      <p>Group ID: {id}</p>
    </main>
  )
}