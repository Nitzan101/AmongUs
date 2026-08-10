import type { Category } from './types'

/**
 * English word bank. Categories → clusters → words. Words inside one cluster are
 * near-twins of each other; different clusters in a category are same-theme but
 * distinct; different categories are unrelated. See types.ts for how they're used.
 *
 * Growth matters in all three dimensions, because each feeds a difficulty:
 * bigger clusters give easy more to draw on, more clusters per category feed
 * medium, and more categories feed hard.
 */
export const EN_CATEGORIES: Category[] = [
  {
    id: 'food',
    emoji: '🍔',
    clusters: [
      ['Pizza', 'Hamburger', 'Hot dog', 'Fries', 'Taco', 'Falafel'],
      ['Coffee', 'Tea', 'Hot chocolate', 'Cappuccino'],
      ['Apple', 'Orange', 'Banana', 'Watermelon', 'Grapes', 'Strawberry'],
      ['Cake', 'Cookie', 'Ice cream', 'Donut', 'Chocolate', 'Candy'],
      ['Egg', 'Bread', 'Cheese', 'Yogurt', 'Honey'],
    ],
  },
  {
    id: 'animals',
    emoji: '🦁',
    clusters: [
      ['Lion', 'Tiger', 'Leopard', 'Cheetah'],
      ['Cow', 'Horse', 'Sheep', 'Chicken', 'Goat', 'Donkey'],
      ['Shark', 'Whale', 'Dolphin', 'Octopus', 'Crab'],
      ['Eagle', 'Owl', 'Parrot', 'Penguin', 'Pigeon'],
      ['Bee', 'Butterfly', 'Ant', 'Spider', 'Mosquito'],
      ['Dog', 'Cat', 'Rabbit', 'Hamster'],
    ],
  },
  {
    id: 'sports',
    emoji: '⚽',
    clusters: [
      ['Soccer', 'Basketball', 'Tennis', 'Volleyball', 'Handball'],
      ['Swimming', 'Surfing', 'Diving', 'Rowing'],
      ['Skiing', 'Snowboarding', 'Ice skating', 'Sledding'],
      ['Boxing', 'Karate', 'Wrestling', 'Fencing', 'Judo'],
      ['Running', 'Marathon', 'Long jump', 'Gymnastics'],
      ['Cycling', 'Climbing', 'Yoga', 'Golf'],
    ],
  },
  {
    id: 'objects',
    emoji: '🎸',
    clusters: [
      ['Guitar', 'Piano', 'Drums', 'Violin', 'Flute'],
      ['Phone', 'Tablet', 'Laptop', 'Camera', 'Headphones'],
      ['Knife', 'Fork', 'Spoon', 'Plate', 'Pot'],
      ['Chair', 'Sofa', 'Bed', 'Table', 'Closet'],
      ['Hammer', 'Screwdriver', 'Saw', 'Drill', 'Ladder'],
      ['Pencil', 'Eraser', 'Scissors', 'Notebook', 'Glue'],
    ],
  },
  {
    id: 'transport',
    emoji: '🚗',
    clusters: [
      ['Car', 'Bus', 'Truck', 'Motorcycle', 'Taxi'],
      ['Airplane', 'Helicopter', 'Rocket', 'Hot air balloon'],
      ['Ship', 'Boat', 'Submarine', 'Canoe'],
      ['Train', 'Subway', 'Tram', 'Cable car'],
      ['Bicycle', 'Scooter', 'Skateboard', 'Roller skates'],
    ],
  },
  {
    id: 'nature',
    emoji: '🌿',
    clusters: [
      ['Rain', 'Snow', 'Wind', 'Storm', 'Fog'],
      ['River', 'Lake', 'Ocean', 'Waterfall'],
      ['Star', 'Planet', 'Comet', 'Moon', 'Sun'],
      ['Rose', 'Cactus', 'Oak', 'Bamboo', 'Sunflower'],
      ['Mountain', 'Desert', 'Forest', 'Cave', 'Island'],
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
      ['Supermarket', 'Bakery', 'Bank', 'Post office'],
      ['Restaurant', 'Cafe', 'Bar', 'Hotel'],
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
      ['Electrician', 'Plumber', 'Carpenter', 'Mechanic'],
      ['Teacher', 'Lawyer', 'Accountant', 'Engineer'],
    ],
  },
  {
    id: 'clothing',
    emoji: '👕',
    clusters: [
      ['Shirt', 'Pants', 'Dress', 'Skirt', 'Jacket', 'Sweater'],
      ['Shoes', 'Boots', 'Sandals', 'Socks'],
      ['Hat', 'Scarf', 'Gloves', 'Belt', 'Glasses', 'Umbrella'],
      ['Ring', 'Necklace', 'Watch', 'Earrings'],
    ],
  },
  {
    id: 'entertainment',
    emoji: '🎬',
    clusters: [
      ['Movie', 'TV series', 'Cartoon', 'Documentary'],
      ['Book', 'Comic', 'Newspaper', 'Magazine'],
      ['Chess', 'Cards', 'Puzzle', 'Board game'],
      ['Concert', 'Theater', 'Circus', 'Magic show'],
      ['Birthday', 'Wedding', 'Festival', 'Fireworks'],
    ],
  },
  {
    id: 'household',
    emoji: '🏠',
    clusters: [
      ['Fridge', 'Oven', 'Microwave', 'Washing machine'],
      ['Broom', 'Vacuum cleaner', 'Mop', 'Bucket'],
      ['Towel', 'Soap', 'Toothbrush', 'Shampoo'],
      ['Lamp', 'Mirror', 'Wall clock', 'Curtain'],
      ['Pillow', 'Blanket', 'Mattress', 'Rug'],
    ],
  },
]
