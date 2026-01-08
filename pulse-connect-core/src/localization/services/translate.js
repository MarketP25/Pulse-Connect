module.exports = function translate(messageKey, lang = "en") {
  const langMap = require("../i18n/lang-map.json");
  return langMap[lang][messageKey] || messageKey;
};
