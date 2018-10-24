'use strict';
/**
 * Standard Maintenance Lane
 * @alias STDLane
 * @module API/models/STDLane
 */
// import config from 'config';
import { isCustomer, getPrecs, getName } from '../services/Utils';
import moment from 'moment';
import config from 'config';
// import { logger } from '../../logger';

/**
 * Class representing a Standard Lane (Currently all lanes save for LTL are considered "Standard") in Maintenance
 * @requires API/services/Utils.isCustomer
 * @requires API/services/Utils.getPrecs
 * @requires API/services/Utils.getName
 * @requires {@link external:moment|moment}
 * @requires {@link external:config|config}
 */
export class STDLane {
  /**
   * @param {RawLaneData} data - Raw data straight from the Rating File (see config/default.json for a list of all AS400 files used by the Rating System)
   */
  constructor (data) {
    const precs = new Map();
    let temp = getPrecs();
    for (let prec in temp) {
      precs.set(temp[prec], prec);
    }
    /**
     * Relative Record Number formatted to an actual number.
     */
    this.recordNum = parseInt(data.RRN);

    /**
     * String description of the associated Precedence number
     */
    this.laneType = precs.get(data.RATYPE);

    /**
     * Transportation Mode (TLD, REF, CTR, etc...)
     */
    this.mode = data.RAMCDE;

    /**
     * SCAC code
     */
    this.code = data.RACODE;

    /**
     * User Comments for this lane. Trimmed to remove extra spaces
     */
    this.note = data.RANOTE.trim();

    /**
     * Effective From Date (left in string form)
     */
    this.effectiveFromDate = data.RAFDTE;

    /**
     * Effective To date (left in string form)
     */
    this.effectiveToDate = data.RAEDTE;

    /**
     * Origin Country
     */
    this.originCountry = data.RAOCT;

    /**
     * Origin State (two digit code)
     */
    this.originState = data.RAOST;

    /**
     * Origin City. Trimmed to remove extra spaces
     */
    this.originCity = data.RAOCITY.trim();

    /**
     * Origin Zip Range. Formatted to be a single string seperated by a ' - '
     */
    this.originZipRange = `${data.RAOFZIP.trim()} - ${data.RAOTZIP.trim()}`;

    /**
     * Destination Country
     */
    this.destinationCountry = data.RADCT;

    /**
     * Destination State (two digit code)
     */
    this.destinationState = data.RADST;

    /**
     * Destination City. Trimmed to remove extra spaces
     */
    this.destinationCity = data.RADCITY.trim();

    /**
     * Destination Zip Range. Formatted to be a single string seperated by a ' - '
     */
    this.destinationZipRange = `${data.RADFZIP.trim()} - ${data.RADTZIP.trim()}`;

    /**
     * Fuel Table to be used for this lane. If empty, set to 'default' else use the contents of RAFUEL trimmed to remove extra spaces
     * !!WARNING: This is NOT the RAFUEL field in the Rating File, though it uses that label. This is pulled from the Rate Profile file under XL_RBNALT library.
     */
    this.fuelTable = (data.RAFUEL.trim() === '') ? 'default' : data.RAFUEL.trim();

    /**
     * Flat Rate. If zero, set to false else formatted as float
     */
    this.flatRate = (parseFloat(data.RAPTOP) === 0.0) ? false : parseFloat(data.RAPTOP);

    /**
     * Rate Per Mile. If zero, set to false else formatted as float
     */
    this.ratePerMile = (parseFloat(data.RARPM) === 0.0) ? false : parseFloat(data.RARPM);

    /**
     * Minimum Charge, If zero, set to false else formatted as float
     */
    this.minimumCharge = (parseFloat(data.RAMC) === 0.0) ? false : parseFloat(data.RAMC);

    /**
     * Fuel Included? If RAFINCL is 'Y' set to true, else false.
     */
    this.fuelIncluded = (data.RAFINCL === 'Y');

    /**
     * Mileage Range From. If both RAFMILE and RATMILE are 0, set to 'NA' else Integer value of RAFMILE.
     */
    this.mileageRangeFrom = (parseInt(data.RAFMILE) === 0 && parseInt(data.RATMILE === 0)) ? 'NA' : parseInt(data.RAFMILE);

    /**
     * Mileage Range To. If RATMILE is 0 set to 'NA' else Integer value of RATMILE
     */
    this.mileageRangeTo = (parseInt(data.RATMILE === 0)) ? 'NA' : parseInt(data.RATMILE);

    /**
     * Mileage Range. Formatted string for display. If either [Mileage Range From]{@link module:API/models/STDLane#mileageRangeFrom} or [Mileage Range To]{@link module:API/models/STDLane#mileageRangeTo} are equal to 'NA' this will also be 'NA' else a string formatted as "{from} - {to}"
     */
    this.mileageRange = (this.mileageRangeFrom === 'NA' || this.mileageRangeTo === 'NA') ? 'NA' : `${this.mileageRangeFrom} - ${this.mileageRangeTo}`;

    /**
     * Date Range. Uses {@link external:moment|moment} to format the {@link module:API/models/STDLane#effectiveFromDate|Effective From Date} and {@link module:API/models/STDLane#effectiveToDate|Effective To Date} to fit "MM/DD/YYYY" format. Then sets Date Range to a string formmated as "{form} - {to}"
     */
    this.dateRange = `${moment(this.effectiveFromDate).format('MM/DD/YYYY')} - ${moment(this.effectiveToDate).format('MM/DD/YYYY')}`;

    /**
     * Formatted String representing the Origin Point. Depending on how much information is provided the string will be slightly different.
     * A full set of information will look like this "{city}, {state} {zip range}"
     */
    this.origin = '';
    if (this.originCity) this.origin += `${this.originCity}, `;
    if (this.originState) this.origin += `${this.originState} `;
    if (this.originZipRange !== ' - ') this.origin += `${this.originZipRange}`;

    /**
     * Formatted String representing the Destination Point. Depending on how much information is provided the string will be slightly different.
     * A full set of information will look like this "{city}, {state} {zip range}"
     */
    this.destination = '';
    if (this.destinationCity) this.destination += `${this.destinationCity}, `;
    if (this.destinationState) this.destination += `${this.destinationState} `;
    if (this.destinationZipRange !== ' - ') this.destination += `${this.destinationZipRange}`;

    /**
     * Formatted String representing if fuel is included, if not what table it uses.
     * Will be either "Fuel Included" or "Uses Table: {fuelTable}"
     */
    this.fuel = (this.fuelIncluded) ? 'Fuel Included' : `Uses Table: ${this.fuelTable}`;

    /**
     * Formatted String displaying the charge for this lane and how it is calculated.
     * Will be either "Flate Rate: {flatRate}" or "RPM: {ratePerMile}"
     */
    this.charge = (this.flatRate) ? `Flat Rate: ${this.flatRate}` : `RPM: ${this.ratePerMile}`;

    /**
     * Boolean value representing if this is a customer lane or not.
     * @see [isCustomer]{@link module:API/services/Utils.isCustomer}
     */
    this.isCustomer = isCustomer(this.code);

    /**
     * Carrier/Customer name.
     * @see [getName]{@link module:API/services/Utils.getName}
     */
    this.name = getName(this.code);
  }

