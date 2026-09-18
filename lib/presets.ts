export interface CardPreset {
  name: string;
  bank: string;
  network: "VISA" | "MASTERCARD" | "AMEX" | "RUPAY" | "OTHER";
  typicalLimit: number;
  statementDate: number;
  dueDate: number;
}

export const INDIAN_CARD_PRESETS: CardPreset[] = [
  {
    name: "Millennia",
    bank: "HDFC Bank",
    network: "VISA",
    typicalLimit: 150000,
    statementDate: 12,
    dueDate: 30,
  },
  {
    name: "Regalia Gold",
    bank: "HDFC Bank",
    network: "VISA",
    typicalLimit: 300000,
    statementDate: 16,
    dueDate: 5,
  },
  {
    name: "Amazon Pay ICICI",
    bank: "ICICI Bank",
    network: "VISA",
    typicalLimit: 200000,
    statementDate: 20,
    dueDate: 8,
  },
  {
    name: "SimplyCLICK",
    bank: "SBI Card",
    network: "VISA",
    typicalLimit: 100000,
    statementDate: 15,
    dueDate: 4,
  },
  {
    name: "Ace Credit Card",
    bank: "Axis Bank",
    network: "VISA",
    typicalLimit: 150000,
    statementDate: 18,
    dueDate: 7,
  },
  {
    name: "Platinum Travel",
    bank: "American Express",
    network: "AMEX",
    typicalLimit: 350000,
    statementDate: 24,
    dueDate: 12,
  },
];

export const DEFAULT_ROUTINES_PRESET = [
  {
    name: "Gym / Workout",
    category: "Health",
    targetDays: "MON_SAT",
    targetDurationMinutes: 60,
  },
  {
    name: "Study & Learning",
    category: "Study",
    targetDays: "DAILY",
    targetDurationMinutes: 60,
  },
  {
    name: "Reading Books",
    category: "Mindset",
    targetDays: "DAILY",
    targetDurationMinutes: 20,
  },
  {
    name: "Hydration (3L Water)",
    category: "Health",
    targetDays: "DAILY",
    targetDurationMinutes: 5,
  },
  {
    name: "Weekly Life & Expense Review",
    category: "Finance",
    targetDays: "SUNDAY",
    targetDurationMinutes: 30,
  },
];

export const DEFAULT_MESSAGE_TEMPLATES = [
  {
    category: "GOOD_MORNING",
    title: "Sweet Morning Wish",
    content: "Good morning ❤️ Hope you have an incredible and productive day ahead! Thinking of you.",
  },
  {
    category: "GOOD_LUCK",
    title: "Good Luck / Cheering",
    content: "Good luck today! You've worked so hard for this and you're going to crush it ❤️ You've got this!",
  },
  {
    category: "MISS_YOU",
    title: "Thinking of You",
    content: "Just wanted to take a quick pause and say I miss you ❤️ Can't wait to see you soon.",
  },
  {
    category: "ANNIVERSARY",
    title: "Anniversary Love",
    content: "Happy Anniversary my love ❤️ Thank you for making every day so special and beautiful. Here's to us!",
  },
  {
    category: "BIRTHDAY",
    title: "Birthday Wish",
    content: "Happy Birthday to the most amazing person in my world! 🎂❤️ May this year bring you all the happiness and success you deserve.",
  },
  {
    category: "CHECK_IN",
    title: "Afternoon Check-in",
    content: "Hey, hope your day is going smoothly! Remember to take a break and stay hydrated ❤️",
  },
];
