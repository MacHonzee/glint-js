/**
 * Interface for language configuration
 */
interface LanguageConfig {
  [key: string]: any;
}

/**
 * Interface for the Languages configuration object
 */
interface ILanguages {
  /** Czech language configuration */
  cs: LanguageConfig;
  /** English language configuration */
  en: LanguageConfig;
  /** Array of all available language codes */
  all: string[];
  /** Method to add a new language */
  add: (language: string) => void;
  /** Index signature for dynamic language additions */
  [key: string]: LanguageConfig | string[] | ((language: string) => void);
}

/**
 * Supported languages configuration for the application.
 * Provides a centralized definition of available languages.
 *
 * Default languages:
 * - cs: Czech
 * - en: English
 *
 * Each language entry is an object that can hold language-specific configuration
 * if needed in the future.
 */
const Languages: ILanguages = {
  cs: {}, // Object in case we need some configuration later
  en: {},
  all: [],
  add: function () {}, // Placeholder, will be overwritten below
};

Languages.all = Object.keys(Languages).filter((key) => key !== "all" && key !== "add");

/**
 * Adds a new language to the list of available languages.
 *
 * @param language - The language code to add (e.g., "de" for German, "fr" for French)
 *
 * @example
 * Languages.add("de"); // Add German
 * Languages.add("fr"); // Add French
 */
Languages.add = function add(language: string): void {
  this[language] = {};
  this.all.push(language);
};

export default Languages;