  /**
   * Get String formatted for deleting this lane from the Rating Table
   * @returns {string} - SQL String (DELETE)
   */
  delete () {
    return `DELETE FROM ${config.get('SYSTEM.DB.FILES.STD_LANES')} WHERE RRN(${config.get('SYSTEM.DB.FILES.STD_LANES')}) = ${this.recordNum} with NC`;
  }

  /**
   * Get String formatted for editing this lane
   * @returns {string} - SQL String {UPDATE}
   */
  edit () {
    return `UPDATE ${config.get('SYSTEM.DB.FILES.STD_thisS')} SET 
        RAMCDE = '${this.mode}',
        RACODE = '${this.code}', 
        RAFDTE = ${moment(this.effectiveFromDate).format('YYYYMMDD')},
        RAEDTE = ${moment(this.effectiveToDate).format('YYYYMMDD')},
        RAOCT = '${this.originCountry}',
        RAOST = '${this.originState}',
        RAOCITY = '${this.originCity}',
        RAOFZIP = '${(this.originZipRange && this.originZipRange !== ' ') ? this.originZipRange.split('-')[0].trim() : ''}',
        RAOTZIP = '${(this.originZipRange && this.originZipRange !== ' ') ? this.originZipRange.split('-')[1].trim() : ''}',
        RADCT = '${this.destinationCountry}',
        RADST = '${this.destinationState}',
        RADCITY = '${this.destinationCity}',
        RADFZIP = '${(this.destinationZipRange && this.destinationZipRange !== ' ') ? this.destinationZipRange.split('-')[0].trim() : ''}',
        RADTZIP = '${(this.destinationZipRange && this.destinationZipRange !== ' ') ? this.destinationZipRange.split('-')[1].trim() : ''}',
        RAFUEL = '${(this.fuelTable === 'default') ? '' : this.fuelTable}',
        RAPTOP = ${(this.flatRate) ? this.flatRate : 0.0},
        RARPM = ${(this.ratePerMile) ? this.ratePerMile : 0.0},
        RAMC = ${(this.minimumCharge) ? this.minimumCharge : 0.0}, 
        RAFINCL = '${(this.fuelIncluded) ? 'Y' : 'N'}',
        RANOTE = '${this.note}',
        RAFMILE = ${this.mileageRangeFrom},
        RATMILE = ${this.mileageRangeTo}
        WHERE RRN(${config.get('SYSTEM.DB.FILES.STD_thisS')}) = ${this.recordNum} with NC`;
  }
}
