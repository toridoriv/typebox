export * from "../../lib/utils.js";
export * from "../../lib/utils.types.js";

import util from "node:util";

import * as toolkit from "@toridoriv/toolkit";
import { Logger } from "tslog";

import { coerce } from "../../lib/utils.js";
// eslint-disable-next-line no-unused-vars
import { SetRequired } from "../../lib/utils.types.js";

/**
 * Templates and constants for generating JsDoc documentation comments.
 */
export const Jsdoc = (() => {
  /**
   * @type {["{{", "}}"]}
   */
  const TAGS = coerce(["{{", "}}"]);
  /**
   * @type {["«", "»"]}
   */
  const ALTER_TAGS = coerce(["«", "»"]);

  return {
    /**
     * Template for the description field of the documentation.
     */
    description: toolkit.Template.create(" * {{description}}", TAGS),
    /**
     * Templates for `@template` types.
     */
    generics: {
      /**
       * Template for required `@template` type.
       */
      required: toolkit.Template.create(" * @template {«constraint»} «name»", ALTER_TAGS),
      /**
       * Template for optional `@template` type.
       */
      optional: toolkit.Template.create(
        " * @template {«constraint»} [«name»=«default»]",
        ALTER_TAGS,
      ),
    },
    /**
     * Templates for `@param` tags.
     */
    params: {
      /**
       * Template for required `@param` tag with type constraint and parameter name.
       */
      required: toolkit.Template.create(" * @param {«type»} «name»", ALTER_TAGS),
      /**
       * Template for optional `@param` tag with type constraint and parameter name.
       */
      optional: toolkit.Template.create(" * @param {«type»} [«name»]", ALTER_TAGS),
    },
    return: toolkit.Template.create(" * @returns {«type»}"),
    /**
     * Template for the `@overload` tag.
     */
    overload: " * @overload",
    /**
     * Opening comment delimiter indicating the start of a documentation block.
     */
    start: "/**",
    /**
     * Closing comment delimiter indicating the end of a documentation block.
     */
    end: " */",
    /**
     * Empty line string used for spacing in multi-line comments.
     */
    emptyLine: " *",
  };
})();

/**
 * @type {util.InspectOptions}
 */
const DEFAULT_INSPECT_OPTIONS = {
  colors: true,
  depth: 3,
  maxArrayLength: 50,
  maxStringLength: 80,
};

export const logger = new Logger({
  type: "pretty",
  minLevel: 0,
  overwrite: {
    mask(args) {
      return args;
    },
  },
  stylePrettyLogs: true,
  prettyLogStyles: {
    logLevelName: {
      "*": ["bold", "black", "bgWhiteBright", "dim"],
      "SILLY": ["bold", "white"],
      "TRACE": ["bold", "whiteBright"],
      "DEBUG": ["bold", "green"],
      "INFO": ["bold", "cyan"],
      "WARN": ["bold", "yellow"],
      "ERROR": ["bold", "red"],
      "FATAL": ["bold", "redBright"],
    },
    dateIsoStr: ["white", "bold", "dim"],
    filePathWithLine: ["white", "bold", "dim"],
    name: ["white", "bold"],
    nameWithDelimiterPrefix: ["white", "bold"],
    nameWithDelimiterSuffix: ["white", "bold"],
    errorName: ["bold", "bgRedBright", "whiteBright"],
    fileName: ["yellow"],
    fileNameWithLine: "white",
  },
  prettyInspectOptions: DEFAULT_INSPECT_OPTIONS,
});

/**
 * @param {string}  startToken
 * @param {string}  endToken
 * @param {string}  value
 * @param {boolean} includeTokens
 */
export function getValueSurroundedBy(startToken, endToken, value, includeTokens = true) {
  const start = value.indexOf(startToken);
  const end = value.indexOf(endToken);

  if (includeTokens) {
    return value.substring(start, end + endToken.length).trim();
  }

  return value.substring(start + startToken.length, end).trim();
}

/**
 * Hides the provided keys from the given object by making them non-enumerable.
 *
 * @template T - The type of the object.
 * @param {T}           value - The object to hide keys from.
 * @param {(keyof T)[]} keys  - The keys to make non-enumerable.
 * @returns {void}
 */
export function hideProperties(value, ...keys) {
  for (const key of keys) {
    Object.defineProperty(value, key, {
      value: value[key],
      enumerable: false,
    });
  }
}

/**
 * @template T
 * @param {T}                   value
 * @param {util.InspectOptions} [options={}]
 */
export function inspect(value, options = {}) {
  logger.debug(util.inspect(value, { ...DEFAULT_INSPECT_OPTIONS, ...options }));

  return value;
}

