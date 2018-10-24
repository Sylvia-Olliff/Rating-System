'use strict';
/**
 * Std Lane Maintenance Routes
 * @alias MaintenanceRoutes
 * @module API/routes/STDMaintenance
 * @requires API/services/Utils.getCustomers
 * @requires API/services/Utils.getPrecs
 * @requires API/services/Utils.getCarriers
 * @requires API/services/STDMaintenanceProcessor.processor
 * @requires {@link external:express|express}
 */
import { getCustomers, getPrecs, getCarriers } from '../services/Utils';
import { processor } from '../services/STDMaintenanceProcessor';
import express from 'express';

/**
 * Loads STD Maintenance routes into the application
 * @param {Object} app - Express application object reference @see {@link external:express|express}
 * @returns {Promise} - Empty resolve on success.
 */
export function addRoutes (app) {
  return new Promise(resolve => {
    const Router = express.Router();

    Router.get('/getCustomers', (req, res) => {
      res.send(getCustomers());
    });

    Router.get('/getPrecs', (req, res) => {
      res.send(getPrecs());
    });

    Router.get('/getCarriers', (req, res) => {
      res.send(getCarriers());
    });

    Router.post('/search', processor('search'), (req, res) => {
      res.send(res.locals.response);
    });

    Router.post('/editSubmit', processor('edit'), (req, res) => {
      if (res.locals.success) res.sendStatus(200);
      else res.sendStatus(500);
    });

    Router.post('/deleteSubmit', processor('delete'), (req, res) => {
      if (res.locals.success) res.sendStatus(200);
      else res.sendStatus(500);
    });

    app.use('/Maintenance', Router);
    resolve();
  });
}
