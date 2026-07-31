import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CreateGamePage } from './pages/CreateGamePage'
import { JoinPinPage } from './pages/JoinPinPage'
import { JoinIdentityPage } from './pages/JoinIdentityPage'
import { LobbyPage } from './pages/LobbyPage'
import { GamePage } from './pages/GamePage'
import { ProfilePage } from './pages/ProfilePage'
import { RulesPage } from './pages/RulesPage'
import { SignInPage } from './pages/SignInPage'
import { WordsPage } from './pages/WordsPage'
import { WordSetsPage } from './pages/WordSetsPage'
import { WordSetEditPage } from './pages/WordSetEditPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/create', element: <CreateGamePage /> },
      { path: '/join', element: <JoinPinPage /> },
      { path: '/join/:pin', element: <JoinIdentityPage /> },
      { path: '/lobby/:pin', element: <LobbyPage /> },
      { path: '/game/:pin', element: <GamePage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/rules', element: <RulesPage /> },
      { path: '/words', element: <WordsPage /> },
      { path: '/sets', element: <WordSetsPage /> },
      { path: '/sets/:id', element: <WordSetEditPage /> },
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
