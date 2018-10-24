'use strict';
/**
 * Standard Lane Entry for Building.
 * @alias STDEntry
 * @module API/models/STDEntry
 */
import { getPrecs } from '../services/Utils';
import config from 'config';

/**
 * Class representing a single entry for lane building
 * @requires API/services/Utils.getPrecs
 * @requires {@link external:config|config}
 */
export class STDEntry {
  /**
   * @param {EntryObject} data - Entry Data from user via the Standard Builder
   */
  constructor (data) {
    const precs = new Map();
    let temp = getPrecs();
    for (let prec in temp) {
      precs.set(temp[prec], prec);
    }

    /**
     * Data regarding the Origin point
     * @property {string} [state] - Two character state code
     * @property {string} [city] - Name of the City for this point
     * @property {Object} zip - contains the zipcode range (for single zip points the from and to will be the same)
     * @property {string} [zip.from=''] - Bottom of the zip code range
     * @property {string} [zip.to=''] - Top of the zip code range
     */
    this.originData = data.originData;

    /**
     * Data regarding the Destination point
     * @property {string} [state] - Two character state code
     * @property {string} [city] - Name of the City for this point
     * @property {Object} zip - contains the zipcode range (for single zip points the from and to will be the same)
     * @property {string} [zip.from=''] - Bottom of the zip code range
     * @property {string} [zip.to=''] - Top of the zip code range
     */
    this.destinationData = data.destinationData;

    /**
     * Data regarding the rate(s) for this lane.
     * @property {number} [flatRate=0.0] - flat rate for this lane, if one is set.
     * @property {number} [ratePerMile=0.0] - rate charged per mile for non-flat rate lanes.
     * @property {number} [minimumCharge=0.0] - Minimum ammount that must be charged, if set.
     */
    this.rateData = data.rateData;

    /**
     * Data regarding options for this lane (comments, fuel included, etc...)
     * @property {string} [fuelIncluded=N] - Is the fuel included in the price or a seperate charge ('Y'/'N')
     * @property {string} [note=''] - Custom user comments for this lane
     * @property {Object} miles - Mileage range for lanes that depend on this.
     * @property {number} [miles.from=0] - Bottom of the mileage range
     * @property {number} [miles.to=0] - Top of the mileage range
     */
    this.optionsData = data.optionsData;

    /**
     * Data regarding settings information for all lanes in this set. (type, mode, SCAC, etc...)
     * @property {number} type - Precedence code for this set of lanes (Describes the nature of the lane. More accurate points are given higher priority when determing which lanes to display for a route)
     * @property {string} mode - Transportation mode (TLD, REF, CTR, etc...)
     * @property {string} code - SCAC Code
     * @property {string} effectiveFromDate - Date lane becomes available for quoting
     * @property {string} effectiveToDate - Date lane stops being available for quoting
     */
    this.settings = data.settings;
  }

  /**
   * Get SQL String for inserting this Entry into the Rating Table
   * @returns {string} SQL String (INSERT)
   */
  insert () {
    return `
      INSERT INTO ${config.get('SYSTEM.DB.FILES.STD_LANES')} 
      (RATYPE, RAMCDE, RACODE, RAFDTE, RAEDTE, RAOCT, RAOST, RAOCITY, RAOFZIP, RAOTZIP, RADCT, RADST, 
        RADCITY, RADFZIP, RADTZIP, RAPTOP, RARPM, RAMC, RAFINCL, RANOTE, RAFMILE, RATMILE)
        VALUES 
        (${this.settings.type},
        '${this.settings.mode}',
        '${this.settings.code}',
         ${this.settings.effectiveFromDate},
         ${this.settings.effectiveToDate},
        '${this.settings.originCountry}',
        '${this.originData.state}',
        '${this.originData.city}',
        '${this.originData.zip.from}',
        '${this.originData.zip.to}',
        '${this.settings.destinationCountry}',
        '${this.destinationData.state}',
        '${this.destinationData.city}',
        '${this.destinationData.zip.from}',
        '${this.destinationData.zip.to}',
         ${this.rateData.flatRate},
         ${this.rateData.ratePerMile},
         ${this.rateData.minimumCharge},
        '${this.optionsData.fuelIncluded}',
        '${this.optionsData.note}',
         ${this.optionsData.miles.from},
         ${this.optionsData.miles.to}) WITH NC`;
  }
}
