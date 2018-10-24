/**
 * Query Processor Module.
 * Performs necessary tasks to validate a route, request information from Rand McNalley and the 400, and finally format the results for transmission to the client.
 * @module API/services/STDQueryProcessor
 * @requires API/db/dbConn.execQuery
 * @requires API/services/Utils.round
 * @requires API/services/Utils.socket
 * @requires API/services/Utils.getPrecs
 * @requires API/services/Utils.mapToArray
 * @requires API/services/RMConn.validateRouteRM
 * @requires API/services/RMConn.getMiles
 * @requires API/models/selStrModel.getSelect
 * @requires API/models/whrStrModel.genWhereClause
 * @requires API/models/STDQuote
 * @requires logger.logger
 * @requires {@link external:underscore|underscore}
 * @requires {@link external:moment|moment}
 */
'use strict';

import { execQuery } from '../db/dbConn';
import { round, socket, getPrecs, mapToArray } from './Utils';
import _ from 'underscore';
import moment from 'moment';
import { validateRouteRM, getMiles } from './RMConn';
import { getSelect } from '../models/selStrModel';
import { genWhereClause } from '../models/whrStrModel';
import { STDQuote } from '../models/STDQuote';
import { logger } from '../../logger';

/**
 * Local copy of precedences object generated at API Load.
 */
const precs = getPrecs();

/**
 *  Builds a short string to indicate the fields provided for origin and destination and attaches it to RouteData Object
 *  @param {RouteData} routeData
 *  @returns {Promise<RouteData>}
 */
export function typeCheck (routeData) {
  return new Promise((resolve, reject) => {
    let typeCheck = '';
    if (routeData.orgCity !== '') typeCheck += 'C';
    if (routeData.orgState !== '') typeCheck += 'S';
    if (routeData.orgZip && routeData.orgZip !== '') typeCheck += 'Z';
    typeCheck += '_';
    if (routeData.desCity !== '') typeCheck += 'C';
    if (routeData.desState !== '') typeCheck += 'S';
    if (routeData.desZip && routeData.desZip !== '') typeCheck += 'Z';
    routeData.typeCheck = typeCheck;
    resolve(routeData);
  });
}

/**
 *  Validates Route information, if valid route type will either accept route information or return a list of possible locations
 *  (orgResponse || orgResponseList) and (desResponse || desResponseList) properties are added to the RouteData Object.
 *  Potentially containing lists of possible locations if Rand McNalley was unable to pinpoint the desired location.
 *  @param   {RouteData} routeData
 *  @returns {Promise<RouteData>}
 */
export function validateRoute (routeData) {
  return new Promise((resolve, reject) => {
    if (!routeData) reject(new Error('Must provide valid Route Data object'));
    if (routeData.typeCheck === 'CSZ_CSZ' || routeData.typeCheck === 'CS_CSZ' || routeData.typeCheck === 'CSZ_CS' || routeData.typeCheck === 'CS_CS' || routeData.typeCheck === 'Z_Z') {
      validateRouteRM(routeData)
        .then(details => {
          const orgResData = JSON.parse(details.orgResponse);
          const desResData = JSON.parse(details.desResponse);
          if (orgResData[0] === 5 || desResData[0] === 5) reject(new Error(`Invalid Session ID! How'd that happen?`));
          if (orgResData[0] !== 6) {
            orgResData.shift();
            routeData.orgResponseList = orgResData;
          }
          if (desResData[0] !== 6) {
            desResData.shift();
            routeData.desResponseList = desResData;
          }
          if (!routeData.orgResponse && !routeData.desResponse) {
            routeData.orgZip = orgResData[2].zipCode;
            routeData.desZip = desResData[2].zipCode;
          }
          routeData.sessionID = details.sessionID;
          process.nextTick(() => {
            resolve(routeData);
          });
        })
        .catch(error => { reject(error); });
    } else {
      routeData.orgResponse = -1;
      routeData.desResponse = -1;
      resolve(routeData);
    }
  });
}

/**
 *  Requests the mileage data from the Rand McNalley Server if the route type contains enough information to be point to point,
 *  otherwise verifies that the user provided their own miles for the calculation.
 *  If this method is called without providing a reference to the RouteData object, the promise chain will be canceled and an error generated.
 *  If the RouteData object does not contain the typeCheck property, typecheck is called before this function continues.
 *  The calcHHG and calcPRACT properties of the RouteData object are now set using the response from the Rand McNalley Server.
 *  @param   {RouteData} routeData
 *  @returns {Promise<RouteData>}
 */
