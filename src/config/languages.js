const Languages = {
  cs: {}, // object just in case we need some configuration later
  en: {},
};

Languages.all = Object.values(Languages);

Languages.add = function add(language) {
  this[language] = {};
  this.all.push(language);
};

export default Languages;
