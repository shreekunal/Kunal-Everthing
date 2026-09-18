interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    androidScheme?: string;
  };
  android?: {
    backgroundColor?: string;
    allowMixedContent?: boolean;
    captureInput?: boolean;
  };
}

const config: CapacitorConfig = {
  appId: "com.kunal.os",
  appName: "KunalOS",
  webDir: "out",
  server: {
    // When deploying to cloud (Render / Vercel), specify your deployed URL here:
    // url: "https://kunal-os.onrender.com",
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#000000",
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
