const ADJECTIVES = [
  'Thirsty',
  'Wobbly',
  'Jolly',
  'Sneaky',
  'Bouncy',
  'Toasty',
  'Sleepy',
  'Zesty',
  'Chilly',
  'Loopy',
  'Peachy',
  'Merry',
  'Witty',
  'Goofy',
  'Snuggly',
];

const NOUNS = [
  'Barrels',
  'Trucks',
  'Geese',
  'Pickles',
  'Penguins',
  'Walruses',
  'Tugboats',
  'Muffins',
  'Badgers',
  'Otters',
  'Narwhals',
  'Donkeys',
  'Moose',
  'Yaks',
  'Croutons',
];

const SUFFIXES = [
  'Supply Squad',
  'Dream Team',
  'Express',
  'Syndicate',
  'Collective',
  'Express Line',
  'Brigade',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Short, family-friendly random label for all-AI tournament teams */
export function randomSillyTeamName() {
  const roll = Math.random();
  if (roll < 0.45) return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
  if (roll < 0.78) return `The ${pick(ADJECTIVES)} ${pick(NOUNS)}`;
  return `${pick(ADJECTIVES)} ${pick(NOUNS)} ${pick(SUFFIXES)}`;
}
