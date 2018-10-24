'use strict';
/**
 * User authentication module.
 * Establishes a session store with user information and unique session IDs.
 * Intercepts all requested routes to verify user access using the following logic
 * 1. Is this the login route? Authenticate user credentials and request their elevation level from 400.
 * 2. Is this route on the secured list? If yes, verify that the user requesting this route is logged in, otherwise redirect to login page
 * 3. If user is logged in, check if this route is on the authorized only list, if yes, check that the user has the required elevation to access this path,
 * otherwise send response stating that the user is not authorized to access this area
 * 4. If none of the above apply, allow the request through as normal. (This is for static resources like images and css files)
 * @module API/services/Authentication
 * @requires API/models/User.verify
 * @requires {@link external:passport|passport}
 * @requires {@link external:passport-local|passport-local}
 * @requires {@link external:config|config}
 * @requires {@link external:moment|moment}
 * @requires {@link external:uuid|uuid}
 * @requires {@link external:express-session|express-session}
 * @requires {@link external:connect-loki|connect-loki}
 */
import { verify } from '../models/User';
import { Strategy as LocalStrategy } from 'passport-local';
import Passport from 'passport';
import config from 'config';
import moment from 'moment';
import genUUID from 'uuid';
import session from 'express-session';
import connectLoki from 'connect-loki';

const LokiStore = connectLoki(session);
const Store = new LokiStore({
  name: config.get('SYSTEM.SESSIONS.SESSION_STORE_NAME'),
  path: config.get('SYSTEM.SESSIONS.SESSION_STORE_PATH'),
  autosave: true,
  logErrors: (error) => {
    console.error(error);
  }
});

/**
 * Scan through a provided list of route strings, comparing to the current route string.
 * @param {Array.<string>} list - Array of route paths to validate against
 * @param {string} route - Currently requested route.
 * @returns {boolean} - true if the current route exists in the provided array, false if it does not.
 */
function accessScan (list, route) {
  for (let item of list) {
    if (item[item.length - 1] === '*') {
      let testString = item.slice(0, -1);
      if (route.toUpperCase().includes(testString.toUpperCase())) return true;
    } else {
      if (item === route) return true;
    }
  }
  return false;
}

/**
 * Establish Session tracking and Username/Password based Authentication
 * @param {!Object} options - options object used to initialize
 * @param {!Object} options.app - reference to Express App
 * @param {!string[]} options.secureList - List of routes that require user to be logged in
 * @param {string[]} [options.authList=false] - List of routes that require user to have elevated access (currently only supports one level of elevation)
 * @param {string} [options.loginRoute='/login'] - Login post route
 * @param {any} [options.authFlag='ALL'] - flag used to determine if user has elevated access
 * @param {string} [options.unAuthMessage='You are not authorized to access this area'] - Message to send to the user if they attempt to access an area requiring elevation and they are not elveated
 * @param {boolean} [options.allowGetLogin=false] - if true will allow a logged in user to access the login page. Otherwise requests to the login page from a logged in user will be redirected to the index page
 * @param {boolean} [options.debug=false] - if true will output logging messages to the console.
 * @param {Object} [options.logger=console] - if debug is true and this is set to a valid logger, authenticator will use this. Otherwise will be logger.log()
 */
