import type { Category } from './types'

/**
 * English word bank. Categories → clusters → words. Words inside one cluster are
 * near-twins of each other; different clusters in a category are same-theme but
 * distinct; different categories are unrelated. See types.ts for how they're used.
 */
export const EN_CATEGORIES: Category[] = [
  {
    id: 'food',
    emoji: '🍔',
    clusters: [
      ['Pizza', 'Hamburger', 'Hot dog', 'Fries', 'Taco'],
      ['Coffee', 'Tea', 'Hot chocolate', 'Cappuccino'],
      ['Apple', 'Orange', 'Banana', 'Watermelon', 'Grapes'],
      ['Cake', 'Cookie', 'Ice cream', 'Donut', 'Chocolate'],
    ],
  },
  {
    id: 'animals',
    emoji: '🦁',
    clusters: [
      ['Lion', 'Tiger', 'Leopard', 'Cheetah'],
      ['Cow', 'Horse', 'Sheep', 'Chicken', 'Goat'],
      ['Shark', 'Whale', 'Dolphin', 'Octopus', 'Crab'],
      ['Eagle', 'Owl', 'Parrot', 'Penguin', 'Pigeon'],
    ],
  },
  {
    id: 'sports',
    emoji: '⚽',
    clusters: [
      ['Soccer', 'Basketball', 'Tennis', 'Volleyball'],
      ['Swimming', 'Surfing', 'Diving', 'Rowing'],
      ['Skiing', 'Snowboarding', 'Ice skating'],
      ['Boxing', 'Karate', 'Wrestling', 'Fencing'],
    ],
  },
  {
    id: 'objects',
    emoji: '🎸',
    clusters: [
      ['Guitar', 'Piano', 'Drums', 'Violin', 'Flute'],
      ['Phone', 'Tablet', 'Laptop', 'Camera'],
      ['Knife', 'Fork', 'Spoon', 'Plate', 'Pot'],
      ['Chair', 'Sofa', 'Bed', 'Table'],
    ],
  },
  {
    id: 'transport',
    emoji: '🚗',
    clusters: [
      ['Car', 'Bus', 'Truck', 'Motorcycle'],
      ['Airplane', 'Helicopter', 'Rocket', 'Hot air balloon'],
      ['Ship', 'Boat', 'Submarine', 'Canoe'],
    ],
  },
  {
    id: 'nature',
    emoji: '🌿',
    clusters: [
      ['Rain', 'Snow', 'Wind', 'Storm'],
      ['River', 'Lake', 'Ocean', 'Waterfall'],
      ['Star', 'Planet', 'Comet', 'Moon'],
      ['Rose', 'Cactus', 'Oak', 'Bamboo'],
    ],
  },
  {
    id: 'places',
    emoji: '🏫',
    clusters: [
      ['School', 'University', 'Library', 'Museum'],
      ['Hospital', 'Clinic', 'Pharmacy', 'Nursing home'],
      ['Beach', 'Park', 'Zoo', 'Cinema'],
      ['Castle', 'Tower', 'Bridge', 'Lighthouse'],
    ],
  },
  {
    id: 'jobs',
    emoji: '👷',
    clusters: [
      ['Doctor', 'Nurse', 'Dentist', 'Surgeon'],
      ['Police officer', 'Firefighter', 'Soldier', 'Pilot'],
      ['Chef', 'Waiter', 'Baker', 'Bartender'],
      ['Painter', 'Musician', 'Actor', 'Writer'],
    ],
  },
]