/**
 * Picks a specific property from an object and returns its value.
 *
 * @template {Object}  O
 * @template {keyof O} K
 * @param {O} obj The input object from which to pick a property.
 * @param {K} key The key of the property to be picked.
 * @returns {O[K]} The value of the specified property.
 */
export function pick(obj, key) {
  // @ts-ignore: ¯\_(ツ)_/¯
  return lazyPick(obj)(key);
}

/**
 * Creates a partial function for picking properties from an object.
 *
 * @template {Object}  O
 * @template {keyof O} K
 * @param {O} obj The input object for which to create a partial picking function.
 * @returns A partial function that can be used to pick specific properties from the
 *          input object.
 */
export function lazyPick(obj) {
  /**
   * @param {K} key
   * @returns {O[K]}
   */
  function pick(key) {
    return obj[key];
  }

  return pick;
}

/**
 * @template {PropertyKey} K
 * @param {K} key
 */
export function pickProperty(key) {
  /**
   * @template {{ [P in K]: any }} O
   * @param {O} obj
   * @returns {O[K]}
   */
  return function pickFrom(obj) {
    return pick(obj, key);
  };
}

/**
 * Compares two strings alphabetically.
 *
 * @param {string} a - The first string to compare.
 * @param {string} b - The second string to compare.
 * @returns {number} - `-1` if `a < b`, `0` if `a == b`, `1` if `a > b`.
 */
export function compareAlphabetically(a, b) {
  return a.localeCompare(b);
}

/**
 * Creates a comparator function that compares two objects by the given key
 * alphabetically.
 *
 * @template {PropertyKey} K
 * @param {K} key - The key to compare by.
 */
export function comparePropertyAlphabetically(key) {
  /**
   * @template {{ [P in K]: any }} O
   * @param {O} a
   * @param {O} b
   * @returns {number}
   */
  return function compare(a, b) {
    return compareAlphabetically(a[key], b[key]);
  };
}

/**
 * Groups the elements of an iterable into arrays by the return value of the selector
 * function.
 *
 * @template T - The type of the iterable elements.
 * @template {PropertyKey} K - The type of the group keys returned by the selector.
 * @param {Iterable<T>}                      iterable - The iterable to group.
 * @param {(element: T, index: number) => K} selector - Function that returns the group
 *                                                    key for each element.
 * @returns {Record<K, T[]>} Object mapping keys to arrays of grouped elements.
 */
export function groupBy(iterable, selector) {
  const ret = /**
   * @type {Record<K, T[]>}
   */ ({});
  let i = 0;

  for (const element of iterable) {
    const key = selector(element, i++);
    const arr = (ret[key] ??= []);
    arr.push(element);
  }

  return ret;
}

/**
 * Adds a prefix and separator to the given value.
 *
 * @param {string} prefix    - The prefix to add.
 * @param {string} separator - The separator to add between the prefix and value.
 * @param {string} value     - The value to add the prefix to.
 * @returns {string} The value with the prefix and separator added.
 */
export function addPrefix(prefix, separator, value) {
  return `${prefix}${separator}${value}`;
}

/**
 * Trims whitespace from both ends of the given string value.
 *
 * @param {string} value - The string to trim.
 * @returns {string} The trimmed string.
 */
export function trim(value) {
  return value.trim();
}

/**
 * Returns a new array containing only the unique elements from the given array.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} arr - The array to get unique elements from.
 * @returns {T[]} A new array containing only the unique elements from the given array.
 */
export function getUnique(arr) {
  return Array.from(new Set(arr));
}

/**
 * Checks if an object has a property with the given key.
 *
 * @template {PropertyKey} K
 * @param {K} key - The property key to check for.
 * @returns {<O extends { [P in K]?: any }>(obj: O) => obj is SetRequired<O, K>}
 * A function that receives an object to search the property in.
 */
export function hasProperty(key) {
  /**
   * @template {{ [P in K]?: any }} O
   * @param {O} obj
   * @returns {obj is SetRequired<O, K>}
   */
  return function check(obj) {
    return key in obj && obj[key] !== undefined;
  };
}

/**
 * Checks if the given item exists in the given array.
 *
 * @template T
 * @param {T[]} target - The array to search in.
 * @param {T}   item   - The item to search for.
 * @returns {boolean} `true` if the item is not found in the array, `false` otherwise.
 */
export function isInArray(target, item) {
  const inTarget = target.find(areEquals.bind(null, item));

  return inTarget === undefined;
}

/**
 * Checks if two values are equal.
 *
 * @template T
 * @param {T} a - The first value to compare.
 * @param {T} b - The second value to compare.
 * @returns {boolean} `true` if a and b are equal, `false` otherwise.
 */
export function areEquals(a, b) {
  return a === b;
}
