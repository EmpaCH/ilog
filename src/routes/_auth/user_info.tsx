import { createFileRoute } from '@tanstack/react-router'
import UserInfo from '../../components/auth/UserInfo'

export const Route = createFileRoute('/_auth/user_info')({
  component: () => UserInfo(),
})
