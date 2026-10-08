// Expo joins platforms.android.sourceDir onto the package root.
// Keep it as "android", not a path relative to apps/mobile.
module.exports = {
  dependencies: {
    "@react-native-community/netinfo": {
      platforms: {
        android: {
          sourceDir: "android",
        },
      },
    },
    "@react-native-async-storage/async-storage": {
      platforms: {
        android: {
          sourceDir: "android",
        },
      },
    },
  },
};
