'use strict';
import config from 'config';

/**
 * Contains various strings and a function used to build the WHERE clause of Rating queries.
 * LEGEND:
 * C - City
 * S - State
 * Z - Zip
 * i.e. CS_CS = City, State to City, State.
 * @module API/models/whrStrModel
 * @requires {@link external:config|config}
 */

let CS_CS;
let Z_Z;
let Z_CS;
let CS_Z;
let CS_S;
let S_CS;
let S_Z5;
let S_Z3;
let Z3_S;
let S_S;
let SZ_SZ;

/**
 * Initializes where clause components with values from the provided Route Data and Precedences
 * @param {RouteData} routeData - Route Data Object
 * @param {Array.<string, number>} precs - Array of Precedence Values and Names
 */
const initValues = (routeData, precs) => {
  CS_CS = `(( RAOCITY = '${routeData.orgCity}' AND RAOST = '${routeData.orgState}') AND ( RADCITY = '${routeData.desCity}' AND RADST ='${routeData.desState}') 
                   AND (RATYPE = ${precs['CITY,ST TO CITY,ST']} OR RATYPE = ${precs['MILEAGE']}))`;

  /**
   * Generates Zip code portion of the where clause
   * @returns {string} - SQL String (WHERE)
   */
  Z_Z = () => {
    const orgLen = routeData.orgZip.length;
    const desLen = routeData.desZip.length;

    let zipStr = '';

    if (orgLen === 6) {
      zipStr += `(((RAOFZIP <= '${routeData.orgZip}' AND RAOTZIP >= '${routeData.orgZip}') OR 
                  (RAOFZIP <= '${routeData.orgZip.substr(0, 5)}' AND RAOTZIP >= '${routeData.orgZip.substr(0, 5)}') OR
                  (RAOFZIP <= '${routeData.orgZip.substr(0, 3)}' AND RAOTZIP >= '${routeData.orgZip.substr(0, 3)}')) AND `;
    } else if (orgLen === 5) {
      zipStr += `(((RAOFZIP <= '${routeData.orgZip}' AND RAOTZIP >= '${routeData.orgZip}') OR 
                  (RAOFZIP <= '${routeData.orgZip.substr(0, 3)}' AND RAOTZIP >= '${routeData.orgZip.substr(0, 3)}')) AND `;
    } else {
      zipStr += `((RAOFZIP <= '${routeData.orgZip}' AND RAOTZIP >= '${routeData.orgZip}') AND `;
    }

    if (desLen === 6) {
      zipStr += `((RADFZIP <= '${routeData.desZip}' AND RADTZIP >= '${routeData.desZip}') OR 
                  (RADFZIP <= '${routeData.desZip.substr(0, 5)}' AND RADTZIP >= '${routeData.desZip.substr(0, 5)}') OR
                  (RADFZIP <= '${routeData.desZip.substr(0, 3)}' AND RADTZIP >= '${routeData.desZip.substr(0, 3)}')) AND 
                  (RATYPE = ${precs['ZIP(6) TO ZIP(6)']} OR RATYPE = ${precs['ZIP(6) TO ZIP(3)']} OR 
                   RATYPE = ${precs['ZIP(3) TO ZIP(6)']} OR RATYPE = ${precs['MILEAGE']})) `;
    } else if (desLen === 5) {
      zipStr += `((RADFZIP <= '${routeData.desZip}' AND RADTZIP >= '${routeData.desZip}') OR 
                  (RADFZIP <= '${routeData.desZip.substr(0, 3)}' AND RADTZIP >= '${routeData.desZip.substr(0, 3)}')) AND
                   (RATYPE = ${precs['ZIP(6) TO ZIP(6)']} OR RATYPE = ${precs['ZIP(6) TO ZIP(3)']} OR 
                   RATYPE = ${precs['ZIP(3) TO ZIP(6)']} OR RATYPE = ${precs['MILEAGE']})) `;
    } else {
      zipStr += `(RADFZIP <= '${routeData.desZip}' AND RADTZIP >= '${routeData.desZip}') AND 
                  (RATYPE = ${precs['ZIP(6) TO ZIP(6)']} OR RATYPE = ${precs['ZIP(6) TO ZIP(3)']} OR 
                   RATYPE = ${precs['ZIP(3) TO ZIP(6)']} OR RATYPE = ${precs['MILEAGE']})) `;
    }

    return zipStr;
  };

  Z_CS = `((RAOFZIP <='${routeData.orgZip.substr(0, 3)}' AND RAOTZIP >= '${routeData.orgZip.substr(0, 3)}') AND
                  (RADCITY = '${routeData.desCity}' AND RADST = '${routeData.desState}') AND 
                  (RATYPE = ${precs['ZIP(3) TO CITY,ST']} OR RATYPE = ${precs['MILEAGE']}))`;

  CS_Z = `((RADFZIP <='${routeData.desZip.substr(0, 3)}' AND RADTZIP >= '${routeData.desZip.substr(0, 3)}') AND
                  (RAOCITY = '${routeData.orgCity}' AND RAOST = '${routeData.orgState}') AND 
                  (RATYPE = ${precs['CITY,ST TO ZIP(3)']} OR RATYPE = ${precs['MILEAGE']}))`;

  CS_S = `(RAOCITY = '${routeData.orgCity}' AND RAOST = '${routeData.orgState}' AND RADST = '${routeData.desState}' AND
                  RATYPE = ${precs['CITY,ST TO ST']})`;

  S_CS = `(RAOST = '${routeData.orgState}' AND RADCITY = '${routeData.desCity}' AND RADST = '${routeData.desState}' AND
                  RATYPE = ${precs['ST TO CITY,ST']})`;

  S_Z5 = `((RAOST = '${routeData.orgState}') AND (RADFZIP <= '${routeData.desZip.substr(0, 5)}' AND RADTZIP >= '${routeData.desZip.substr(0, 5)}') AND 
                  (RATYPE = ${precs['ST TO ZIP(6)']} OR RATYPE = ${precs['MILEAGE']}))`;

  S_Z3 = `((RAOST = '${routeData.orgState}') AND (RADFZIP <= '${routeData.desZip.substr(0, 3)}' AND RADTZIP >= '${routeData.desZip.substr(0, 3)}') AND 
                  (RATYPE = ${precs['ST TO ZIP(3)']} OR RATYPE = ${precs['MILEAGE']}))`;

  Z3_S = `((RADST = '${routeData.desState}') AND (RAOFZIP <= '${routeData.orgZip.substr(0, 3)}' AND RADTZIP >= '${routeData.orgZip.substr(0, 3)}') AND 
                  (RATYPE = ${precs['ZIP(3) TO ST']} OR RATYPE = ${precs['MILEAGE']}))`;

  S_S = `((RAOST = '${routeData.orgState}' AND RADST = '${routeData.desState}') AND 
                 (RATYPE = ${precs['ST TO ST']} OR RATYPE = ${precs['MILEAGE']}))`;

  SZ_SZ = `(RAOST = '${routeData.orgState}' AND RAOFZIP <= '${routeData.orgZip.substr(0, 3)}' AND RAOTZIP >= '${routeData.orgZip.substr(0, 3)}' AND 
                    RADST = '${routeData.desState}' AND RADFZIP <= '${routeData.desZip.substr(0, 3)}' AND RADTZIP >= '${routeData.desZip.substr(0, 3)}' AND 
                   (RATYPE = ${precs['ST,ZIP(3) TO ST,ZIP(3)']} OR RATYPE = ${precs['MILEAGE']}))`;
};

