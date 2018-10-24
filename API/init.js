'use strict';
/**
 *  Application Initialization file
 *  Establishes global variables/functions as well as various tools, logging, and upload file temporary storage locations.
 *  Also initializes the Utilities set of tools
 *  @see [Utils]{@link module:API/services/Utils} - for more information on Utilities
 *  @module API/init
 *  @requires logger.logger
 *  @requires API/services/Utils.init
 *  @requires API/services/Authentication.init
 *  @requires {@link external:body-parser|body-parser}
 *  @requires {@link external:cookie-parser|cookie-parser}
 *  @requires {@link external:cors|cors}
 *  @requires {@link external:moment|moment}
 *  @requires {@link external:morgan|morgan}
 *  @requires {@link external:multer|multer}
 */
import morgan from 'morgan';
import moment from 'moment';
import { logger } from '../logger';
import multer from 'multer';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { init as UtilsInit } from './services/Utils';
import { init as Authenticator } from './services/Authentication';

/**
 * Establishes two new tokens for the morgan auto-logger.
 * 'user' displays the username of the user that submitted the request if it is known, otherwise shows a dash.
 * 'remote-addr' displays the simple IPv4 origin address for the request.
 */
morgan.token('user', (req, res) => {
  return (req.session) ? req.session.username : '-';
});
morgan.token('remote-addr', (req, res) => {
  return req.connection.remoteAddress.replace(/::ffff:/g, '');
});

/**
 * Multer upload object, used to handle files being uploaded. Multiple opload and storage objects can be created to save in multiple
 * locations based on which upload object is used.
 * !!WARNING!!: This is not currently in use, no portion of the Ratings System yet supports uploading of files. 
 */
const ratingUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, 'public/');
    },
    filename: (req, file, callback) => {
      callback(null, `ratingUpload-${moment(Date.now()).format()}`);
    }
  }),
  onError: (err, next) => {
    logger.log('error', err);
    next(err);
  }
});

/**
 *  Attaches usage logging, cookie-parser, body-parser, and initializes the Utility module to the Express app instance.
 *  Initializes the cors utility, this allows the server to accept requests from the same base address (communication between servers/services)
 *  Also establishes which routes are restricted, require elevation, and the base login route.
 *  @param   {Object} app - Express app instance
 *  @returns {Promise<Object>} app - Express app instance with global tools and configurations set.
 */
export function init (app) {
  return new Promise((resolve, reject) => {
    logger.log('debug', `Initializing Application tools`);

    app.use(morgan({
      stream: logger.stream,
      format: `[TRAFFIC] ORIGIN ADDR: :remote-addr | USER: :user | LOCATION: :method :url | STATUS CODE: :status - :response-time[3]ms`
    }));

    app.use(cookieParser());
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({
      limit: '50mb',
      extended: true
    }));

    app.use(cors({
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    }));

    const authOptions = {
      app,
      secureList: ['/Query/*', '/Builder/*', '/Maintenance/search', '/Maintenance/editSubmit', '/Maintenance/deleteSubmit'],
      authList: ['/Builder/*', '/Maintenance/editSubmit', '/Maintenance/deleteSubmit'],
      loginRoute: '/Auth/login',
      debug: false
    };

    UtilsInit()
      .then(() => { logger.log('debug', `Utilities have finished loading`); Promise.resolve(); })
      .then(Authenticator(authOptions))
      .then(() => {
        app.post('/Auth/login');
        logger.log('debug', `Authenticator initialized`);
        resolve(app);
      })
      .catch(err => reject(err));
  });
}

