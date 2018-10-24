/**
 * Winston based logging tool.
 * if in production or test environment logs are written to file, otherwise logs are written to the console. blah
 * @module logger
 * @requires API/services/Utils
 * @requires {@link external:fs|fs}
 * @requires {@link external:moment-timezone|moment-timezone}
 * @requires {@link external:winston|winston}
 */
'use strict';

import { createLogger, format, transports } from 'winston';
import moment from 'moment-timezone';
import fs from 'fs';
import { mapToJSON } from './API/services/Utils';

const { combine, timestamp, printf, prettyPrint } = format;

const filterHealthCheck = format((info, opts) => {
  if (typeof info.message === 'string' && info.message.indexOf(' / ') !== -1) return false;
  return info;
});

const formatObjectsToStrings = format((info, opts) => {
  if (info.message instanceof Map) {
    info.message = JSON.stringify(mapToJSON(info.message));
  } else if (info.message instanceof Object) {
    info.message = JSON.stringify(info.message);
  }
  return info;
});

const customFormat = printf(info => {
  return `${moment().tz('America/New_York').format()} [${info.level}]: ${info.message}`;
});

const _logger = createLogger({
  format: customFormat
});

if (process.env.NODE_ENV !== 'production') {
  _logger.add(new transports.Console({
    format: combine(
      filterHealthCheck(),
      formatObjectsToStrings(),
      format.colorize(),
      customFormat
    ),
    level: 'debug'
  }));
} else {
  _logger.add(new transports.File({
    filename: './logs/errors.log',
    level: 'error',
    format: format.json()
  }));
  _logger.add(new transports.Console({
    format: combine(
      filterHealthCheck(),
      formatObjectsToStrings(),
      customFormat
    ),
    level: 'info'
  }));
}

_logger.stream = {
  write (msg, encoding) {
    _logger.log('info', msg.replace(/(\n)/g, ''));
  }
};

/**
 * Detects if a logs directory exists, if it does it logs that the logs Directory exists.
 * If it does not, it is created and then it logs that the directory didn't exist and so was created.
 * NOTE: This will always happen in development as the ./dist directory is destroyed and recreated each time.
 */
fs.access('./logs', (err) => {
  if (err && err.errno === -2) {
    fs.mkdir('./logs', (error) => {
      if (!error) {
        _logger.log('debug', `Logs directory did not exist and so was created`);
      } else {
        _logger.log('error', error);
      }
    });
  } else if (!err) {
    if (process.env.NODE_ENV !== 'test') {
      _logger.log('debug', `Logs Directory exists`);
    }
  } else {
    _logger.log('error', err);
  }
});

export const logger = _logger;
