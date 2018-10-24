'use strict';
/**
 *  Std Lane Builder Routes
 *  @alias BuilderRoutes
 *  @module API/routes/STDBuilder
 *  @requires API/services/STDBuilderProcessor.process
 *  @requires {@link external:express|express}
 */
import express from 'express';
import { process as Builder } from '../services/STDBuilderProcessor';

/**
 * Loads STD Builder routes into the application
 * @param {Object} app - Express application object reference @see {@link external:express|express}
 * @returns {Promise} - Empty resolve on success.
 */
export function addRoutes (app) {
  return new Promise((resolve, reject) => {
    const Router = express.Router();

    Router.get('/', (req, res) => {
      res.sendStatus(200);
    });

    Router.post('/submitEntryData', Builder, (req, res) => {
      res.sendStatus(200);
    });

    app.use('/Builder', Router);
    resolve();
  });
}
