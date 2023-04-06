const Languages = {
  cs: {}, // object just in case we need some configuration later
  en: {},
};

Languages.all = Object.keys(Languages);

/**
 * Method adds a language to list of available languages within the application
 *
 * @param {string} language
 */
Languages.add = function add(language) {
  this[language] = {};
  this.all.push(language);
};

export default Languages;
