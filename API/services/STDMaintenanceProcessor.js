/**
 * Maintenance Processor - Handles all C.R.U.D. functions for standard lane maintenance.
 * @module API/services/STDMaintenanceProcessor
 * @requires API/db/dbConn.execQuery
 * @requires API/models/STDLane
 * @requires {@link external:config|config}
 * @requires {@link external:moment|moment}
 */
'use strict';

import config from 'config';
import moment from 'moment';
import { execQuery } from '../db/dbConn';
import { STDLane } from '../models/STDLane';
import { logger } from '../../logger';

/**
 * Generates the WHERE clause for the SQL Query against the Rating Table based off of the values in the provided Criteria object
 * @param {Criteria} criteria
 * @returns {string} - WHERE clause string
 */
function whereClause (criteria) {
  logger.debug(criteria);
  if (Object.keys(criteria).length > 0) {
    const whereStr = `WHERE
      ${(criteria.originData.city.value) ? `RAOCITY = '${criteria.originData.city.value}' AND ` : ''}
      ${(criteria.originData.state.value) ? `RAOST = '${criteria.originData.state.value}' AND ` : ''}
      ${(criteria.originData.zipCode.value) ? `RAOFZIP <= '${criteria.originData.zipCode.value}' AND RAOTZIP >= '${criteria.originData.zipCode.value}' AND ` : ''}
      ${(criteria.originData.country.value) ? `RAOCT = '${criteria.originData.country.value}' AND ` : ''}
      ${(criteria.destinationData.city.value) ? `RADCITY = '${criteria.destinationData.city.value}' AND ` : ''}
      ${(criteria.destinationData.state.value) ? `RADST = '${criteria.destinationData.state.value}' AND ` : ''}
      ${(criteria.destinationData.zipCode.value) ? `RADFZIP <= '${criteria.destinationData.zipCode.value}' AND RADTZIP >= '${criteria.destinationData.zipCode.value}' AND ` : ''}
      ${(criteria.destinationData.country.value) ? `RADCT = '${criteria.destinationData.country.value}' AND ` : ''}
      ${(criteria.optionsData.effectiveDate) ? `RAEDTE >= '${moment(criteria.optionsData.effectiveDate).format('YYYYMMDD')}' AND RAFDTE <= '${moment(criteria.optionsData.effectiveDate).format('YYYYMMDD')}' AND ` : ''}
      ${(criteria.optionsData.type) ? `RATYPE = '${criteria.optionsData.type}' AND ` : ''}
      ${(criteria.optionsData.code) ? `RACODE = '${criteria.optionsData.code}' AND ` : ''}
      ${(criteria.optionsData.mode) ? `RAMCDE = '${criteria.optionsData.mode}' AND ` : ''}
      ${(criteria.optionsData.miles) ? `RAFMILE <= '${criteria.optionsData.miles}' AND RATMILE >= '${criteria.optionsData.miles}' AND ` : ''}
      `;
    return whereStr.trim().slice(0, -3);
  } else {
    return '';
  }
}

/**
 * Retrieves lane data from the 400 that fit the provided criteria.
 * @param {Criteria} criteria
 * @param {Object} options - options object
 * @param {number} options.limit - limit the number of records that can be returned. (NOTE: if this option is not set the default value in config will be used.)
 * @returns {Promise<Array.<module:API/models/STDLane>>}
 */
function getLanes (criteria, options) {
  return new Promise((resolve, reject) => {
    if (!options) options = {};
    const selectStr = `
      SELECT DISTINCT RRN(${config.get('SYSTEM.DB.FILES.STD_LANES')}) as RRN, RATYPE, RAMCDE, RACODE, 
      RAFDTE, RAEDTE, RAOCT, RAOST, RAOCITY, RAOFZIP, RAOTZIP, RADCT, RADST, RADCITY, RADFZIP, RADTZIP, 
      RAFUEL, RAPTOP, RARPM, RAMC, RAFINCL, RANOTE, RAFMILE, RATMILE FROM ${config.get('SYSTEM.DB.FILES.STD_LANES')}
       ${whereClause(criteria)} FETCH FIRST ${options.limit ? options.limit : config.get('SETTINGS.POP_LIMIT')} ROWS ONLY`;
    execQuery(selectStr)
      .then(results => {
        if (results.length > 0) {
          const lanes = [];
          results.forEach(result => {
            lanes.push(new STDLane(result));
          });
          resolve(lanes);
        } else {
          resolve({ error: config.get('ERROR_MESSAGES.SQL.NO_RESULTS.OK') });
        }
      })
      .catch(err => reject(err));
  });
}

