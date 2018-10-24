/**
 * Server entry point.
 * Listens on SYSTEM.PORT defined in configuration file
 * @module bin/www/server
 * @requires logger.logger
 * @requires API/index
 * @requires API/services/Utils.sendEmail
 * @requires {@link external:config|config}
 * @requires {@link external:express|express}
 * @requires {@link external:http|http}
 */

'use strict';

import '@babel/polyfill';
import { logger } from '../../logger';
import express from 'express';
import config from 'config';
import http from 'http';
import { API } from '../../API';
import { sendEmail } from '../../API/services/Utils';

const app = express();

/**
 * Initializes the API.
 * Sets the Server object.
 * Pulls the port number from the appropriate config file.
 * Tells the server to start listening for requests.
 * Logs that the server has finished loading and is now listening on the defined port number.
 * If the environment is production an automated email is sent to (currently joe_olliff@rogers-brown.com but this can be changed via config file).
 * This is done as a potential warning that an error might have occured if one wasn't reported.
 */
API(app)
  .then(app => {
    const server = http.createServer(app);

    const port = config.get('SYSTEM.PORT');

    server.listen(port);
    logger.log('info', `Rating System listening on port ${port}`);

    const message = {
      to: 'joe_olliff@rogers-brown.com',
      subject: 'Message From Rating System',
      body: '<p>The Server was just started. If you did not do this, check the logs, it is likely recovering from a crash</p>',
      isMessage: true
    };

    if (process.env.NODE_ENV === 'production') {
      sendEmail(message, (err, success) => {
        if (err) {
          logger.log('error', err);
        }
      });
    }
  })
  .catch(err => {
    logger.log('debug', `Error Loading Rating System`);
    logger.log('error', err);
  });
