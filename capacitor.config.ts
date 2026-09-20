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
  plugins?: {
    LocalNotifications?: {
      smallIcon?: string;
      iconColor?: string;
      sound?: string;
    };
  };
}

const config: CapacitorConfig = {
  appId: "com.kunal.os",
  appName: "Everything",
  webDir: "public",
  server: {
    url: "https://kunal-os.onrender.com",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#000000",
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_notification",
      iconColor: "#EF4444",
    },
  },
};

export default config;