/**
 * Submits the new values for an existing lane.
 * @param {module:API/models/STDLane} lane - Individual lane data.
 * @returns {Promise} - empty resolve on success
 */
function editLane (lane) {
  return new Promise((resolve, reject) => {
    const updateStr = `UPDATE ${config.get('SYSTEM.DB.FILES.STD_LANES')} SET 
      RAMCDE = '${lane.mode}',
      RACODE = '${lane.code}', 
      RAFDTE = ${moment(lane.effectiveFromDate).format('YYYYMMDD')},
      RAEDTE = ${moment(lane.effectiveToDate).format('YYYYMMDD')},
      RAOCT = '${lane.originCountry}',
      RAOST = '${lane.originState}',
      RAOCITY = '${lane.originCity}',
      RAOFZIP = '${(lane.originZipRange && lane.originZipRange !== ' ') ? lane.originZipRange.split('-')[0].trim() : ''}',
      RAOTZIP = '${(lane.originZipRange && lane.originZipRange !== ' ') ? lane.originZipRange.split('-')[1].trim() : ''}',
      RADCT = '${lane.destinationCountry}',
      RADST = '${lane.destinationState}',
      RADCITY = '${lane.destinationCity}',
      RADFZIP = '${(lane.destinationZipRange && lane.destinationZipRange !== ' ') ? lane.destinationZipRange.split('-')[0].trim() : ''}',
      RADTZIP = '${(lane.destinationZipRange && lane.destinationZipRange !== ' ') ? lane.destinationZipRange.split('-')[1].trim() : ''}',
      RAFUEL = '${(lane.fuelTable === 'default') ? '' : lane.fuelTable}',
      RAPTOP = ${(lane.flatRate) ? lane.flatRate : 0.0},
      RARPM = ${(lane.ratePerMile) ? lane.ratePerMile : 0.0},
      RAMC = ${(lane.minimumCharge) ? lane.minimumCharge : 0.0}, 
      RAFINCL = '${(lane.fuelIncluded) ? 'Y' : 'N'}',
      RANOTE = '${lane.note}',
      RAFMILE = ${lane.mileageRangeFrom},
      RATMILE = ${lane.mileageRangeTo}
      WHERE RRN(${config.get('SYSTEM.DB.FILES.STD_LANES')}) = ${lane.recordNum} with NC`;

    execQuery(updateStr)
      .then(() => { resolve(); })
      .catch(err => reject(err));
  });
}

/**
 * Deletes a lane from the 400 based on record number (Yes Tammy I do know how those work ;) )
 * This uses the record number to avoid problems with duplicate lanes
 * @param {number} recordNum - the record number to delete
 * @returns {Promise} - empty resolve on success
 */
function deleteLane (recordNum) {
  return new Promise((resolve, reject) => {
    const deleteStr = `DELETE FROM ${config.get('SYSTEM.DB.FILES.STD_LANES')} WHERE RRN(${config.get('SYSTEM.DB.FILES.STD_LANES')}) = ${recordNum} with NC`;

    execQuery(deleteStr)
      .then(() => { resolve(); })
      .catch(err => reject(err));
    resolve();
  });
}

/**
 * Creates a middlewhere function based on the type of request.
 * @param {string} type - type of request being made
 * @returns {function} - middlewhere function.
 * @see {@link https://expressjs.com/en/guide/writing-middleware.html|Express Middlewhere}
 */
export function processor (type) {
  switch (type) {
    case 'search':
      return function (req, res, next) {
        let searchObj = req.body.searchObj;
        if (!searchObj) searchObj = {};
        getLanes(searchObj.criteria, searchObj.options)
          .then(lanes => {
            res.locals.response = lanes;
            next();
          })
          .catch(err => next(err));
      };
    case 'edit':
      return function (req, res, next) {
        let lane = req.body.laneData;
        editLane(lane)
          .then(() => {
            res.locals.success = true;
            next();
          })
          .catch(err => next(err));
      };
    case 'delete':
      return function (req, res, next) {
        let recordNum = req.body.recordNum;
        deleteLane(recordNum)
          .then(() => {
            res.locals.success = true;
            next();
          })
          .catch(err => next(err));
      };
    default:
      return function (req, res, next) {
        next(new Error('Invalid Maintenance Process Type...'));
      };
  }
}
