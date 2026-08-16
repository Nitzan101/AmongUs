/** The avatar characters players can pick. */
export const CHARACTERS = [
  // Animals first — the ones people reach for.
  '🦊', '🐼', '🐸', '🦄', '🐙', '🐧', '🦁', '🐨',
  '🐵', '🦉', '🐷', '🐔', '🦖', '🐢', '🦋', '🐝',
  '🐳', '🦈', '🐬', '🦩', '🦔', '🐿️', '🦝', '🐺',
  '🐴', '🦒', '🐘', '🦥', '🐤', '🦜', '🐞', '🦕',
  // Faces and characters.
  '👻', '👽', '🤖', '🎃', '🤡', '🦸', '🥷', '🧙',
  '🧛', '🧜', '🧚', '🦹', '🤠', '👾', '💀', '🐲',
  // Things, for anyone who would rather not be an animal.
  '🍕', '🍩', '🌮', '🍉', '🥑', '🍄', '⚽', '🎸',
  '🚀', '⭐', '🌈', '🔥', '🌵', '🎩', '💎', '🎲',
] as const

export function randomCharacter(): string {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
}
