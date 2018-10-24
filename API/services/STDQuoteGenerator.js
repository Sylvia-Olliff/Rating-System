/**
 * Quote Generator Module
 * Manages the Quote Generation process from generating and sending the query, handling early response conditions (failed validation for example),
 * and final creation of the Quote Table to send back to the client.
 * @module API/services/STDQuoteGenerator
 * @requires API/services/STDQueryProcessor.procQuery
 * @requires API/services/STDQueryProcessor.validateRoute
 * @requires API/services/STDQueryProcessor.calcMiles
 * @requires API/services/STDQueryProcessor.buildQuery
 * @requires API/services/STDQueryProcessor.typeCheck
 * @requires API/services/DataCleaner.standardDataCleaner
 * @requires API/servics/Utils.sendEmail
 * @requires logger.logger
 * @requires {@link external:config|config}
 */
'use strict';

import { procQuery, validateRoute, calcMiles, buildQuery, typeCheck } from './STDQueryProcessor';
import { standardDataCleaner as cleaner } from './DataCleaner';
import config from 'config';
import { logger } from '../../logger';
import { sendEmail } from './Utils';

/**
 * Log level ALL - If true, all types of debug logging will be enabled.
 */
const debugAll = config.get('SYSTEM.DEBUG_ALL');

/**
 * Log level Routing - If true, all routing related debug logging will be enabled
 */
const debugRoute = config.get('SYSTEM.DEBUG_ROUTING');

/**
 * Log Level IO - If true, all I/O related debug loggin will be enabled
 */
const debugIO = config.get('SYSTEM.DEBUG_IO');

/**
 * Array of property names that should exist in the data object sent by the client.
 * Used by the DataCleaner utility. @see {@link API/services/DataCleaner.standardDataCleaner} for more information
 */
const expectedStdDataFields = ['orgCity', 'orgState', 'orgZip', 'orgCountry', 'desCity', 'desState', 'desZip', 'desCountry', 'date', 'HHG',
  'PRACT', 'mode', 'stopOffs'];

/**
 * Array of property names that should be numeric values only
 * Used by the DataCleaner utility. @see {@link API/services/DataCleaner.standardDataCleaner} for more information
 */
const shouldBeNumFields = ['HHG', 'PRACT', 'stopOffs'];

/**
 * Express middleware for handling generate Quote requests from clients.
 * Cleans incoming data of any special/unknown characters and verifies that the minimum amount of information necessary to attempt to generate a quote table has been provided.
 * If an error occurs anywhere during this process it is caught, transformed to include a message for the user and a message for admins,
 * and then finally an email is sent (if in production) and a response sent to the user
 * @see {@link https://expressjs.com/en/guide/writing-middleware.html} for more information on Express middleware
 * @param {Object} req - Express request object @see {@link https://expressjs.com/en/4x/api.html#req|request} for more information
 * @param {Object} res - Express response object @see {@link https://expressjs.com/en/4x/api.html#res|response} for more information
 * @param {function} next - Express middleware callback function. @see {@link https://codeburst.io/javascript-what-the-heck-is-a-callback-aba4da2deced|callbacks} for more information on callback functions
 */
export function genQuote (req, res, next) {
  if (debugAll || debugRoute) {
    logger.log('debug', `validating Route`);
  }
  if (debugAll || debugIO) {
    logger.log('debug', req.body.routeData);
  }
  cleaner(req.body.routeData, { expected: expectedStdDataFields, isNum: shouldBeNumFields })
    .then(typeCheck)
    .then(validateRoute)
    .then((routeData) => {
      let listData = {};
      if (routeData.orgResponseList) {
        listData.orgList = routeData.orgResponseList;
      }
      if (routeData.desResponseList) {
        listData.desList = routeData.desResponseList;
      }
      if (Object.keys(listData).length > 0) {
        res.send(listData);
      } else {
        calcMiles(routeData)
          .then(buildQuery)
          .then(procQuery)
          .then(quoteTable => {
            res.locals.quoteTable = quoteTable;
            next();
          });
      }
    })
    .catch((error) => {
      logger.log('error', error);
      const errorData = config.get('ERROR_MESSAGES.COMMUNICATION.RAND_MCNALLEY');
      errorData.user = (req.session) ? req.session.user : null;
      errorData.stack = error.stack;
      sendEmail({ errorData }).catch((error) => { throw error; });
      if (res.locals.error) res.send({error: res.locals.error});
      else res.send(errorData);
    });
}
