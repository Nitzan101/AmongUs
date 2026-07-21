import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CreateGamePage } from './pages/CreateGamePage'
import { JoinGamePage } from './pages/JoinGamePage'
import { LobbyPage } from './pages/LobbyPage'
import { RulesPage } from './pages/RulesPage'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/create', element: <CreateGamePage /> },
      { path: '/join', element: <JoinGamePage /> },
      { path: '/lobby', element: <LobbyPage /> },
      { path: '/rules', element: <RulesPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