/**
 *  @global
 *  @typedef RouteData - All information pertaining to a given route, including information provided by the client, information received from Rand McNalley and the 400, and finally information calculated based on those results.
 *  @property {number}   sessionID - Rand McNalley Session ID
 *  @property {string}   orgCity - Origin City
 *  @property {string}   orgState - Origin State
 *  @property {string}   orgZip - Origin Zip
 *  @property {string}   orgCountry - Origin Country
 *  @property {string}   desCity - Destination City
 *  @property {string}   desState - Destination State
 *  @property {string}   desZip - Destination Zip
 *  @property {string}   desCountry - Destination Country
 *  @property {date}     date - Query Shipment Date
 *  @property {number}   [HHG] - User provided HHG miles (if route contains non-point types, this is required)
 *  @property {number}   [PRACT] - User provided Practical miles (if route contains non-point types, this is required)
 *  @property {string}   mode - Query Mode (LTL, REF, TLD, etc...)
 *  @property {string}   customer - Customer SCAC (Used by LTL)
 *  @property {string}   [orgCorrected] - If a list of possibles were sent, this is the selected one for origin
 *  @property {string}   [desCorrected] - If a list of possibles were sent, this is the selected one for destination
 *  @property {number}   [orgResponse] - Set to -1 if origin is not a point type, otherwise left undefined
 *  @property {number}   [desResponse] - Set to -1 if destination is not a point type, otherwise left undefined
 *  @property {Array.<Object>} [orgResponseList] - Set to an array of possible locations if origin was a point type and inaccurate, otherwise left undefined
 *  @property {string}   orgResponseList[].name - City Name
 *  @property {string}   orgResponseList[].county - County City is in
 *  @property {string}   orgResponseList[].state - State code
 *  @property {string}   orgResponseList[].zipCode - Zip code for this city
 *  @property {Array.<Object>} [desResponseList] - Set to an array of possible locations if destination was a point type and inaccurate, otherwise left undefined
 *  @property {string}   desResponseList[].name - City Name
 *  @property {string}   desResponseList[].county - County City is in
 *  @property {string}   desResponseList[].state - State code
 *  @property {string}   desResponseList[].zipCode - Zip code for this city
 *  @property {number}   [stopOffs] - Number of Stop Offs
 *  @property {Array.<Object>} shipDetails - Array of Objects containing nmfcClass and weights (Used by LTL)
 *  @property {number}   weight - total overall weight of shipment (Used by LTL)
 *  @property {string}   orgCounty - (INTERNAL) Origin County
 *  @property {string}   desCounty - (INTERNAL) Destination County
 *  @property {string}   typecheck - (INTERNAL) Short string representing the nature of the data provided by the user. for example: "CS_CS" = City, State to City, State
 *  @property {number}   calcHHG - (INTERNAL) HHG miles for route as provided by Rand McNalley
 *  @property {number}   calcPRACT - (INTERNAL) Practical miles for route as provided by Rand McNalley
 *  @property {object}   queryData - (INTERNAL) Tracking information and SQL string used to request applicable lanes from the 400
 *  @property {string}   queryData.query - (INTERNAL) SQL Query String
 *  @property {Object}   queryData.trackingData - (INTERNAL) Used for tracking usage and other metrics.
 *  @property {string}   queryData.trackingData.username - (INTERNAL) User who submitted the query
 *  @property {Object}   queryData.trackingData.route - (INTERNAL) Basic route information
 *  @property {string}   queryData.trackingData.route.orgCity - (INTERNAL) Origin City
 *  @property {string}   queryData.trackingData.route.orgState - (INTERNAL) Origin State
 *  @property {string}   queryData.trackingData.route.orgZip - (INTERNAL) Origin Zipcode
 *  @property {string}   queryData.trackingData.route.desCity - (INTERNAL) Destination City
 *  @property {string}   queryData.trackingData.route.desState - (INTERNAL) Destination State
 *  @property {string}   queryData.trackingData.route.desZip - (INTERNAL) Destination Zipcode
 */

/**
 *  @global
 *  @typedef authOptions - Options for the authentication module @see [Authentication]{@link module:API/services/Authentication}
 *  @property {Object} app - Express application object reference
 *  @property {Array.<string>} secureList - List of routes (supports glob syntax) that require the user be logged in to access
 *  @property {Array.<string>} authList - List of routes (supports glob syntax) that require the user be logged in and have elevated authority
 *  @property {string} loginRoute - Route to display the login page.
 *  @property {boolean} debug - enable logging by the authenticaiton module
 */

/**
 *  @global
 *  @typedef {Object} ErrorData - Expands on the standard NodeJS Error Object to include formatted messages for the user and for the administrator.
 *  @property {string} type - Type of Error that occured (see {@link https://nodejs.org/docs/latest-v4.x/api/errors.html} for list of error types for Node.JS v4.x [Our current NodeJS version, this will change by the end of 2018])
 *  @property {string} user - The currently logged in user for this request that generated the error
 *  @property {string} message - This is the message that was sent to the user in response to this error
 *  @property {string} adminMessage - This is the more detailed message that will be sent to Sysop
 *  @property {string} stack - This is the stack trace of where the error occured. (see link for Error Types for more information regarding stack traces)
 */

