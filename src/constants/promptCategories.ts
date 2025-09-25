// Predefined prompt categories
export interface PromptCategory {
  id: string;
  name: string;
  description: string;
  questions: { id: string; question: string }[];
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'icebreakers',
    name: 'Icebreakers & Fun',
    description: 'Fun conversation starters to break the ice',
    questions: [
      { id: 'two-truths-lie', question: 'Two truths and a lie…' },
      { id: 'random-fact', question: 'The most random fact I know is…' },
      { id: 'cocktail-personality', question: "If I were a cocktail, I'd be…" },
      {
        id: 'karaoke-song',
        question: "A karaoke song I'd never say no to is…",
      },
    ],
  },
  {
    id: 'bar-nightlife',
    name: 'Bar & Nightlife Vibes',
    description: 'Share your bar and nightlife preferences',
    questions: [
      { id: 'drink-order', question: 'My go-to drink order is…' },
      { id: 'bar-snack', question: 'The best bar snack is…' },
      { id: 'bar-type', question: 'The type of bar I feel at home in…' },
      {
        id: 'memorable-night',
        question: "The most memorable night out I've had was…",
      },
    ],
  },
  {
    id: 'personality-lifestyle',
    name: 'Personality & Lifestyle',
    description: 'Show your personality and how you spend your time',
    questions: [
      {
        id: 'cant-stop-talking',
        question: "One thing I can't stop talking about is…",
      },
      {
        id: 'weekend-activity',
        question: "On weekends you'll usually find me…",
      },
      { id: 'friends-describe', question: 'My friends describe me as…' },
      {
        id: 'travel-essential',
        question: 'The one thing I never travel without is…',
      },
    ],
  },
  {
    id: 'values-preferences',
    name: 'Values & Preferences',
    description: 'Share what matters most to you',
    questions: [
      { id: 'care-about-cause', question: 'A cause I really care about is…' },
      { id: 'sunday-activity', question: 'The best way to spend a Sunday is…' },
      {
        id: 'makes-me-smile',
        question: 'Something that always makes me smile is…',
      },
      { id: 'value-people', question: 'I value people who…' },
    ],
  },
  {
    id: 'humor-playful',
    name: 'Humor & Playful',
    description: 'Show your fun and humorous side',
    questions: [
      {
        id: 'controversial-opinion',
        question: 'My most controversial opinion is…',
      },
      { id: 'pineapple-pizza', question: 'Pineapple on pizza: yes or no?' },
      {
        id: 'cheesy-pickup-line',
        question: 'The cheesiest pickup line I secretly love is…',
      },
      {
        id: 'petty-rejection',
        question: 'The pettiest reason I ever rejected someone is…',
      },
    ],
  },
  {
    id: 'dating-relationships',
    name: 'Dating & Relationships',
    description: 'Share your dating preferences and relationship goals',
    questions: [
      { id: 'best-first-date', question: "The best first date I've had was…" },
      { id: 'fall-for-you', question: "I'll fall for you if…" },
      {
        id: 'dating-non-negotiable',
        question: 'One non-negotiable in dating is…',
      },
      { id: 'hoping-to-meet', question: "I'm hoping to meet someone who…" },
    ],
  },
  {
    id: 'bar-date-specific',
    name: 'Bar-Date Specific',
    description: 'Perfect for planning your next bar date',
    questions: [
      { id: 'bar-revisit', question: "The bar I'd love to go to again is…" },
      {
        id: 'drink-never-again',
        question: "The one drink I'd never try again is…",
      },
      {
        id: 'dream-bar-destination',
        question: 'A dream bar destination for me would be…',
      },
      {
        id: 'perfect-toast',
        question: 'The perfect toast to start a date is…',
      },
    ],
  },
];