export function calcMiles (routeData) {
  return new Promise((resolve, reject) => {
    if (!routeData) this.cancel();
    if (!routeData.typeCheck) typeCheck(routeData).then(calcMiles);

    if (routeData.typeCheck === 'CSZ_CSZ' || routeData.typeCheck === 'CS_CSZ' || routeData.typeCheck === 'CSZ_CS' || routeData.typeCheck === 'CS_CS' || routeData.typeCheck === 'Z_Z') {
      getMiles(routeData)
        .then(response => {
          logger.log('debug', response);
          routeData.calcHHG = response[0];
          routeData.calcPRACT = response[1];
          if (routeData.stopOffs) {
            routeData.calcHHG += routeData.stopOffs;
            routeData.calcPRACT += routeData.stopOffs;
          }
          if (routeData.HHG !== 0 || routeData.PRACT !== 0) {
            if (routeData.HHG !== 0) {
              routeData.calcHHG += parseInt(routeData.HHG);
            }
            if (routeData.PRACT !== 0) {
              routeData.calcPRACT += parseInt(routeData.PRACT);
            }
          } else if (routeData.calcHHG === 0 && routeData.calcPRACT === 0) {
            const error = {
              type: 'WARNING',
              message: 'If you are not requesting a City, ST to City, ST route you may wish to include miles.'
            };
            resolve({ error });
          } else {
            process.nextTick(() => {
              resolve(routeData);
            });
          }
        });
    } else {
      if (routeData.stopOffs) {
        routeData.calcHHG += routeData.stopOffs;
        routeData.calcPRACT += routeData.stopOffs;
      }
      if (routeData.HHG !== 0 || routeData.PRACT !== 0) {
        if (routeData.HHG !== 0) {
          routeData.calcHHG += parseInt(routeData.HHG);
        }
        if (routeData.PRACT !== 0) {
          routeData.calcPRACT += parseInt(routeData.PRACT);
        }
      } else if (routeData.calcHHG === 0 && routeData.calcPRACT === 0) {
        const error = {
          type: 'WARNING',
          message: 'If you are not requesting a City, ST to City, ST route you may wish to include miles.'
        };
        resolve({ error });
      } else {
        resolve(routeData);
      }
    }
  });
}

/**
 * Build the complete SQL Query String - This is the logic used to generate a list of all carriers/customers that have a valid lane for this route.
 * The queryData property is now set in the RouteData object.
 * NOTE: This does not prevent duplicates! This does however, only list lanes active for the requested date and from active customers/carriers.
 * @see [procQuery]{@link module:API/services/QueryProcessor.procQuery} - This removes duplicates before sending response
 * @param {RouteData} routeData
 * @returns {Promise<RouteData>}
 */
export function buildQuery (routeData) {
  return new Promise((resolve, reject) => {
    if (!routeData) reject(new Error('Must provide valid Route Data Object'));
    let query = getSelect(routeData.calcHHG, routeData.calcPRACT, routeData.date);
    genWhereClause(routeData, precs)
      .then((whereClause) => {
        if (whereClause.error) resolve(whereClause);
        query += whereClause;
        const queryData = {
          query,
          trackingData: {
            route: {
              orgCity: routeData.orgCity,
              orgState: routeData.orgState,
              orgZip: routeData.orgZip,
              desCity: routeData.desCity,
              desState: routeData.desState,
              desZip: routeData.desZip
            }
          }
        };
        routeData.queryData = queryData;
        resolve(routeData);
      });
  });
}

/**
 * Query the Database for any Lanes applicable to this route. Process results accordingly
 * @param {RouteData} routeData
 * @returns {Promise<Array.<STDQuote>>}
 * @see module:API/models/STDQuote
 */
export function procQuery (routeData) {
  return new Promise((resolve, reject) => {
    const queryData = routeData.queryData;
    let stopOffs = false;
    let query = queryData.query;
    if (routeData.stopOffs) stopOffs = parseInt(routeData.stopOffs);

    execQuery(query)
      .then(results => {
        const carriersMap = new Map();
        // Calculations for Base cost, Rate per mile, fuel cost, stop off costs (if they exist), and the Net charge
        // Round the results for Total charges and fuel charges to two decimal places.
        for (let result in results) {
          if (!carriersMap.has(results[result].RACODE)) {
            if (stopOffs && parseFloat(results[result].RARPM) === 0.0) {
              let RPM = parseFloat(results[result].BASE) / (parseInt(results[result].MILE) - stopOffs);
              if (RPM < 0) RPM = 0; // Just in case there is somehow more stopoffs than miles
              const stopCost = RPM * stopOffs;
              const fuelIncrease = parseFloat(results[result].FUELC) / parseInt(results[result].MILE);
              results[result].BASE = parseFloat(results[result].BASE) + parseFloat(stopCost);
              results[result].TOTAL = round(parseFloat(results[result].TOTAL) + (stopCost * 2));
              results[result].FUELC = round(parseFloat(results[result].FUELC) + fuelIncrease);
            } else if (stopOffs) {
              const stopCost = parseFloat(results[result].RARPM) * stopOffs;
              const fuelIncrease = parseFloat(results[result].FUELC) / parseInt(results[result].MILE);
              results[result].BASE = parseFloat(results[result].BASE) + parseFloat(stopCost);
              results[result].TOTAL = round(parseFloat(results[result].TOTAL) + (stopCost * 2));
              results[result].FUELC = round(parseFloat(results[result].FUELC) + fuelIncrease);
            } else {
              results[result].BASE = parseFloat(results[result].BASE);
              results[result].TOTAL = round(parseFloat(results[result].TOTAL));
              results[result].FUELC = round(parseFloat(results[result].FUELC));
            }
            results[result].BASE = round(results[result].BASE);
            results[result].ISCUST = (results[result].ISCUST === '1');
            carriersMap.set(results[result].RACODE, new STDQuote(results[result]));
          }
        }
        const queryArray = mapToArray(carriersMap);
        const keys = [];

        const quoteTable = _.sortBy(queryArray, 'base');
        socket.emit('query', {
          keys,
          user: (queryData.trackingData) ? queryData.trackingData.username : '-',
          route: (queryData.trackingData) ? queryData.trackingData.route : '-',
          timeStamp: moment().format('MM/DD/YYYY - HH:mm:ss')
        });
        resolve(quoteTable);
      })
      .catch(err => reject(err));
  });
}
