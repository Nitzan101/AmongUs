import { useEffect, useState } from 'react'
import {
  subscribeClues,
  subscribeGame,
  subscribePlayers,
  subscribeSecret,
  subscribeVotes,
} from './gameService'
import type { Clue, Game, Player, Secret, Vote } from './types'

/** Subscribe to a game document and its players in real time. */
export function useGame(pin: string | undefined) {
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!pin) return
    setLoading(true)
    const unsubGame = subscribeGame(
      pin,
      (g) => {
        setGame(g)
        setLoading(false)
      },
      (e) => {
        setError(e)
        setLoading(false)
      },
    )
    const unsubPlayers = subscribePlayers(pin, setPlayers, setError)
    return () => {
      unsubGame()
      unsubPlayers()
    }
  }, [pin])

  return { game, players, loading, error }
}

/** Subscribe to the caller's own secret assignment for a game. */
export function useSecret(pin: string | undefined, uid: string | undefined) {
  const [secret, setSecret] = useState<Secret | null>(null)

  useEffect(() => {
    setSecret(null)
    if (!pin || !uid) return
    return subscribeSecret(pin, uid, setSecret)
  }, [pin, uid])

  return secret
}

/** Subscribe to the current votes for a game. */
export function useVotes(pin: string | undefined) {
  const [votes, setVotes] = useState<Vote[]>([])

  useEffect(() => {
    setVotes([])
    if (!pin) return
    return subscribeVotes(pin, setVotes)
  }, [pin])

  return votes
}

/** Subscribe to the typed clues for a game (full-virtual mode). */
export function useClues(pin: string | undefined, enabled: boolean) {
  const [clues, setClues] = useState<Clue[]>([])

  useEffect(() => {
    setClues([])
    if (!pin || !enabled) return
    return subscribeClues(pin, setClues)
  }, [pin, enabled])

  return clues
}
