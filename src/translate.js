const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const deepmerge = require('deepmerge');

/**
 * Request to google translate api. Language code uses ISO 639-1 nomenclature
 * @param {string} - text Text to be translated
 * @param {string} - sourceLang Code language to translate from
 * @param {string} - targetLang Code language to translate to
 *
 * @returns {Promise}
 */
const translateText = (text, sourceLang, targetLang) => {
  if(!text) return Promise.resolve('');

  const url = "https://translate.googleapis.com/translate_a/single";
  const params = {
    client : 'gtx',
    dt     : 't',
    sl     : sourceLang,
    tl     : targetLang,
    q      : text
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  return axios.get(url, {params, headers}).then(response => response.data[0][0][0]).catch(error => {
    console.error(error);
    return Promise.resolve('');
  });
};

/**
 *  Recursive function to translate a json object
 *
 * @param {object} json Object to translate
 * @param {*} sourceLang Code language to translate from
 * @param {*} targetLang targetLang Code language to translate from
 */
const translateJson = (json, sourceLang, targetLang, translations, level = 0) => {
  if(level > 10) return Promise.resolve(json);

  translations = translations || clone(json);
  const promises = [];

  Object.entries(json).forEach(([key, value]) => {
    let promise;

    if(typeof value === 'string') {
      promise = translateText(value, sourceLang, targetLang);
      promise.then(translation => {
        translations[key] = translation;
      });

    } else if(typeof value === 'object') {
      promise = translateJson(value, sourceLang, targetLang, translations[key], level++);

    } else {
      promise = Promise.resolve(value);
    }

    promises.push(promise)
  });

  return Promise.all(promises).then(() => translations);
};

/**
 * Function that takes a a source file and a target file to make translations
 *
 * @param {*} fileSrc file path to the source json
 * @param {*} fileTarg file path to the target json
 * @param {*} srcLang Code language to translate from
 * @param {*} targLang targetLang Code language to translate from
 */
const translateJsonFile = async (fileSrc, fileTarg, srcLang, targLang) => {
  const jsonSrc = readJsonFile(fileSrc);
  const jsonTarget = readJsonFile(fileTarg);

  const extractedJson = getDiffJson(jsonSrc, jsonTarget);

  const filename = path.basename(fileTarg)
  const filePath = path.dirname(fileSrc);
  const translation = await translateJson(extractedJson, srcLang, targLang);

  const newJson = deepmerge(jsonTarget, translation);

  fs.writeFile(path.join(filePath, filename), JSON.stringify(newJson, null, 2));
}

/**
 * Simple clone function using stringify
 * @param {object} obj
 *
 * @returns {object} copy of object
 */
const clone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Read a json file and returns the object
 * @param {*} filePath
 */
const readJsonFile = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Extract the diff from empty values in json
 *
 * @param {object} json1
 * @param {object} json2
 *
 */
const getDiffJson = (json1, json2) => {
  const diffJson = {};

  Object.entries(json2).forEach(([key, value]) => {
    if(value === '') {
      diffJson[key] = json1[key];
    } else if(typeof value === 'object') {
      const extractedJson = getDiffJson(json1[key], value);
      if(!isObjectEmpty(extractedJson)) {
        diffJson[key] = extractedJson;
      }
    } else {
      return diffJson;
    }
  });

  return diffJson;
}

/**
 * Check is an object is empty
 * @param {*} obj
 */
const isObjectEmpty = (obj) => {
  return typeof obj === 'object' && Object.keys(obj).length === 0;
}

module.exports = {
  translateJsonFile
};
