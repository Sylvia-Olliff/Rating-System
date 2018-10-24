'use script';
/**
 * Quote Generation Routes
 * @alias QuotesRoutes
 * @module API/routes/STDQuotes
 * @requires API/services/STDQuoteGenerator.genQuote
 * @requires {@link external:express|express}
 */
import { genQuote } from '../services/STDQuoteGenerator';
import express from 'express';

/**
 * Loads Quote Generation routes into the application
 * @param {Object} app - Express application object reference @see {@link external:express|express}
 * @returns {Promise} - Empty resolve on success.
 */
export function addRoutes (app) {
  return new Promise((resolve, reject) => {
    const Router = express.Router();

    Router.get('/', (req, res) => {
      res.sendStatus(200);
    });

    Router.post('/genQuote', genQuote, (req, res) => {
      // process.exit(1);
      res.send(res.locals.quoteTable);
    });

    app.use('/Quotes', Router);
    resolve();
  });
}