export function init (options) {
  return new Promise(resolve => {
    if (!options.app || !options.secureList) throw new Error('Must provide at least express app and a list of secured paths');
    const app = options.app;
    const secured = options.secureList;
    const authorized = (options.authList) ? options.authList : false;
    const loginRoute = (options.loginRoute) ? options.loginRoute : '/login';
    const authFlag = (options.authFlag) ? options.authFlag : 'ALL';
    const unAuthMessage = (options.unAuthMessage) ? options.unAuthMessage : 'You are not authorized to access this area';
    const allowGetLogin = (options.allowGetLogin) ? options.allowGetLogin : false;
    const debug = (options.debug) ? options.debug : false;
    const logger = (options.debug && options.logger) ? options.logger : console;

    Passport.use(new LocalStrategy({ passReqToCallback: true },
      (req, username, password, done) => {
        if (debug) logger.log('Verifying User against DB2 database');
        verify(username, password)
          .then(result => {
            logger.log(result);
            if (!result.error) {
              let sessionUser = req.sessionStore.collection.find({ username: result.user.name });
              if (sessionUser.length > 0) {
                if (debug) logger.log(`found user by username`);
                req.sessionID = sessionUser[0].sid;
                req.session.username = sessionUser[0].username;
                req.session.auth = sessionUser[0].auth;
              } else {
                sessionUser = req.sessionStore.collection.find({ sid: req.sessionID });
                if (sessionUser.length > 0) {
                  if (debug) logger.log(`found user by SID`);
                  req.session.username = result.user.name;
                  req.session.auth = result.user.auth;
                  sessionUser[0].username = result.user.name;
                  sessionUser[0].auth = result.user.auth;
                } else {
                  if (debug) logger.log(`Couldn't find user session...`);
                  req.session.username = result.user.name;
                  req.session.auth = result.user.auth;
                  if (debug) logger.log(`Adding to Session store`);
                  req.sessionStore.collection.insert({ sid: req.sessionID, content: req.session, updatedAt: new Date() });
                }
              }
              done(null, { _id: req.sessionID, name: req.session.username, auth: req.session.auth });
            } else {
              done(null, { error: result.error });
            }
          })
          .catch((err) => {
            done(err, false);
          });
      }
    ));

    /**
     * Compresses user information to be stored as a cookie in the user's browser
     */
    Passport.serializeUser((user, done) => {
      done(null, user);
    });

    /**
     * Decompresses the cookie provided by the user's browser.
     */
    Passport.deserializeUser((user, done) => {
      done(null, user);
    });

    secured.map(item => (item[0] === '/') ? item : '/' + item);
    if (authorized) authorized.map(item => (item[0] === '/') ? item : '/' + item);

    /**
     * Directs the Express Application to use the session module.
     * Also establishes basic configurations and options for the session module.
     */
    app.use(session({
      secret: config.get('KEYS.SECRET'),
      genid: req => genUUID(),
      resave: false,
      store: Store,
      unset: 'keep',
      cookie: { maxAge: moment().add(1, 'days').diff(moment()), path: '/', sameSite: 'lax' },
      saveUninitialized: false
    }));

    /**
     * Directs the Express Application to use the initialize Passport module.
     */
    app.use(Passport.initialize());

    /**
     * Directs the Express Application to use the Passport Session module. (Allows the Passport Authentication module to interact with the session store)
     */
    app.use(Passport.session());

    /**
     * Directs the Express Application to use a middleware function.
     * This middleware function authenticates the request before it can reach any other routes (even routes that would otherwise be a 404).
     * If the request fails validation it will either be redirected to the login page or simply denied.
     * If the [Authentication]{@link API/services/Authentication} Module was initialized with the debug option set to true,
     * this middleware function will log detailed information about it's logical processes.
     */
    app.use((req, res, next) => {
      if (req.path.includes(loginRoute) && req.method === 'POST') {
        if (debug) logger.log(`Request to login recieved, verifying user: ${req.body.username}`);
        Passport.authenticate('local', (err, user) => {
          if (err) return next(err);
          if (user.error) {
            res.locals.error = user.error;
            res.send({ error: res.locals.error });
          } else {
            req.login(user, error => {
              if (error) return next(err);
              res.set('Set-Cookie', req.session.cookie);
              return res.send(req.session);
            });
          }
        })(req, res, () => {
          if (res.locals.error) res.send({ error: res.locals.error });
          else {
            res.set('Set-Cookie', req.session.cookie);
            res.send(req.session);
          }
        });
      } else if (!allowGetLogin && req.path === loginRoute && req.method === 'GET' && req.isAuthenticated && req.isAuthenticated()) {
        if (debug) logger.log(`Get request received for login route from user already authenticated, redirecting to index`);
        res.redirect('/');
      } else if (accessScan(secured, req.path)) {
        if (debug) logger.log(`${req.path} is restricted...`);
        if (req.isAuthenticated && req.isAuthenticated()) {
          if (debug) logger.log(`${req.session.username} authenticated`);
          if (authorized && accessScan(authorized, req.path)) {
            if (debug) logger.log(`${req.path} requires elevated privileges...`);
            if (req.session.auth !== authFlag) {
              if (debug) logger.log(`${req.session.username} is not authorized, aborting request, sending unauthorized message.`);
              res.send({ error: { type: 'UNAUTHORIZED', message: unAuthMessage } });
            } else {
              if (debug) logger.log(`${req.session.username} is authorized`);
              next();
            }
          } else {
            if (debug) logger.log(`${req.path} does not require elevation, granting access...`);
            next();
          }
        } else {
          res.send({ error: { type: 'UNAUTHENTICATED', message: 'Login session expired or not logged in' } });
        }
      } else {
        if (debug) logger.log(`${req.path} not on secured list, this request is not validated by authenticator!`);
        next();
      }
    });
    resolve();
  });
}
