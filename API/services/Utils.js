'use strict';
/**
 *  Utility Module. Stores universal functions and Arrays
 *  @module API/services/Utils
 *  @requires API/db/dbConn.execQuery
 *  @requires logger.logger
 *  @requires {@link external:config|config}
 *  @requires {@link external:node4mailer|node4mailer}
 *  @requires {@link external:bluebird|bluebird}
 *  @requires {@link external:socket.io|socket.io}
 *  @requires {@link external:util|util}
 */
import { execQuery } from '../db/dbConn';
import { logger } from '../../logger.js';
import config from 'config';
import mailer from 'node4mailer';
import Promise from 'bluebird';
import io from 'socket.io-client';
import moment from 'moment-timezone';
import util from 'util';

/**
 * precs object, contains properties are precedence descriptions, values are numeric values.
 */
let precs = {};

/**
 * Map of [CustomerData]{@link CustomerData} objects set to SCAC codes.
 */
let customerData = new Map();

/**
 * Map of [NameData]{@link NameData} objects set to SCAC codes.
 */
let nameData = new Map();

/**
 * Array of SCAC codes of active carriers/customers with Rate Profiles.
 */
let carrierData = [];

/**
 * Map of all zip codes => to state codes. (keyed off of the first three digits of the zip code).
 * NOTE: This map intentionally excludes zipcodes with fewer than 5 digits.
 */
let postalStateCodes = new Map();

/**
 * Establish the connection settings for the mailing service
 * No encryption is currently set, but it has the capability of doing so.
 */
const transporter = mailer.createTransport({
  host: config.get('MAIL_OPTIONS.HOST'),
  secureConnection: config.get('MAIL_OPTIONS.SECURE_CONNECTION'),
  port: config.get('MAIL_OPTIONS.PORT'),
  tls: {
    ciphers: config.get('MAIL_OPTIONS.CIPHER'),
    rejectUnauthorized: false
  },
  auth: {
    user: config.get('MAIL_OPTIONS.AUTH.USER'),
    pass: config.get('MAIL_OPTIONS.AUTH.PASSWORD')
  }
});

/**
 * Retrieve Precedence descriptions and values from the 400
 * @returns {Promise}
 */
function loadPrecs () {
  return new Promise((resolve, reject) => {
    logger.log('debug', `loading Precs`);
    execQuery(`SELECT PRTYPE, PRDESC FROM ${config.get('SYSTEM.DB.FILES.PRECS')}`)
      .then(results => {
        if (results) {
          for (let result in results) {
            precs[results[result].PRDESC.trim()] = results[result].PRTYPE;
          }
          resolve();
        } else {
          reject(new Error(`Error getting Precedences from ${config.get('SYSTEM.DB.FILES.PRECS')}`));
        }
      })
      .catch(err => reject(err));
  });
}

/**
 * Retrieves Customer data from the 400.
 * @returns {Promise}
 */
function loadCustomerProfs () {
  return new Promise((resolve, reject) => {
    logger.log('debug', `loading Customer profiles`);
    const query = `SELECT RPCNAME, RPSCAC, RRLTL,
                          (SELECT COUNT(*) FROM ${config.get('SYSTEM.DB.FILES.LTL_LANES')} WHERE RDSCAC = CUST.RPSCAC) as LTL_LANES,
                          (SELECT COUNT(*) FROM ${config.get('SYSTEM.DB.FILES.FAK_DATA')} WHERE RFCODE = CUST.RPSCAC) as HAS_FAK,
                          (SELECT COUNT(*) FROM ${config.get('SYSTEM.DB.FILES.STD_LANES')} WHERE RACODE = CUST.RPSCAC) as STD_LANES
                          FROM XL_RBNALT.BNAPROFP as CUST WHERE RPCUST = 1 AND RPACT = 'A'`;
    execQuery(query)
      .then(results => {
        let custCode;
        for (let result in results) {
          custCode = results[result].RPSCAC.trim();
          customerData.set(custCode, {
            code: custCode,
            name: (results[result].RPCNAME[0] === '*') ? results[result].RPCNAME.substring(3).trim().replace(/[^a-zA-Z0-9 ]/g, '') : results[result].RPCNAME.trim().replace(/[^a-zA-Z0-9 ]/g, ''),
            isLTL: (results[result].RRLTL === 'T'),
            numLTL: results[result].LTL_LANES,
            FAK: (results[result].HAS_FAK > 0),
            numSTD: results[result].STD_LANES
          });
        }
        resolve();
      })
      .catch(err => reject(err));
  });
}

