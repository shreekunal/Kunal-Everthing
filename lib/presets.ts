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
    category: "LOVE",
    title: "I love you so much ❤️",
    content: "I love you so much ❤️",
  },
  {
    category: "AFFECTION",
    title: "Mera bacha pyara sa",
    content: "Mera bacha pyara sa",
  },
  {
    category: "GOOD_NIGHT",
    title: "Good Night babu .. Take Care",
    content: "Good Night babu .. Take Care",
  },
  {
    category: "GOOD_MORNING",
    title: "Good Morning Babyyyy",
    content: "Good Morning Babyyyy",
  },
];