/**
 *  @global
 *  @typedef {Object} CustomerData - Describes a single customer. Mostly used for LTL.
 *  @property {string} code - Customer Code
 *  @property {string} name - Customer name
 *  @property {boolean} isLTL - Does the customer support LTL ?
 *  @property {number} numLTL - Number of LTL lanes listed for this customer (this will be updated to only list the number of currently active lanes for this customer)
 *  @property {boolean} FAK - If this customer supports LTL do they have a FAK range established? (this is required to make LTL queries for this customer)
 *  @property {number} numSTD - Number of Standard lanes listed for this customer [Currently all modes except LTL are considered Standard] (This will be updated to only show the number of currently active Standard lanes for this customer)
 */

/**
 * @global
 * @typedef {Object} NameData - A Carrier/Customer's name and SCAC code. Used to easily list/search available customers/carriers.
 * @property {string} name - Carrier/Customer's name
 * @property {string} code - Carrier/Customer's SCAC code
 */

/**
 * @global
 * @typedef {Object} RouteInfo - Basic routing information used by the Rand McNalley Server for route validation
 * @property {number} sessingID - Session ID provided by the Rand McNalley Server
 * @property {string} orgName - Origin City Name.
 * @property {string} orgCounty - Origin County Code (two characters) NOTE: This is used internally by Rand McNalley to help identify a point. This is not visible to the user.
 * @property {string} orgState - Origin State Code (two characters)
 * @property {string} desName - Destination City Name.
 * @property {string} desCounty - Destination County Code (two characters) NOTE: This is used internally by Rand McNalley to help identify a point. This is not visible to the user.
 * @property {string} desState - Destination State Code (two characters)
 */

/**
 * @global
 * @typedef {Object} Criteria - search criteria used by the maintenance processor. (NOTE: Status properties are used on the front-end only currently)
 * @property {Object} originData - contains search criteria based on route origin
 * @property {Object} originData.city - Contains data on the origin city
 * @property {string} originData.city.value - origin city name
 * @property {string} originData.city.status - origin city status
 * @property {Object} originData.state - Contains data on the origin state
 * @property {string} originData.state.value - origin state code
 * @property {string} originData.state.status - origin state status
 * @property {Object} originData.zipCode - Contains data on the origin zip code
 * @property {string} originData.zipCode.value - origin zip code
 * @property {string} originData.zipCode.status - origin zip code status
 * @property {Object} originData.country - Contains data on the origin country
 * @property {string} originData.country.value - origin country
 * @property {string} originData.country.status - origin country status
 * @property {Object} destinationData - contains search criteria based on route destination
 * @property {Object} destinationData.city - Contains data on the origin city
 * @property {string} destinationData.city.value - destination city name
 * @property {string} destinationData.city.status - destination city status
 * @property {Object} destinationData.state - Contains data on the destination state
 * @property {string} destinationData.state.value - destination state code
 * @property {string} destinationData.state.status - destination state status
 * @property {Object} destinationData.zipCode - Contains data on the destination zip code
 * @property {string} destinationData.zipCode.value - destination zip code
 * @property {string} destinationData.zipCode.status - destination zip code status
 * @property {Object} destinationData.country - Contains data on the destination country
 * @property {string} destinationData.country.value - destination country
 * @property {string} destinationData.country.status - destination country status
 * @property {Object} optionsData - contains non-point related search criteria
 * @property {number} optionsData.type - Numeric value associated with a Precedence (i.e. search for all city, state - city, state)
 * @property {string} optionsData.code - SCAC Code
 * @property {string} optionsData.mode - Trucking mode (CTR, TLD, etc...)
 * @property {number} optionsData.miles - Will display all lanes' whose mileage range straddle this number
 */