/**
 * Generates Where Clause string useing provided route and precedence data.
 * @param {RouteData} routeData - Route Data Object
 * @param {Array.<string, number>} precs - Array of Precedence Values and Names
 * @returns {Promise<string>} - Custom Formatted WHERE clause for SQL SELECT
 */
export function genWhereClause (routeData, precs) {
  return new Promise((resolve, reject) => {
    initValues(routeData, precs);
    let whereClause = '';
    switch (routeData.typeCheck) {
      case 'CSZ_CSZ':
        if (routeData.desZip.length < 5) {
          whereClause += `${Z_Z()} OR ${CS_CS} OR ${Z_CS} OR ${CS_Z} OR ${S_Z3} OR
                    ${Z3_S} OR ${S_S} OR ${CS_S} OR ${S_CS} OR ${SZ_SZ}`;
        } else {
          whereClause += `${Z_Z()} OR ${CS_CS} OR ${Z_CS} OR ${CS_Z} OR ${S_Z3} OR
                    ${S_Z5} OR ${Z3_S} OR ${S_S} OR ${CS_S} OR ${S_CS} OR ${SZ_SZ}`;
        }
        break;

      case 'CSZ_CS':
        whereClause += `${CS_CS} OR ${Z_CS} OR ${Z3_S} OR ${S_S} OR ${CS_S} OR ${S_CS}`;
        break;

      case 'CSZ_S':
        whereClause += `${Z3_S} OR ${S_S} OR ${CS_S}`;
        break;

      case 'CSZ_Z':
        if (routeData.desZip.length < 5) {
          whereClause += `${Z_Z()} OR ${CS_Z} OR ${S_Z3}`;
        } else {
          whereClause += `${Z_Z()} OR ${CS_Z} OR ${S_Z3} OR ${S_Z5}`;
        }
        break;

      case 'CS_CSZ':
        if (routeData.desZip.length < 5) {
          whereClause += `${CS_CS} OR ${CS_Z} OR ${S_Z3} OR ${S_S} OR ${CS_S} OR ${S_CS}`;
        } else {
          whereClause += `${CS_CS} OR ${CS_Z} OR ${S_Z3} OR ${S_S} OR ${CS_S} OR ${S_CS} OR
                    ${S_Z5}`;
        }
        break;

      case 'CS_CS':
        whereClause += `${CS_CS} OR ${S_S} OR ${CS_S} OR ${S_CS}`;
        break;

      case 'CS_S':
        whereClause += `${S_S} OR ${CS_S}`;
        break;

      case 'CS_Z':
        if (routeData.desZip.length < 5) {
          whereClause += `${CS_Z} OR ${S_Z3}`;
        } else {
          whereClause += `${CS_Z} OR ${S_Z5} OR ${S_Z5}`;
        }
        break;

      case 'S_CSZ':
        if (routeData.desZip.length < 5) {
          whereClause += `${S_CS} OR ${S_Z3} OR ${S_S}`;
        } else {
          whereClause += `${S_CS} OR ${S_Z3} OR ${S_S} OR ${S_Z5}`;
        }
        break;

      case 'S_CS':
        whereClause += `${S_CS} OR ${S_S}`;
        break;

      case 'S_S':
        whereClause += `${S_S}`;
        break;

      case 'S_SZ':
        if (routeData.desZip.length < 5) {
          whereClause += `${S_S} OR ${S_Z3}`;
        } else {
          whereClause += `${S_S} OR ${S_Z3} OR ${S_Z5}`;
        }
        break;

      case 'SZ_S':
        whereClause += `${S_S} OR ${Z3_S}`;
        break;

      case 'S_Z':
        if (routeData.desZip.length < 5) {
          whereClause += S_Z3;
        } else {
          whereClause += `${S_Z3} OR ${S_Z5}`;
        }
        break;

      case 'Z_CSZ':
        whereClause += `${Z3_S} OR ${Z_CS} OR ${Z_Z()}`;
        break;

      case 'Z_CS':
        whereClause += `${Z3_S} OR ${Z_CS}`;
        break;

      case 'Z_S':
        whereClause += Z3_S;
        break;

      case 'Z_Z':
        whereClause += Z_Z();
        break;

      case 'SZ_SZ':
        if (routeData.desZip.length < 5) {
          whereClause += `${Z3_S} OR ${Z_Z()} OR ${S_S} OR ${S_Z3} OR ${SZ_SZ}`;
        } else {
          whereClause += `${Z3_S} OR ${Z_Z()} OR ${S_S} OR ${S_Z3} OR ${S_Z5} OR ${SZ_SZ}`;
        }
        break;

      // If somehow a type was determined that did not fall into the categories shown above, track the error here
      default:
        const error = config.get('ERROR_MESSAGES.SQL.whereClause.ROUTING');
        resolve({ error });
        break;
    }
    whereClause += `) AND ((RAFMILE <= CASE
      WHEN (SELECT PRMILEA FROM XL_RBNALT.BNARAPRP WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
        THEN ${routeData.calcPRACT}
        ELSE ${routeData.calcHHG}
      END AND RATMILE >= CASE
      WHEN (SELECT PRMILEA FROM XL_RBNALT.BNARAPRP WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
        THEN ${routeData.calcPRACT}
        ELSE ${routeData.calcHHG}
      END ) OR (RAFMILE = 0 AND RATMILE = 0)) AND RAFDTE <= ${routeData.date} AND RAEDTE >= ${routeData.date} AND RAOCT = '${routeData.orgCountry}' AND RADCT = '${routeData.desCountry}'
          AND RAMCDE = '${routeData.mode}' AND (SELECT RPACT FROM XL_RBNALT.BNAPROFP WHERE RPSCAC = RATE.RACODE FETCH FIRST ROW ONLY) <> 'I' ) as RESULTS ORDER BY PREC`;
    resolve(whereClause);
  });
}
