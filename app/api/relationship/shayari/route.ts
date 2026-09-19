import { NextRequest, NextResponse } from "next/server";

export interface ShayariItem {
  id: string;
  category: "ROMANTIC" | "CUTE" | "YAAD" | "MORNING" | "NIGHT";
  text: string;
  author?: string;
  moodTag: string;
}

const SHAYARI_COLLECTION: ShayariItem[] = [
  // ROMANTIC / ISHQ
  {
    id: "rom-1",
    category: "ROMANTIC",
    text: "तेरे चेहरे की चमक से रौशन है हर सुबह मेरी,\nतू जो मुस्कुरा दे तो मुकम्मल है ज़िन्दगी मेरी।",
    moodTag: "गहरी मोहब्बत ❤️",
  },
  {
    id: "rom-2",
    category: "ROMANTIC",
    text: "Tere khayal se hi mehek uthti hai meri har subah,\nTu pass na ho kar bhi meri rooh ke sabse kareeb hai.",
    moodTag: "True Love ✨",
  },
  {
    id: "rom-3",
    category: "ROMANTIC",
    text: "हाथ थाम कर तेरा उम्र भर का सफ़र तय करना है,\nसिर्फ मोहब्बत ही नहीं, मुझे तेरी हिफाज़त भी करना है।",
    moodTag: "Forever Promise 💍",
  },
  {
    id: "rom-4",
    category: "ROMANTIC",
    text: "Teri aankhon mein jo sukoon hai, wo duniya ki kisi daulat mein nahi,\nBas tu saath rahe, phir koi aur khwahish dil mein nahi.",
    moodTag: "Pure Peace 🕊️",
  },
  {
    id: "rom-5",
    category: "ROMANTIC",
    text: "दिल की हर धड़कन पे सिर्फ तेरा ही नाम लिखा है,\nमेरी हर दुआ में रब से सिर्फ तेरा ही साथ माँगा है।",
    moodTag: "Eternal Bond 🌹",
  },
  {
    id: "rom-6",
    category: "ROMANTIC",
    text: "Humne toh sirf dil lagaya tha,\nPar tumne toh aake meri poori duniya hi badal di.",
    moodTag: "Soulmate ❤️",
  },
  {
    id: "rom-7",
    category: "ROMANTIC",
    text: "कोई पूछे सुकून क्या है, तो मैं तेरा नाम ले लूँ,\nतेरी बाँहों में सिमट कर अपनी सारी थकान भूल जाऊँ।",
    moodTag: "Sukoon 🕯️",
  },
  {
    id: "rom-8",
    category: "ROMANTIC",
    text: "Har saans mein tera hi ehsaas hai,\nMera kal bhi tu hai, mera aaj bhi tu hai.",
    moodTag: "Forever Yours 💫",
  },

  // CUTE / SWEET (Tailored for Golu)
  {
    id: "cute-1",
    category: "CUTE",
    text: "गुस्सा भी करती हो तो इतनी प्यारी लगती हो गोलू,\nदिल करता है दिन भर तुम्हें ही छेड़ता रहूँ!",
    moodTag: "Pyari Si Golu 🥰",
  },
  {
    id: "cute-2",
    category: "CUTE",
    text: "Choti choti baaton pe tera muh phula lena,\nAur phir mere manane pe dheere se muskura dena... bas yahi toh pyar hai!",
    moodTag: "Sweetest Smile 🍭",
  },
  {
    id: "cute-3",
    category: "CUTE",
    text: "दुनिया के लिए तुम सिर्फ एक इंसान हो सकती हो गोलू,\nलेकिन मेरे लिए तुम मेरी पूरी कायनात हो।",
    moodTag: "Meri Golu Jaan 💕",
  },
  {
    id: "cute-4",
    category: "CUTE",
    text: "Tu chahe kitna bhi lad le mujhse,\nRaat ko soye bina tera 'Good Night babu' bole sukoon nahi milta!",
    moodTag: "Cute Fights 🧸",
  },
  {
    id: "cute-5",
    category: "CUTE",
    text: "गोलू, तुम्हारी मासूमियत पे दिल हर रोज़ दोबारा फिदा हो जाता है,\nभगवान ने तुम्हें सिर्फ और सिर्फ मेरे लिए बनाया है।",
    moodTag: "Priceless Innocent ❤️",
  },
  {
    id: "cute-6",
    category: "CUTE",
    text: "Kitna ajeeb nasha hai teri baaton mein,\nEk pal na sunoon toh bechaini hone lagti hai.",
    moodTag: "Addicted to You 🍯",
  },

  // YAAD / MISS YOU
  {
    id: "yaad-1",
    category: "YAAD",
    text: "दिन तो गुज़र जाता है काम में मसरूफ़ रहकर,\nशाम ढलते ही तुम्हारी यादों का क़ाफ़िला आ जाता है।",
    moodTag: "Missing You 🌙",
  },
  {
    id: "yaad-2",
    category: "YAAD",
    text: "Faasle kitne bhi ho humare beech mein golu,\nDil ki har taar sirf tujhse hi judi rehti hai.",
    moodTag: "Distant Hearts Closer 🌌",
  },
  {
    id: "yaad-3",
    category: "YAAD",
    text: "तुम्हारी याद का मौसम भी कितना अजीब है,\nजब भी आता है, आँखें भर आती हैं और दिल मुस्कुरा देता है।",
    moodTag: "Sweet Nostalgia 💭",
  },
  {
    id: "yaad-4",
    category: "YAAD",
    text: "Kaash abhi tu samne hoti,\nBas chupchap tera haath pakad ke baitha rehta.",
    moodTag: "Longing for You 🤍",
  },

  // MORNING
  {
    id: "morn-1",
    category: "MORNING",
    text: "Good Morning meri jaan golu,\nSuraj ki pehli kiran ke sath dher saara pyaar aur duayein sirf tere liye!",
    moodTag: "Morning Sunshine ☀️",
  },
  {
    id: "morn-2",
    category: "MORNING",
    text: "उठो मेरी प्यारी सी गोलू, देखो नया सवेरा आया है,\nअपने साथ तुम्हारे चेहरे पर प्यारी सी मुस्कान लाया है।",
    moodTag: "Subah Bakhair 🌸",
  },
  {
    id: "morn-3",
    category: "MORNING",
    text: "Wake up babu! Aaj ka din tumhare liye bohot accha aur khushiyo se bhara ho,\nAlways remember tera Kunal is always with you.",
    moodTag: "Best Wishes ☕",
  },

  // NIGHT
  {
    id: "night-1",
    category: "NIGHT",
    text: "चाँद सितारों से कह दिया है तुम्हारी पहरेदारी करने को,\nसो जाओ मेरी प्यारी गोलू, मीठे-मीठे ख्वाबों में मिलने को।",
    moodTag: "Sweet Dreams 🌠",
  },
  {
    id: "night-2",
    category: "NIGHT",
    text: "Good Night babu... Take Care ❤️\nApne saare stress bhool kar aaram se sona. Kal ek naya aur khoobsurat din hoga.",
    moodTag: "Peaceful Sleep 🛌",
  },
  {
    id: "night-3",
    category: "NIGHT",
    text: "Khwabon mein aana meri golu, hum wahan milenge,\nJahan sirf tum, main aur sitaaron ki roshni hogi.",
    moodTag: "Night Melody 🌙",
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let pool = SHAYARI_COLLECTION;
    if (category && category !== "ALL") {
      pool = SHAYARI_COLLECTION.filter((item) => item.category === category);
    }

    if (pool.length === 0) {
      pool = SHAYARI_COLLECTION;
    }

    // Pick random item or return list
    const randomIndex = Math.floor(Math.random() * pool.length);
    const item = pool[randomIndex];

    return NextResponse.json({
      shayari: item,
      totalCount: pool.length,
      allCategories: ["ALL", "ROMANTIC", "CUTE", "YAAD", "MORNING", "NIGHT"],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch shayari" }, { status: 500 });
  }
}
