'use strict';
/**
 * Standard Lane Entry for Building.
 * @alias LTLEntry
 * @module API/models/LTLEntry
 */

import { getZipStateCodes, currentDate, currentTime } from '../services/Utils';
import config from 'config';

let zipStateMap;

/**
 * Class representing a single entry for LTL Discounted Lane building
 * @requires API/services/Utils.getZipStateCodes
 * @requires {@link external:config|config}
 */
export class LTLEntry {
  constructor (data) {
    if (!zipStateMap) zipStateMap = getZipStateCodes();

    if (!data.fromStates) throw new Error('From States must be provided (Either as *INTER, *INTRA, or comma seperated codes)');
    if (!data.toStates) throw new Error('To States must be provided (Either as *INTER, *INTRA, or comma seperated codes)');

    this.code = data.code;
    this.fuel = data.fuel;
    this.forCust = data.forCust;
    this.fromStates = data.fromStates;
    this.toStates = data.toStates;
    this.originZips = data.originZips;
    this.destinationZips = data.destinationZips;
    this.discount = data.discount;
    this.minimumCharge = data.minimumCharge;
    this.classRange = data.classRange;
    this.conditions = data.conditions;
    this.weightRange = data.weightRange;
    this.fromDate = data.fromDate;
    this.toDate = data.toDate;
    this.user = data.user;
    this.combos = [];
  }

  hydrate () {
    return new Promise((resolve, reject) => {
      try {
        if (this.originZips || this.destinationZips) {
          this._mapZipState();
          this._mapComboZip();
        } else {
          this._mapComboNoZip();
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  _mapZipState () {
    this.originZips.map(zip => {
      zip.state = zipStateMap.get(zip.from);
      return zip;
    });
    this.destinationZips.map(zip => {
      zip.state = zipStateMap.get(zip.from);
      return zip;
    });
  }

  _mapComboNoZip () {
    if ((Array.isArray(this.fromStates)) && (Array.isArray(this.toStates))) {
      this.fromStates.forEach(fromState => {
        this.toStates.forEach(toState => {
          this.combos.push({
            origin: {
              state: fromState,
              from: 0,
              to: 99999
            },
            destination: {
              state: toState,
              from: 0,
              to: 99999
            }
          });
        });
      });
    } else if ((Array.isArray(this.fromStates)) && !(Array.isArray(this.toStates))) {
      this.fromStates.forEach(fromState => {
        this.combos.push({
          origin: {
            state: fromState,
            from: 0,
            to: 99999
          },
          destination: {
            state: this.toStates,
            from: 0,
            to: 99999
          }
        });
      });
    } else if (!(Array.isArray(this.fromStates)) && (Array.isArray(this.toStates))) {
      this.toStates.forEach(toState => {
        this.combos.push({
          origin: {
            state: this.fromStates,
            from: 0,
            to: 99999
          },
          destination: {
            state: toState,
            from: 0,
            to: 99999
          }
        });
      });
    } else {
      this.labelType = this.fromStates;
      this.combos.push({
        origin: {
          state: this.fromStates,
          from: 0,
          to: 99999
        },
        destination: {
          state: this.toStates,
          from: 0,
          to: 99999
        }
      });
    }
  }

  _mapComboZip () {
    this.originZips.forEach(originZip => {
      this.destinationZips.forEach(destinationZip => {
        this.combos.push({
          origin: originZip,
          destination: destinationZip
        });
      });
    });
  }

  genInsertArray () {
    const sqlArr = [];
    this.combos.forEach(combo => {
      sqlArr.push(`
          INSERT INTO ${config.get('SYSTEM.DB.FILES.LTL_LANES')}
            (RDSCAC, RDCUST, RDFUEL, RDFSTATE, RDTSTATE, RDOFZIP, RDOTZIP, RDDFZIP, RDDTZIP, RDDISC, 
            RDMINC, RDFCLASS, RDTCLASS, RDCONDTN, RDFWEIGHT, RDTWEIGHT, RDFDTE, RDEDTE, RDLSTDT, RDLSTTM, RDLSTUSR,
            RDLSTPGM, RDCRTDT, RDCRTTM, RDCRTUSR)
          VALUES
            ('${this.code}', '${this.forCust}', '${this.fuel}', '${combo.origin.state}', '${combo.destination.state}',
             '${combo.origin.from}', '${combo.origin.to}', '${combo.destination.from}', '${combo.destination.to}',
              ${this.discount}, ${this.minimumCharge}, '${this.classRange[0]}', '${this.classRange[1]}', '${this.conditions}',
              ${this.weightRange[0]}, ${this.weightRange[1]}, ${this.fromDate}, ${this.toDate}, ${currentDate()},
              ${currentTime()}, '${this.user}', ${currentDate()}, ${currentTime()}, '${this.user}')
          WHERE (SELECT COUNT(*) FROM ${config.get('SYSTEM.DB.FILES.LTL_LANES')}
                 WHERE 
                  RDSCAC = '${this.code}',
                  RDCUST = '${this.forCust}',
                  RDFUEL = '${this.fuel}',
                  RDFSTATE = '${combo.origin.state}',
                  RDTSTATE = '${combo.destination.state}',
                  RDOFZIP = '${combo.origin.from}',
                  RDOTZIP = '${combo.origin.to}',
                  RDDFZIP = '${combo.destination.from}',
                  RDDTZIP = '${combo.destination.to}',
                  RDFCLASS = ${this.classRange[0]},
                  RDTCLASS = ${this.classRange[1]},
                  RDFWEIGHT = ${this.weightRange[0]},
                  RDTWEIGHT = ${this.weightRange[1]},
                  RDFDTE = ${this.fromDate},
                  RDEDTE = ${this.toDate}) = 0`);
    });
    return sqlArr;
  }
}