/**
   * Retrieves the name of every Customer/Carrier. This checks for the name in in both the Carrier Profile, and the Addresses file.
   * @returns {Promise}
   */
function loadNames () {
  return new Promise((resolve, reject) => {
    logger.log('debug', `loading Carrier/Customer names`);
    const query = ` SELECT DISTINCT RACODE,
      CASE
      WHEN (SELECT COUNT(*) FROM ${config.get('SYSTEM.DB.FILES.CARRIER_PROFILE')} WHERE RPSCAC = BASE.RACODE) = 0
      THEN (SELECT RCUSTN FROM ${config.get('SYSTEM.DB.FILES.ADDRESSES')} WHERE RBILLC = BASE.RACODE)
      ELSE (SELECT RPCNAME FROM ${config.get('SYSTEM.DB.FILES.CARRIER_PROFILE')} WHERE RPSCAC = BASE.RACODE)
      END as NAME
      FROM ${config.get('SYSTEM.DB.FILES.STD_LANES')} as BASE`;

    execQuery(query)
      .then(results => {
        for (let result in results) {
          const data = results[result];
          nameData.set(data.RACODE, {
            code: data.RACODE,
            name: (data.NAME) ? data.NAME.trim() : 'Name Not Found'
          });
        }
        resolve();
      })
      .catch(err => reject(err));
  });
}

/**
   * Retrieves the SCAC code of every active customer/carrier with a Rate Profile (this is a requirement for the Rating System)
   * @returns {Promise}
   */
function loadActiveCodes () {
  return new Promise((resolve, reject) => {
    logger.log('debug', `loading all active carrier SCAC codes`);
    const query = `SELECT DISTINCT PRBCDE FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRACTI = 'A'`;

    execQuery(query)
      .then(results => {
        results.forEach(result => {
          carrierData.push(result.PRBCDE);
        });
        resolve();
      })
      .catch(err => reject(err));
  });
}

/**
 * Retrieves all State Codes and associated zip codes, where the zipcode has at least 5 digits.
 * @returns {Promise}
 */
function loadStateCodes () {
  return new Promise((resolve, reject) => {
    logger.debug(`Loading Zip Code => State Code map`);
    const query = `SELECT POSTCODE, POZIP FROM ${config.get('SYSTEM.DB.FILES.LTL_POSTCODES')} WHERE POZIP > 9999`;

    execQuery(query)
      .then(results => {
        results.forEach(result => {
          if (!postalStateCodes.has(result.POZIP.toString().slice(0, 3))) {
            postalStateCodes.set(result.POZIP.toString().slice(0, 3), result.POSTCODE);
          }
        });
        resolve();
      })
      .catch(err => reject(err));
  });
}

/**
 * Run each initialization task sequentially, then resolve with application object reference to continue the intialization process
 *  Utility Initialization Tasks:
 *  1) Build Array of Precedence values from the PRECS file (see config/default.json for details)
 *  2) Build Map of CustomerData. see [CustomerData]{@link CustomerData} for more information
 *  3) Build Map of Customer/Carrier Names see [NameData]{@link NameData} for more information
 *  4) Build Array of SCAC codes of every active Carrier/Customer with a Rate Profile (A carrier/customer MUST have a rate profile to be valid for the Rating System)
 * @param {Object} app - Express application object reference.
 * @returns {Promise<Object>} app - Express application object (Nothing is actually added to the application object reference here however the refrence must be passed on down the line)
 */
export function init (app) {
  logger.log('debug', `Beginning Utilities initialization`);
  return new Promise((resolve, reject) => {
    loadPrecs()
      .then(loadCustomerProfs)
      .then(loadNames)
      .then(loadActiveCodes)
      .then(loadStateCodes)
      .then(() => { resolve(app); })
      .catch(err => reject(err));
  });
}

/**
 * Socket object, can be used for realtime communication with the Admin Server. Currently non-functional until the Admin Server is capable of making use of these messages.
 */
export const socket = io(config.get('SYSTEM.ADMIN.SOCKET_ADDRESS'));

/**
 * Get a reference to the Precs Object.
 * @returns {Object.<string, number>} precs - Keys are Precedence names, values are the precedence numeric codes.
 */
export function getPrecs () { return precs; }

