module.exports = {
  dependencies: {
    "@react-native-community/netinfo": {
      platforms: {
        android: {
          sourceDir: "../node_modules/@react-native-community/netinfo/android",
        },
      },
    },
    "@react-native-async-storage/async-storage": {
      platforms: {
        android: {
          sourceDir: "../node_modules/@react-native-async-storage/async-storage/android",
        },
      },
    },
  },
};
