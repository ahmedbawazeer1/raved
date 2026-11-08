// Dynamic part of the app config (the rest is app.json). CI sets RAVED_VERSION_CODE so every build
// is newer than the one installed (it also replaces the old TWA app, whose codes were below 100).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.RAVED_VERSION_CODE ?? 100),
  },
});
