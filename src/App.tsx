import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CreateGamePage } from './pages/CreateGamePage'
import { JoinGamePage } from './pages/JoinGamePage'
import { LobbyPage } from './pages/LobbyPage'
import { RulesPage } from './pages/RulesPage'
import { SignInPage } from './pages/SignInPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/create', element: <CreateGamePage /> },
      { path: '/join', element: <JoinGamePage /> },
      { path: '/lobby', element: <LobbyPage /> },
      { path: '/rules', element: <RulesPage /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
