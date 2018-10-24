'use strict';
/**
 * User Identification and verification tools
 * @module API/models/User
 * @requires API/db/dbConn.callPGM
 * @requires API/db/dbConn.execQuery
 * @requires {@link external:config|config}
 */
import { callPGM, execQuery } from '../db/dbConn';
import config from 'config';

/**
 * Translate error code responses from RPG Program VALIDUSRT
 * @param {string} code - error code
 */
const translate = (code) => {
  switch (code) {
    case 'CPF22E2':
      return 'Invalid password';
    case 'CPF2204':
      return 'User not found';
    case 'CPF22E3':
      return 'Profile disabled';
    case 'CPF22E4':
      return 'Password expired';
    default:
      return 'Unknown';
  }
};

/**
 * Verify that a user has provided the correct credentials and has access to this application.
 * @param {string} username - as400 username
 * @param {string} password - as400 password
 * @returns {Promise<Object>} - Either an Error code with appropriate message or user object containing username and authentication level
 */
export function verify (username, password) {
  return new Promise((resolve, reject) => {
    callPGM('VALIDUSR', [{ type: '10A', value: username }, { type: '10A', value: password }, { type: '15A', value: '' }])
      .then(response => {
        console.log(`Received response from DB: ${response}`);
        const code = response[2];
        if (code === '') return Promise.resolve({ success: true, username });
        else return Promise.resolve({ success: false, code });
      })
      .then(userObj => {
        console.log(`Checking userObj for successful login`);
        console.log(userObj);
        if (userObj.success) {
          console.log('login successful, validating user access');
          execQuery(`SELECT SEAUTH FROM QS36F.FSECF001 WHERE SEUSER = '${username}' AND SEPGM = '${config.get('KEYS.SECURITY_NAME')}'`)
            .then(results => {
              console.log('Received access results from DB');
              if (results.length > 0) resolve({ user: { name: username, auth: results[0].SEAUTH.trim() } });
              else resolve({ error: { code: 'AUTHORITY', message: 'You are not authorized to access this application. If you believe this to be in error, please contact Sysop at ext 351.' } });
            })
            .catch(err => reject(err));
        } else {
          console.log(`User failed to login succesfully`);
          resolve({ error: { code: 'INVALID', message: translate(userObj.code) } });
        }
      })
      .catch(err => reject(err));
  });
}

export function find (username) {
  return new Promise((resolve, reject) => {
    execQuery(`SELECT COUNT(AUTHORIZATION_NAME) as EXISTS FROM QSYS2.USER_INFO WHERE AUTHORIZATION_NAME='${username}'`)
      .then(results => resolve((results[0].EXISTS > 0)))
      .reject(err => reject(err));
  });
}
