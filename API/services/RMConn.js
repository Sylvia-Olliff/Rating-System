/**
 * Rand McNalley Communication Module
 * @module API/services/RMConn
 * @requires {@link external:axios|axios}
 * @requires {@link external:config|config}
 */
'use strict';

import axios from 'axios';
import config from 'config';

/**
 * URI for retrieving a session id from the Rand McNalley Server.
 */
const getKeyURI = `${config.get('LOCATIONS.RM_API')}getKey`;

/**
 * URI for requesting route validation from the Rand McNalley Server.
 */
const validateRouteURI = `${config.get('LOCATIONS.RM_API')}validateRoute`;

/**
 * URI for requesting the calculated miles from the Rand McNalley Server
 */
const getMilesURI = `${config.get('LOCATIONS.RM_API')}getMiles`;

/**
 * Sends a GET request to the Rand McNalley Server for a session ID.
 * This allows the Rand McNalley Server to "remember" which client has requested what.
 * i.e. when requesting miles, the session ID tells the Rand McNalley Server what route the request is referring to.
 * @returns {Promise<number>} - session ID is a simple integer.
 */
function getKey () {
  return new Promise((resolve, reject) => {
    axios.get(getKeyURI)
      .then((response) => {
        process.nextTick(() => {
          resolve(JSON.parse(response.data.index)[0]);
        });
      });
  });
}

/**
 * Requests a session ID from the Rand McNalley Server. Upon successful receipt of a session ID
 * it then sends a POST request to the Rand McNalley Server using basic route information for validation.
 * @see RouteInfo
 * @param {RouteData} routeData
 * @returns {Promise<RouteInfo>} Object containing the session ID and the contents of the response from the Rand McNalley Server.
 */
export function validateRouteRM (routeData) {
  return new Promise((resolve, reject) => {
    getKey()
      .then(sessionID => {
        const validationPacket = {
          routeData: {
            sessionID,
            orgName: (routeData.orgCorrected) ? routeData.orgCorrected : routeData.orgCity,
            orgCounty: (routeData.orgCounty) ? routeData.orgCounty : '',
            orgState: routeData.orgState,
            desName: (routeData.desCorrected) ? routeData.desCorrected : routeData.desCity,
            desCounty: (routeData.desCounty) ? routeData.desCounty : '',
            desState: routeData.desState
          }
        };
        axios
          .post(validateRouteURI, validationPacket)
          .then(response => {
            resolve(Object.assign({ sessionID }, response.data));
          })
          .catch(err => reject(err));
      })
      .catch(err => reject(err));
  });
}

/**
 * Sends a POST request to the Rand McNalley Server using the getMiles URI.
 * Sends only the sessionID. If the session ID and associated route are both valid, Rand McNalley will respond with the Practical and HHG miles for the route.
 * @param {RouteData} routeData - only the sessionID is used.
 * @returns {Array.<number>} - Element 0 = HHG, Element 1 = PRACT
 */
export function getMiles (routeData) {
  return new Promise((resolve, reject) => {
    axios
      .post(getMilesURI, {
        routeData: {
          sessionID: routeData.sessionID
        }
      })
      .then(response => resolve(response.data))
      .catch(err => reject(err));
  });
}
