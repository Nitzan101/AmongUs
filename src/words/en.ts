import type { WordEntry } from './types'

/**
 * English word bank. Each entry: the real word, a near-twin (easy), a
 * same-category-but-distinct word (medium), and a category for hard mode.
 */
export const EN_WORDS: WordEntry[] = [
  // Food & drink
  { main: 'Pizza', easy: 'Hamburger', medium: 'Sushi', category: 'food' },
  { main: 'Coffee', easy: 'Tea', medium: 'Beer', category: 'food' },
  { main: 'Cake', easy: 'Cookie', medium: 'Bread', category: 'food' },
  { main: 'Apple', easy: 'Orange', medium: 'Watermelon', category: 'food' },
  { main: 'Soup', easy: 'Stew', medium: 'Salad', category: 'food' },
  { main: 'Ice cream', easy: 'Milkshake', medium: 'French fries', category: 'food' },

  // Animals
  { main: 'Lion', easy: 'Tiger', medium: 'Elephant', category: 'animal' },
  { main: 'Dog', easy: 'Cat', medium: 'Fish', category: 'animal' },
  { main: 'Shark', easy: 'Whale', medium: 'Crab', category: 'animal' },
  { main: 'Eagle', easy: 'Owl', medium: 'Penguin', category: 'animal' },
  { main: 'Horse', easy: 'Donkey', medium: 'Cow', category: 'animal' },
  { main: 'Snake', easy: 'Worm', medium: 'Frog', category: 'animal' },

  // Places
  { main: 'Beach', easy: 'Swimming pool', medium: 'Mountain', category: 'place' },
  { main: 'Forest', easy: 'Jungle', medium: 'Desert', category: 'place' },
  { main: 'Hospital', easy: 'Clinic', medium: 'School', category: 'place' },
  { main: 'Restaurant', easy: 'Cafe', medium: 'Library', category: 'place' },
  { main: 'Castle', easy: 'Palace', medium: 'Cave', category: 'place' },
  { main: 'Museum', easy: 'Gallery', medium: 'Stadium', category: 'place' },

  // Sports & games
  { main: 'Soccer', easy: 'Basketball', medium: 'Swimming', category: 'sport' },
  { main: 'Tennis', easy: 'Ping pong', medium: 'Boxing', category: 'sport' },
  { main: 'Skiing', easy: 'Ice skating', medium: 'Surfing', category: 'sport' },
  { main: 'Running', easy: 'Cycling', medium: 'Weightlifting', category: 'sport' },
  { main: 'Golf', easy: 'Bowling', medium: 'Archery', category: 'sport' },
  { main: 'Baseball', easy: 'Cricket', medium: 'Volleyball', category: 'sport' },

  // Objects
  { main: 'Guitar', easy: 'Violin', medium: 'Drums', category: 'object' },
  { main: 'Phone', easy: 'Tablet', medium: 'Camera', category: 'object' },
  { main: 'Clock', easy: 'Watch', medium: 'Calendar', category: 'object' },
  { main: 'Umbrella', easy: 'Raincoat', medium: 'Sunglasses', category: 'object' },
  { main: 'Chair', easy: 'Sofa', medium: 'Bed', category: 'object' },
  { main: 'Knife', easy: 'Fork', medium: 'Scissors', category: 'object' },

  // Nature & weather
  { main: 'Rain', easy: 'Snow', medium: 'Wind', category: 'nature' },
  { main: 'Sun', easy: 'Moon', medium: 'Cloud', category: 'nature' },
  { main: 'River', easy: 'Lake', medium: 'Ocean', category: 'nature' },
  { main: 'Rose', easy: 'Tulip', medium: 'Cactus', category: 'nature' },
  { main: 'Fire', easy: 'Smoke', medium: 'Ice', category: 'nature' },
  { main: 'Star', easy: 'Planet', medium: 'Comet', category: 'nature' },

  // Transport
  { main: 'Car', easy: 'Bus', medium: 'Airplane', category: 'transport' },
  { main: 'Bicycle', easy: 'Motorcycle', medium: 'Skateboard', category: 'transport' },
  { main: 'Ship', easy: 'Boat', medium: 'Submarine', category: 'transport' },
  { main: 'Train', easy: 'Subway', medium: 'Helicopter', category: 'transport' },
  { main: 'Truck', easy: 'Van', medium: 'Tractor', category: 'transport' },
  { main: 'Rocket', easy: 'Spaceship', medium: 'Hot air balloon', category: 'transport' },

  // People & jobs
  { main: 'Doctor', easy: 'Nurse', medium: 'Chef', category: 'job' },
  { main: 'Teacher', easy: 'Professor', medium: 'Police officer', category: 'job' },
  { main: 'Farmer', easy: 'Gardener', medium: 'Fisherman', category: 'job' },
  { main: 'King', easy: 'Prince', medium: 'Wizard', category: 'job' },
  { main: 'Waiter', easy: 'Bartender', medium: 'Barber', category: 'job' },
  { main: 'Painter', easy: 'Sculptor', medium: 'Musician', category: 'job' },
]