/**
 * @global
 * @typedef {Object} EntryObject - Represents a complete entry into the Rating Table
 * @property {Object} data - All data for a single entry in the Rating Table.
 * @property {Object} data.originData - data related to the origin point
 * @property {string} data.originData.state - two character state code
 * @property {string} data.originData.city - City name
 * @property {Object} data.originData.zip - zip code range object
 * @property {string} data.originData.zip.from - bottom of zip code range
 * @property {string} data.originData.zip.top - top of zip code range
 * @property {Object} data.destinationData - data related to the destination point
 * @property {string} data.destinationData.state - two character state code
 * @property {string} data.destinationData.city - City name
 * @property {Object} data.destinationData.zip - zip code range object
 * @property {string} data.destinationData.zip.from - bottom of zip code range
 * @property {string} data.destinationData.zip.top - top of zip code range
 * @property {Object} data.rateData - Monitary values used to calculate the cost/charge for this lane
 * @property {number} data.rateData.flatRate - Flat rate value
 * @property {number} data.rateData.ratePerMile - Rate Per Mile value
 * @property {number} data.rateData.minimumCharge - Minimum charge value
 * @property {Object} data.optionsData - additonal details related monitary values or user comments
 * @property {string} data.optionsData.fuelIncluded - Wether or not to calculate fuel charge. 'Y' for fuel is included don't calculate. 'N' if not.
 * @property {string} data.optionsData.note - Comments set by user for this particular lane
 * @property {Object} data.optionsData.miles - miles range object for miles dependent lanes
 * @property {number} data.optionsData.miles.from - bottom mileage range
 * @property {number} data.optionsData.miles.to - top mileage range
 * @property {Object} data.settings - data related to application or categorical values for this lane.
 * @property {number} data.settings.type - Lane type (Precedence)
 * @property {string} data.settings.mode - Tranportation type (Truckload, refer, etc...)
 * @property {string} data.settings.code - SCAC Code
 * @property {number} data.settings.effectiveFromDate - Date this lane becomes available
 * @property {number} data.settings.effectiveToDate - Date this lane stops being available
 * @property {string} data.settings.originCountry - Origin Country (country is stored here as it is a universal setting for searchs)
 * @property {string} data.settings.destinationCountry - Destination Country (country is stored here as it is a universal setting for searchs)
 */

/**
 * @global
 * @typedef {Object} RawLaneData - Data direct from AS400 Rating File. Unformated.
 * @property {number} RATYPE - Precedence Code (See {@link /config/default.json|config default.json} file for the name of the Precedence file for further details)
 * @property {number} RRN - Relative Record Number (This ensures that changes to this lane effect only this lane)
 * @property {string} RAMCDE - Transportation Mode (TLD, REF, CTR, etc...),
 * @property {string} RACODE - SCAC code,
 * @property {string} RAFDTE - Effective From Date,
 * @property {string} RAEDTE - Effective To Date,
 * @property {string} RAOCT - Origin Country,
 * @property {string} RAOST - Origin State two digit code,
 * @property {string} RAOCITY - Origin City,
 * @property {string} RAOFZIP - Origin From Zip code,
 * @property {string} RAOTZIP - Origin To Zip code,
 * @property {string} RADCT - Destination Country,
 * @property {string} RADST - Destination State two digit code,
 * @property {string} RADCITY - Destination City,
 * @property {string} RADFZIP - Destination From Zip code,
 * @property {string} RADTZIP - Destination To Zip code,
 * @property {string} RAFUEL - Lane Level Fuel Table (This functionality is not currently in use, but is available for easy implementation),
 * @property {number} RAPTOP - Flat Rate,
 * @property {number} RARPM - Rate per Mile,
 * @property {number} RAMC - Minimum Charge,
 * @property {string} RAFINCL - Is Fuel Included? ('Y'/'N'),
 * @property {string} RANOTE - Comment,
 * @property {number} RAFMILE - From Mile,
 * @property {number} RATMILE - To Mile,
 */

/**
 * @global
 * @typedef {Object} RawQuoteData - Data direct from AS400 Rating File. Mildly formatted via the [SQL]{@link module:API/models/selStrModel} string used to query the Database
 * @property {string} [CONTACT] - Name of contact (if it exists)
 * @property {string} [EMAIL] - Email address of contact
 * @property {boolean} ISCUST - Whether or not this quote is for a customer
 * @property {string} RACODE - SCAC Code
 * @property {string} RPCNAME - Name of Carrier/Customer
 * @property {number} [PHONE] - Phone number of contact
 * @property {number} [EXT] - extension for contact
 * @property {number} [stopOffs] - number of stop offs if any
 * @property {string|number} BASE - Base cost/charge (does not include any additional charges)
 * @property {string|number} FUELC - Fuel Charge if any
 * @property {string|number} TOTAL - Base + Fuel Charge (does not yet include stop offs)
 * @property {string|number} MILE - Miles for this particular quote
 * @property {string|number} RARPM - Rate Per Mile if one is set. At the level, this is only used to calculate stop off charges and display what data was used to calcualte the Base
 * @property {string} RANOTE - Any comments listed for this Lane
 */

/**
 * Allows the Rating System to make HTTP requests to other servers in a concise and easy to manage way.
 * @external axios
 * @see {@link https://www.npmjs.com/package/axios|axios}
 */

/**
 * Provides ECMAScript 2016 and 2017 functionality
 * @external babel-polyfill
 * @see {@link https://www.npmjs.com/package/@babel/polyfill|@babel/polyfill}
 */

