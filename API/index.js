/**
 * Loads the API consisting of routes, services, and utilities.
 * This also includes any data loaded at server start.
 * @module API/index
 * @requires logger.logger
 * @requires API/routes/index.init
 * @requires API/init.init
 * @requires {@link external:bluebird|bluebird}
 */
'use strict';

import { init as loadSettings } from './init';
import { logger } from '../logger';
import { loadRoutes } from './routes';
import Promise from 'bluebird';
global.Promise = Promise;

/**
 * API function loads the API and all of its resources
 * @param {Object} app - Express application reference.
 * @return {Promise<Object>} app - Express application reference with settings and routes loaded.
 */
export function API (app) {
  return new Promise((resolve, reject) => {
    loadSettings(app)
      .then(loadRoutes)
      .then(() => {
        app.use(function (err, req, res, next) {
          logger.log('error', `ERROR: ${err.message}\nSTACK: ${err.stack}`);
          res.status(500).send({ errorMessage: 'Server-side error' });
        });

        resolve(app);
      })
      .catch(err => reject(err));
  });
}
