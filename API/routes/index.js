/* globals import */
/* eslint disable */
'use strict';
/**
 * Dynamically loads all route files in the routes folder.
 * @alias RouteLoader
 * @module API/routes/index
 * @requires API/services/Utils.sendEmail
 * @requires logger.logger
 * @requires {@link external:fs|fs}
 * @requires {@link external:bluebird|bluebird}
 */
import { sendEmail } from '../services/Utils';
import { logger } from '../../logger';
import fs from 'fs';
import Promise from 'bluebird';

Promise.promisifyAll(fs);

export function loadRoutes (app) {
  return new Promise((resolve, reject) => {
    app.post('/Auth/logout', (req, res) => {
      if (req.logout) req.logout();
      res.sendStatus(200);
    });

    app.post('/report', (req, res) => {
      logger.log('debug', req.body);
      res.sendStatus(200);
    });

    fs.readdirAsync(__dirname)
    .then(async (files) => {
      files = files.filter(fileName => (fileName !== 'index.js'));
      await files.forEach(async (fileName) => {
        const router = await import(`./${fileName}`);
        await router.addRoutes(app);
        logger.log('debug', `Routes for ${fileName} loaded`);
      });

      app.use((err, req, res, next) => {
        logger.log('error', err);
        const errorData = Object.assign({ type: 'Server', message: 'Internal Server Error occured, Sysop has been contacted'}, err);
        sendEmail({ errorData });
        if (res.headsSent) return next(err);
        res.status(500).send({ errorData });
      })

      resolve();
    })
    .catch(err => reject(err));
  })
}
