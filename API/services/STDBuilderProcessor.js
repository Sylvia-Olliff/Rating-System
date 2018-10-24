'use strict';
/**
 * Handles processing of lane entries submitted by the lane builder.
 * @module API/services/STDBuilderProcessor
 * @requires API/models/STDEntry.STDEntry
 * @requires API/db/dbConn.execInserts
 */

import { STDEntry } from '../models/STDEntry';
import { execInserts } from '../db/dbConn';

/**
 * Create an array of entries ready to write to the database using the raw data provided by the user.
 * @param {Object} param0 - anonymous object
 * @param {Object} settings - settings information for all lanes in this entry set.
 * @returns {Promise<Array.<STDEntry>>} - Array of [STDEntry]{@link module:API/models/STDEntry} instances
 */
function loadEntries ({ settings, readyEntries, mileageData }) {
  return new Promise(resolve => {
    if (settings.type !== 90) {
      const entries = [];
      readyEntries.forEach(entry => {
        entries.push(new STDEntry(Object.assign({ settings }, entry)));
      });
      resolve(entries);
    } else {
      const entries = [];
      const mileageDup = JSON.parse(JSON.stringify(mileageData));
      readyEntries.forEach(entry => {
        mileageData.forEach(miles => {
          mileageDup.forEach(miles2 => {
            const dataSet = Object.assign({ settings }, entry);
            dataSet.originData = Object.assign(dataSet.originData, miles);
            dataSet.destinationData = Object.assign(dataSet.destinationData, miles2);
            entries.push(new STDEntry(JSON.parse(JSON.stringify(dataSet))));
          });
        });
      });
      resolve(entries);
    }
  });
}

/**
 * Iterates through the prepared array of STDEntry Objects, gathering the formatted insert SQL string from each.
 * @param {Array.<STDEntry>} entries - Array of [STDEntry]{@link module:API/models/STDEntry} instances
 * @returns {Promise<Array.<string>>} - Array of insert SQL Strings.
 */
function insertEntries (entries) {
  if (!entries) return Promise.resolve();
  return new Promise(resolve => {
    const loadSet = [];
    entries.forEach(entry => {
      loadSet.push(entry.insert());
    });
    resolve(loadSet);
  });
}

/**
 * Middleware in Express application format. Used to handle processing requests related to building lanes
 * @param {Object} req - Express Request object. Contains information related to the origin of the request and the request itself
 * @param {*} res - Express Response object. Contains information related to this server and the response it will send.
 * @param {*} next - Callback function used to either move to the next middleware in line or to jump to the error handler.
 */
export function process (req, res, next) {
  loadEntries(req.body.entryData)
    .then(insertEntries)
    .then(execInserts)
    .then(() => next())
    .catch((err) => {
      next(err);
    });
}