/**
 * Find the property of an object that contains the provided value, or an empty array if none is found.
 * @param {Object} object - Object to be searched
 * @param {string|number|boolean} value - value to be searched for.
 * @returns {Array.<string>} - Array of strings representing Object properties who's values matched the given value.
 */
export function getKeyByValue (object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

/**
 * Retrieve the name from the [NameData]{@link NameData} Map that corrispondes with the provided Code. Or 'Unknown' if no match is found
 * @param {string} code - SCAC code used to retrieve name
 * @returns {string} - nome associated with provided code or the string 'unknown' if no corrisponding name was found.
 */
export function getName (code) {
  if (nameData.has(code)) {
    return nameData.get(code).name;
  } else {
    return 'Unknown';
  }
}

/**
 * Get a reference to the [CarrierData]{@link CarrierData} map.
 * @returns {Object} - Map of carrierData retrieved at server initialization
 * @throws Will throw an Error if this is accessed before the [Utils.init]{@link module:API/services/Utils.init} function has completed its tasks
 */
export function getCarriers () {
  if (carrierData.size === 0) throw new Error('Utils Accessed before initialization!');
  return carrierData;
}

export function getZipStateCodes () {
  if (postalStateCodes.size === 0) throw new Error('Utils Accessed before initialization!');
  return postalStateCodes;
}

/**
 * Get All Active Customers as an array.
 * @returns {Array.<CustomerData>} Each customer object has these properties (code, name, isLTL, numLTL, FAK, numSTD)
 * @throws Will throw an Error if this is accessed before the [Utils.init]{@link module:API/services/Utils.init} function has completed its tasks
 */
export function getCustomers () {
  if (customerData.size === 0) throw new Error('Utils Accessed before initialization!');
  let customers = [];
  for (let [key, values] of customerData) {
    let obj = {};
    obj[key] = values;
    customers.push(obj);
  }
  return customers;
}

/**
 * Check if code belongs to a customer
 * @returns {boolean} - true if code is an active customer's code
 * @throws Will throw an Error if this is accessed before the [Utils.init]{@link module:API/services/Utils.init} function has completed its tasks
 */
export function isCustomer (code) {
  if (customerData.size === 0) throw new Error('Utils Accessed before initialization!');
  return customerData.has(code);
}

/**
 * Get Active Customers that support LTL as an array
 * @returns {Array.<CustomerData>} Each customer object has these properties (code, name, isLTL, numLTL, FAK, numSTD)
 * @throws Will throw an Error if this is accessed before the [Utils.init]{@link module:API/services/Utils.init} function has completed its tasks
 */
export function getLTLCustomers () {
  if (customerData.size === 0) throw new Error('Utils Accessed before initialization!');
  let customers = [];
  for (let cust of customerData.values()) {
    if (cust.isLTL) customers.push(cust);
  }
  return customers;
}

/**
 * Round number to given decimals
 * !!WARNING!!: This does not work for decimal values less than 1, if decimal is not numeric or is a value less than 1, the default settings from config will be used.
 * @param {!number} value - float number to be rounded
 * @param {number} [decimals=] - number of decimals to be rounded to. (defaults to config accuracy)
 * @returns {number} - rounded number.
 */
export function round (value, decimals) {
  if (isNaN(parseInt(value))) return 0;
  if (!decimals || isNaN(parseInt(decimals)) || decimals < 1) decimals = config.get('SETTINGS.ACCURACY');
  if (value instanceof Number) value = value.toString();
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

/**
 * Customer is LTL Ready
 * @param {string} code - SCAC code for Customer
 * @returns {object} valid: is true if customer is LTL ready. reason: gives the reason a customer is invalid
 */
export function custLTLReady (code) {
  if (customerData.size === 0) throw new Error('Utils Accessed before initialization!');
  const customer = customerData.get(code);
  if (customer) {
    if (customer.isLTL) {
      if (customer.numLTL === 0) {
        return { valid: false, reason: 'NO LTL LANES FOR THIS CUSTOMER' };
      }
      if (customer.FAK === 0) {
        return { valid: false, reason: 'NO FAK RANGE SET FOR THIS CUSTOMER' };
      }
      return { valid: true };
    } else {
      return { valid: false, reason: 'CUSTOMER NOT FLAGGED FOR LTL' };
    }
  } else {
    return { valid: false, reason: 'INVALID CUSTOMER CODE' };
  }
}

/**
 *  Sends a formatted email to any recipients listed in config file, or directly if specified.
 *  @param   {!Object}   messageData
 *  @param   {ErrorData} messageData.errorData - ErrorData Object
 *  @param   {Object}    messageData.mailData - Present if email is being directly sent, instead of as a result of an error
 *  @param   {string}    messageData.mailData.to - semi-colon seperated list of email addresses the message should be sent to
 *  @param   {string}    messageData.mailData.subject - Subject line of Email
 *  @param   {string}    messageData.mailData.body - Contents of email message
 *  @returns {Promise} - empty resolve on successful email. Rejects if any errors occur when sending the email.
 */
export function sendEmail (messageData) {
  logger.log('debug', messageData);
  return new Promise((resolve, reject) => {
    if (messageData) {
      // If flagged as error or no flag was set, assume error message
      if (messageData.errorData) {
        if (!process.env.NODE_ENV) {
          logger.log('debug', 'Email would have been sent...');
          resolve();
        } else {
          const mailOptions = {
            from: config.get('MAIL_OPTIONS.AUTH.USER'),
            to: '',
            subject: 'Rating System Error Detected',
            html: ''
          };

          const recepients = config.get('MAIL_OPTIONS.ERROR_RECEPIENTS');

          for (let email in recepients) {
            mailOptions.to += recepients[email] + ', ';
          }

          if (mailOptions.to.length > 0) {
            mailOptions.to = mailOptions.to.slice(0, -2);
            mailOptions.html = `<h4>Error Type: ${messageData.errorData.type}</h4><br /><br />${(messageData.errorData.user) ? `<p>User: ${messageData.errorData.user}</p><br /><br />` : ``}<p>Message sent to User: ${messageData.errorData.message}</p><br /><br /><p>Message for Sysop: ${util.format(messageData.errorData.adminMessage, messageData.errorData.stack)}</p>`;
            transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                reject(err);
              }

              resolve();
            });
          } else {
            resolve({ error: { type: 'Mailing error', message: 'No listed recepients in config file' } });
          }
        }
      } else {
        const mailOptions = {
          from: config.get('MAIL_OPTIONS.AUTH.USER'),
          to: messageData.mailData.to,
          subject: messageData.mailData.subject,
          html: messageData.mailData.body
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            reject(err);
          }

          resolve();
        });
      }
    } else {
      reject(new Error('[SEVERE]: sendMail was called but no data object provided'));
    }
  });
}

