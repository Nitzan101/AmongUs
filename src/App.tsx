import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CreateGamePage } from './pages/CreateGamePage'
import { JoinGamePage } from './pages/JoinGamePage'
import { LobbyPage } from './pages/LobbyPage'
import { RulesPage } from './pages/RulesPage'
import { SignInPage } from './pages/SignInPage'
import { WordsPage } from './pages/WordsPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/create', element: <CreateGamePage /> },
      { path: '/join', element: <JoinGamePage /> },
      { path: '/join/:pin', element: <JoinGamePage /> },
      { path: '/lobby/:pin', element: <LobbyPage /> },
      { path: '/rules', element: <RulesPage /> },
      { path: '/words', element: <WordsPage /> },
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
