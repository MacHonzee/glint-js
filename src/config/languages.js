/**
 * Registry of supported application languages. Defaults include Czech (`cs`)
 * and English (`en`). Use {@link Languages.add} to register additional languages
 * at application startup.
 *
 * @type {Object<string, object> & { all: string[], add: (language: string) => void }}
 */
const Languages = {
  cs: {},
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
