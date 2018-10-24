'use strict';
/**
 *  Incoming Data cleaner
 *  @module API/services/DataCleaner
 */

/**
 * scrub Object of any values with special characters. If your array is Serialized, deserialize it before cleaning it.
 * Will also parse through any properties that contain objects or arrays, down to the lowest level, useing recursive function calls
 * WARNING: This does not currently have a limit to the depth of recursion!
 * @param {Object} data - Object containing values to be cleaned.
 * @param {Object} options - Options object
 * @param {Array.<string>} options.expected - Array of property names that are expected to be present
 * @param {Array.<string>} options.isNum - Array of property names that are expected to be numbers, if they are not they will be parsed, if they fail, they will be initialized to 0
 * @returns {Object} - cleaned Array/Object with the same property names that the original used
 */
export function standardDataCleaner (rawData, options) {
  return new Promise((resolve, reject) => {
    if (options && options.expected && options.expected.constructor === Array) {
      const keys = Object.keys(rawData);
      // logger.log('debug', keys);
      for (let entry of options.expected) {
        if (!keys.includes(entry)) reject(new Error('Missing Expected Properties'));
      }
    }
    let scrubbed = {};
    for (let item in rawData) {
      if (Array.isArray(rawData[item])) {
        scrubbed[item] = standardDataCleaner(rawData[item]);
      } else {
        // logger.log('debug', `Key:${item} , Value:${rawData[item]}`);
        if (rawData[item] && rawData[item] instanceof String) {
          scrubbed[item] = rawData[item].replace(/[^A-Za-z0-9-., *]/g, '');
        } else if (rawData[item] && rawData[item] instanceof Number) {
          scrubbed[item] = rawData[item].toString().replace(/[^A-Za-z0-9-., *]/g, '');
        } else {
          scrubbed[item] = rawData[item];
        }
        if (options && options.isNum && options.isNum.constructor === Array) {
          if (options.isNum.includes(item)) {
            scrubbed[item] = (scrubbed[item]) ? parseInt(scrubbed[item]) : 0;
          }
        }
      }
    }
    resolve(scrubbed);
  });
}

// export function ltlDataCleaner (rawData) {
//   let scrubbed = {};
//   for (let item in rawData) {
//
//   }
// }
