'use strict';
/* eslint-disable */
/**
 * Handles DB Connections with 400.
 * Can execute RPG programs and parse the responses. (uses the xml service engine see [idb-connector]{@link https://www.ibm.com/developerworks/community/wikis/home?lang=en#!/wiki/IBM%20i%20Technology%20Updates/page/DB2%20for%20i%20Access%20APIs%20-%20New} for more information)
 * Can execute SQL Statements and parse the responses
 * @module API/db/dbconn
 * @requires {@link external:idb-connector|idb-connector}
 * @requires {@link external:bluebird|bluebird}
 */
import DB from 'idb-connector';
import Promise from 'bluebird'; // Not manditory

/**
 * Initial command string to use the XMLService to call native applications on the 400 (this includes RPG, CL, and other languages)
 * @constant
 * @type {string}
 * @default
 */
const PGM_SQL_CALL = 'CALL QXMLSERV.iPLUG512K(?,?,?,?)';

/**
 * Translates parameter description values into appropriate XML elements
 * @param {Object} parms - description of each parameter to be passed to the AS400 native program 
 * @param {string} parms.type - data type (zoned, character, varchar, etc...)
 * @param {string} parms.value - actual value of the parameter
 */
function translateParms (parms) {
  let parmStr = '';
  parms.forEach(parm => {
      parmStr += `<parm><data type="${parm.type}">${parm.value}</data></parm>`;
  });
  return parmStr;
}

/**
 * Establishes a seperate connection for each submitted CRUD process. 
 * This is because the native DB2 driver is not currently thread safe for the creation of multiple statements per connection.
 * As the connection is IPC this is of little performance concern. 
 * @param {Object} data - data object that tools will be attached to as it moves down the line
 * @param {String} data.sql - SQL Statement string
 * @returns {Promise<Object>} - data object with connection object attached
 */
function connect (data) {
  const conn = new DB.dbconn();
  conn.conn('*LOCAL');
  return Promise.resolve(Object.assign(data, { conn }));
}

/**
 * Generates a new statement object for the given connection
 * @param {Object} data - data object that tools will be attached to as it moves down the line
 * @param {String} data.sql - SQL Statement string
 * @param {Object} data.conn - connection object
 * @returns {Promise.<Object>} - data object with statement object attached
 */
function genStatement (data) {
  return Promise.resolve(Object.assign(data, { stmt: new DB.dbstmt(data.conn) }));
}

/**
 * Executes the SQL string using the statement created for this connection.
 * Upon response the statement is closed, the connection disconnect, and the connection object closed before handling any errors.
 * @param {Object} data - data object that tools will be attached to as it moves down the line
 * @param {String} data.sql - SQL Statement string
 * @param {Object} data.conn - connection object
 * @param {Object} data.stmt - statement object
 * @returns {Promise.<Object>} - data object containing the results of the query.
 */
function runScript (data) {
  return new Promise((resolve, reject) => {
    data.stmt.exec(data.sql, (response, error) => {
      data.stmt.close();
      data.conn.disconn();
      data.conn.close();
      if (error) reject(error);
      resolve({ response });
    });
  });
}

/**
 *  Execute single SQL statement
 * @param {string} sql - SQL String 
 * @returns {Promise}
 * @returns {object[]|error}
 */
export function execQuery (sql) {
  return new Promise((resolve, reject) => {
    connect({ sql })
      .then(genStatement)
      .then(runScript)
      .then(data => {
        resolve(data.response);
      })
      .catch(err => reject(err));
  });
}

/**
 * Execute a large number of inserts concurrently
 * @param {Array.<String>} sqlArray - Array of INSERT strings
 * @returns {Promise<Array.<null|Error>>} - returns an array of either null values if insert succesfful or errors for any insert that was not successful.
 */
export function execInserts (sqlArray) {
  if (!sqlArray) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const inserts = sqlArray.map(sql => {
      return new Promise(resolve => {
        connect({ sql }).then(genStatement).then(runScript).then(data => resolve(data.response)).catch(err => resolve(err));
      });
    });
    Promise.all(inserts)
      .then(results => {
        resolve(results);
      })
      .catch(err => reject(err));
  });
}

/**
 * Allows any application that includes this module to call any native program on the 400 using the XMLService Engine.
 * @param {string} pgm - name of the program to be called. If not in *LIBL the name should be in format "<library>.<program name>" (Period **NOT** slash)
 * @param {Array.<Object>} parms - array of parameter descriptions 
 */
export function callPGM (pgm, parms) {
  return new Promise((resolve, reject) => {
    connect({ sql: PGM_SQL_CALL })
      .then(genStatement)
      .then(connData => {
        const ipc = '*NA';
        const ctl = '*here';
        let xmlIn = `<xmlservice><pgm name='${pgm}'>`;
        if (parms) {
          xmlIn += translateParms(parms);
        }
        xmlIn += `</pgm></xmlservice>`;
        let xmlOut;
        connData.stmt.prepare(connData.sql, () => {
          connData.stmt.bindParam([
            [ipc, DB.SQL_PARAM_INPUT, 1],
            [ctl, DB.SQL_PARAM_INPUT, 1],
            [xmlIn, DB.SQL_PARAM_INPUT, 0],
            [xmlOut, DB.SQL_PARAM_OUTPUT, 0]
          ], () => {
            connData.stmt.execute(response => {
              const respData = [];
              const rawData = response[0].split('\n');
              rawData.forEach(item => {
                if (item.indexOf('data') !== -1) {
                  respData.push(item.replace(/<[^>]*>/g, ''));
                }
              });
              connData.stmt.close();
              connData.conn.disconn();
              connData.conn.close();
              resolve(respData);
            });
          });
        });
      })
      .catch(err => reject(err));
  });
}