// Config plugin: signs release builds with the Raved key when RAVED_KEYSTORE_FILE is set (CI), so the
// generated android/ project never needs hand edits (Continuous Native Generation).
const { withAppBuildGradle } = require("expo/config-plugins");

const RELEASE_CONFIG = `
        release {
            if (System.getenv("RAVED_KEYSTORE_FILE")) {
                storeFile file(System.getenv("RAVED_KEYSTORE_FILE"))
                storePassword System.getenv("RAVED_KEYSTORE_PASSWORD")
                keyAlias "raved"
                keyPassword System.getenv("RAVED_KEYSTORE_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes('System.getenv("RAVED_KEYSTORE_FILE")')) {
      src = src.replace(/signingConfigs \{\n/, `signingConfigs {${RELEASE_CONFIG}\n`);
      src = src.replace(
        /(release \{\n\s+\/\/ Caution![^\n]*\n\s+\/\/ see[^\n]*\n\s+)signingConfig signingConfigs\.debug/,
        `$1signingConfig System.getenv("RAVED_KEYSTORE_FILE") ? signingConfigs.release : signingConfigs.debug`,
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