/**
 * A Promise library that adds many useful tools to the standard Promise library. (Primarily used to easily make synchronous functions asynchronous)
 * @external bluebird
 * @see {@link https://www.npmjs.com/package/bluebird|bluebird}
 */

/**
 * Conveniently parses JSON objects from POST requests attaching them to req.body (a component of ExpressJS)
 * @external body-parser
 * @see {@link https://www.npmjs.com/package/body-parser|body-parser}
 */

/**
 * Use to retrieve settings information from a JSON file anywhere in the application (stored in config/default.json and config/production.json)
 * @external config
 * @see {@link https://www.npmjs.com/package/config|config}
 */

/**
 * Provides a local storage for persistant session data.
 * @external connect-loki
 * @see {@link https://www.npmjs.com/package/connect-loki|connect-loki}
 */

/**
 * similiar to the body-parser but for cookies
 * @external cookie-parser
 * @see {@link https://www.npmjs.com/package/cookie-parser|cookie-parser}
 */

/**
 * Allows Cross-Origin-Requests (this enables the use of a load balancer or POSTMAN tests)
 * @external cors
 * @see {@link https://www.npmjs.com/package/cors|cors}
 */

/**
 * NodeJS framework for easy handling of routing, middleware, and HTTP responses.
 * @external express
 * @see {@link https://www.npmjs.com/package/express|express}
 */

/**
 * Dynamic loading of routes into ExpressJS
 * @external express-load-routes
 * @see {@link https://www.npmjs.com/package/express-load-routes|express-load-routes}
 */

/**
 * integrates the loki session-store directly with ExpressJS
 * @external express-session
 * @see {@link https://www.npmjs.com/package/express-session|express-session}
 */

/**
 * IBM provided toolkit for connecting to the 400.
 * @external idb-connector
 * @see {@link https://www.npmjs.com/package/idb-connector|idb-connector}
 */

/**
 * local storage tool (can support multiple ways of storing information, Rating System uses a local .db file)
 * @external lokijs
 * @see {@link https://www.npmjs.com/package/lokijs|lokijs}
 */

/**
 * Saves computers from violent developers by making date and time formatting/manipulation bearable.
 * @external moment
 * @see {@link https://www.npmjs.com/package/moment|moment}
 */

/**
 * Provides sugar coating for time-zone based settings for moment.js
 * @external moment-timezone
 * @see {@link https://www.npmjs.com/package/moment-timezone|moment-timezone}
 */

/**
 * Request and Traffic based logging tool.
 * @external morgan
 * @see {@link https://www.npmjs.com/package/morgan|morgan}
 */

/**
 * Makes handling of uploaded files much more secure, straight-forward, and easy to expand upon.
 * @external multer
 * @see {@link https://www.npmjs.com/package/multer|multer}
 */

/**
 * current tool used to send automated emails. This will be updated to nodemailer along with the 400's update to V7R2
 * @external node4mailer
 * @see {@link https://www.npmjs.com/package/node4mailer|node4mailer}
 */

/**
 * Native NodeJS utility module. The Rating System currently only uses the format method from this module
 * @external util
 * @see {@link https://nodejs.org/docs/latest-v8.x/api/util.html#util_util|util}
 */

/**
 * Session and user authentication tool
 * @external passport
 * @see {@link https://www.npmjs.com/package/passport|passport}
 */

/**
 * integrates authentication cookie management into passport
 * @external passport-cookie
 * @see {@link https://www.npmjs.com/package/passport-cookie|passport-cookie}
 */

/**
 * sets the authentication schema for passport to simple username and password authentication
 * @external passport-local
 * @see {@link https://www.npmjs.com/package/passport-local|passport-local}
 */

/**
 * Headache inducing communication protocol/tool for communicating with SMC3 (LTL Trucking rates and information)
 * @external soap
 * @see {@link https://www.npmjs.com/package/soap|soap}
 */

/**
 * Real-time communication through the use of web-sockets. Not currently enabled but will send usage information and error reports to the Admin Server
 * @external socket.io
 * @see {@link https://www.npmjs.com/package/socket.io|socket.io}
 */

/**
 * Suite of various useful tools for sorting and other various ways of data-manipulation.
 * @external underscore
 * @see {@link https://www.npmjs.com/package/underscore|underscore}
 */

/**
 * low-level tool for creating unique session ids.
 * @external uuid
 * @see {@link https://www.npmjs.com/package/uuid|uuid}
 */

/**
 * detailed logging tool for manual logs. (primarily used for debugging)
 * @external winston
 * @see {@link https://www.npmjs.com/package/winston|winston}
 */
