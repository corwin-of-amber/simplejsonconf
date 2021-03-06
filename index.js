/**
 * simplejsonconf
 *
 * A simple library to manage JSON as ex. a configuration file
 *
 * @author Anders Evenrud <andersevenrud@gmail.com>
 * @license MIT
 * @preserve
 */

/* Deep-copies any json data */
const clone = json => typeof json === 'undefined'
  ? json
  : JSON.parse(JSON.stringify(json));

/* Splits a path  Splits a string into piecesstring into pieces */
const splitKey = key => key.split(/\./g);

/* Check if is of a nullable type */
const isNullable = v => typeof v === 'undefined'
  || v === null;

/* Check if an object */
const isObject = v => !!v
  && typeof v === 'object'
  && !Array.isArray(v);

/* Deep-merges two objects */
const merge = (target, source) => {
  if (isObject(target) && isObject(source)) {
    for (let key in source) {
      if (isObject(source[key])) {
        if (!target[key] || typeof target[key] !== typeof source[key]) {
          Object.assign(target, {[key]: {}});
        }

        merge(target[key], source[key]);
      } else {
        Object.assign(target, {[key]: source[key]});
      }
    }

    return target;
  }

  return source;
};

/**
 * Gets a value from a JSON tree
 * @param {object} tree The JSON object
 * @param {string} [key] The key/path to resolve
 * @param {*} [defaultValue] Return this if resolved value was undefined
 * @return {*} A value
 */
const getTreeValue = (tree, key, defaultValue) => {
  if (isNullable(key)) {
    return tree;
  }

  let result;

  try {
    result = splitKey(key)
      .reduce((result, key) => result[key], Object.assign({}, tree));
  } catch (e) { /* noop */ }

  return typeof result === 'undefined' ? defaultValue : result;
};

/**
 * Resolves an entry in the tree (i.e. parent of value)
 * @param {object} tree The JSON object
 * @param {string} [key] The key/path to resolve
 * @param {boolean} [populate] Populates the tree by path
 * @return {*} A value
 */
const resolveMutate = (tree, key, populate) => {
  const path = splitKey(key);
  const len = path.length;

  if (populate) {
    let last = tree;
    for (let i = 0; i < len; i++) {
      let k = path[i];
      if (typeof last[k] === 'undefined') {
        last[k] = {};
      }
      last = last[k];
    }
  }

  const lastKey = len === 1 ? path[0] : path.pop();
  const resolved = len === 1 ? tree : getTreeValue(tree, path.join('.'));

  return [resolved, lastKey];
};

/**
 * Sets a value in a JSON tree
 * @param {object} tree The JSON object
 * @param {string} [key] The key/path to resolve
 * @param {*} value The value
 * @param {object} [options] Options
 * @param {boolean} [options.merge=true] Merge objects if value is also an object
 * @param {boolean} [options.parse=true] Parses the given value
 * @return {*} The new value
 */
const setTreeValue = (tree, key, value, options) => {
  if (options.parse !== false) {
    try {
      value = typeof value === 'undefined'
        ? value
        : JSON.parse(value);
    } catch (e) {}
  }

  if (isNullable(key)) {
    const newValue = options.merge !== false
      ? merge(tree, value)
      : value;

    return Object.assign(tree, newValue);
  }

  const [resolved, lastKey] = resolveMutate(tree, key, true);

  if (isNullable(resolved[lastKey])) {
    resolved[lastKey] = {};
  }

  const newValue = options.merge !== false
    ? merge(resolved[lastKey], value)
    : value;

  resolved[lastKey] = newValue;
  return newValue;
};

/**
 * Pushes a value into resolved array in JSON tree
 * @param {object} tree The JSON object
 * @param {string} [key] The key/path to resolve
 * @param {*} value The value
 * @return {*} The new value
 */
const pushTreeValue = (tree, key, value) => {
  const resolved = getTreeValue(tree, key);
  if (!Array.isArray(resolved)) {
    throw new Error(`The key '${key}' is not an array`);
  }

  resolved.push(value);

  return resolved;
};

/**
 * Removed an entry from resolved key in JSON tree
 * @param {object} tree The JSON object
 * @param {string} [key] The key/path to resolve
 * @return {*} The resulting object/array
 */
const removeTreeKey = (tree, key) => {
  const [resolved, lastKey] = resolveMutate(tree, key);

  if (typeof resolved[lastKey] !== 'undefined') {
    if (resolved instanceof Array) {
      resolved.splice(resolved.indexOf(resolved[lastKey]), 1);
    } else {
      delete resolved[lastKey];
    }
  }

  return resolved;
};

/**
 * Creates a new simplejsonconf wrapper
 * @param {object} initialTree Initial settings tree
 * @return {simplejsonconf}
 */
const simplejsonconf = (initialTree) => {
  let tree;
  const setInitial = t => (tree = clone(t));

  setInitial(initialTree);

  /**
   * @property {Function} get Get a value => (key, [defaultValue])
   * @property {Function} set Set a value => (key, value, [options])
   * @property {Function} push Pushes a value => (key, value)
   * @property {Function} remove Removes an entry/value => (key)
   * @property {Function} reset Resets the tree to riginal or defined tree => ([to])
   * @property {Function} toString Get JSON encoded string of current tree
   * @typedef simplejsonconf
   */
  return {
    get: (key, defaultValue) => clone(getTreeValue(tree, key, defaultValue)),
    set: (key, value, options = {}) => clone(setTreeValue(tree, key, value, options)),
    push: (key, value) => clone(pushTreeValue(tree, key, value)),
    remove: (key) => clone(removeTreeKey(tree, key)),
    reset: to => clone(setInitial(to ? to : initialTree)),
    toString: () => JSON.stringify(tree)
  };
};

export default simplejsonconf;
