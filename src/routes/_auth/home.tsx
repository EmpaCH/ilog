import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/home')({
  component: () => <>
    <h2>Welcome, {localStorage.getItem('user')} &#128075;</h2>
  </>,
})
