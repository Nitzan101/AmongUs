import type { WordPair } from './types'

/**
 * English word bank. Each pair is "close but not the same": the confusing word
 * is related enough that the imposter can bluff a clue, but different enough
 * that a careful crew clue can expose the mismatch. Grouped by theme for review.
 */
export const EN_PAIRS: WordPair[] = [
  // Food & drink
  { main: 'Pizza', confusing: 'Hamburger' },
  { main: 'Coffee', confusing: 'Tea' },
  { main: 'Sushi', confusing: 'Salad' },
  { main: 'Cake', confusing: 'Cookie' },
  { main: 'Ice cream', confusing: 'Milkshake' },
  { main: 'Bread', confusing: 'Rice' },
  { main: 'Apple', confusing: 'Orange' },
  { main: 'Chocolate', confusing: 'Candy' },
  { main: 'Soup', confusing: 'Stew' },
  { main: 'Wine', confusing: 'Beer' },
  { main: 'Pancake', confusing: 'Waffle' },
  { main: 'Cheese', confusing: 'Butter' },

  // Animals
  { main: 'Lion', confusing: 'Tiger' },
  { main: 'Dog', confusing: 'Cat' },
  { main: 'Shark', confusing: 'Whale' },
  { main: 'Eagle', confusing: 'Owl' },
  { main: 'Rabbit', confusing: 'Squirrel' },
  { main: 'Bee', confusing: 'Butterfly' },
  { main: 'Horse', confusing: 'Donkey' },
  { main: 'Frog', confusing: 'Lizard' },
  { main: 'Dolphin', confusing: 'Seal' },
  { main: 'Snake', confusing: 'Worm' },
  { main: 'Bear', confusing: 'Wolf' },
  { main: 'Elephant', confusing: 'Rhino' },

  // Places
  { main: 'Beach', confusing: 'Swimming pool' },
  { main: 'Mountain', confusing: 'Hill' },
  { main: 'Forest', confusing: 'Jungle' },
  { main: 'City', confusing: 'Village' },
  { main: 'Hospital', confusing: 'Clinic' },
  { main: 'School', confusing: 'University' },
  { main: 'Library', confusing: 'Bookstore' },
  { main: 'Airport', confusing: 'Train station' },
  { main: 'Restaurant', confusing: 'Cafe' },
  { main: 'Desert', confusing: 'Savanna' },

  // Sports & activities
  { main: 'Soccer', confusing: 'Basketball' },
  { main: 'Tennis', confusing: 'Ping pong' },
  { main: 'Swimming', confusing: 'Diving' },
  { main: 'Running', confusing: 'Cycling' },
  { main: 'Boxing', confusing: 'Wrestling' },
  { main: 'Skiing', confusing: 'Ice skating' },
  { main: 'Chess', confusing: 'Checkers' },
  { main: 'Yoga', confusing: 'Pilates' },
  { main: 'Golf', confusing: 'Bowling' },

  // Objects
  { main: 'Guitar', confusing: 'Violin' },
  { main: 'Piano', confusing: 'Drums' },
  { main: 'Phone', confusing: 'Tablet' },
  { main: 'Clock', confusing: 'Watch' },
  { main: 'Umbrella', confusing: 'Raincoat' },
  { main: 'Pencil', confusing: 'Pen' },
  { main: 'Chair', confusing: 'Sofa' },
  { main: 'Knife', confusing: 'Fork' },
  { main: 'Camera', confusing: 'Binoculars' },
  { main: 'Candle', confusing: 'Lamp' },

  // Nature & weather
  { main: 'Rain', confusing: 'Snow' },
  { main: 'Sun', confusing: 'Moon' },
  { main: 'River', confusing: 'Lake' },
  { main: 'Star', confusing: 'Planet' },
  { main: 'Wind', confusing: 'Storm' },
  { main: 'Rose', confusing: 'Tulip' },
  { main: 'Oak', confusing: 'Pine' },
  { main: 'Fire', confusing: 'Smoke' },
  { main: 'Cloud', confusing: 'Fog' },
  { main: 'Volcano', confusing: 'Earthquake' },

  // Transport
  { main: 'Airplane', confusing: 'Train' },
  { main: 'Car', confusing: 'Bus' },
  { main: 'Bicycle', confusing: 'Motorcycle' },
  { main: 'Ship', confusing: 'Boat' },
  { main: 'Helicopter', confusing: 'Rocket' },
  { main: 'Truck', confusing: 'Van' },

  // People & jobs
  { main: 'Doctor', confusing: 'Nurse' },
  { main: 'Teacher', confusing: 'Professor' },
  { main: 'Police officer', confusing: 'Firefighter' },
  { main: 'Chef', confusing: 'Waiter' },
  { main: 'Pilot', confusing: 'Sailor' },
  { main: 'Painter', confusing: 'Musician' },
  { main: 'King', confusing: 'Prince' },

  // Times & events
  { main: 'Winter', confusing: 'Autumn' },
  { main: 'Summer', confusing: 'Spring' },
  { main: 'Birthday', confusing: 'Wedding' },
  { main: 'Movie', confusing: 'Play' },
  { main: 'Book', confusing: 'Magazine' },
]