/**
 * Transform a Map object into a JSON object
 * @param {Map} map - JavaScript Map Object
 * @returns {Object}
 */
export function mapToJSON (map) {
  let obj = Object.create(null);
  for (let [key, value] of map) {
    obj[key] = value;
  }
  return obj;
}

/**
 * Transform a JSON Object into a Map Object
 * @param {Object} obj - JSON object
 * @returns {Map} map - JavaScript Map Object
 */
export function JSONToMap (obj) {
  let map = new Map();
  for (let key of Object.keys(obj)) {
    map.set(key, obj[key]);
  }
  return map;
}

/**
 * Transform Map Object into an Array
 * @param {Map} map - JavaScript Map object
 * @returns {Array.<any>} arr - array of all items in the Map Object. (!!WARNING!!: This drops the keys from the original Map Object, the array only contains the values)
 */
export function mapToArray (map) {
  let arr = [];
  for (let item of map.entries()) {
    arr.push(item[1]);
  }
  return arr;
}

/**
 * Log every property and subproperty of an Object. !!WARNING!! This does not have a hard limit! Pass it something too big and it **WILL** cause a stack overflow.
 * @param {Object} data - Object who's properties and their contents will be logged.
 * @param {Object} options - Options Object. Currently only one option is supported, 'showFuncContents' if set to true will also log the textual contents of all functions within the object.
 */
export function testDeep (data, options) {
  if (!options) options = {};
  for (let item in data) {
    console.log('############################');
    console.log(`Property ${item}:`);
    console.log(`Type: ${typeof data[item]}`);
    console.log(`Contents:`);
    if (options.showFuncContents && typeof data[item] === 'function') console.log(data[item].toString());
    else console.log(data[item]);
    if (typeof data[item] === 'object') testDeep(data[item]);
  }
}

/**
 * Get the current time HH:mm:ss format for EDT
 * @returns {string}
 */
export function currentTime () {
  return moment().tz('America/New_York').format('HH:mm:ss');
}

/**
 * Get the current date in 'YYYYMMDD' format for EDT
 * @returns {string}
 */
export function currentDate () {
  return moment().tz('America/New_York').format('YYYYMMDD');
}
