/** The avatar characters players can pick. */
export const CHARACTERS = [
  '🦊',
  '🐼',
  '🐸',
  '🦄',
  '🐙',
  '🐧',
  '🦁',
  '🐨',
  '🐵',
  '🦉',
  '🐷',
  '🐔',
  '🦖',
  '🐢',
  '🦋',
] as const

export function randomCharacter(): string {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
}
