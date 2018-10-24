'use strict';
/**
 * Standard Quote generated from applicable [Lanes]{@link module:API/models/STDLane} for a given [Route]{@link RouteData}
 * @alias STDQuote
 * @module API/models/STDQuote
 */
import { round } from '../services/Utils';

/**
 * Class representing a single Standard Quote for a carrier/customer
 * @requires API/services/Utils.round
 */
export class STDQuote {
  /**
   * Create a Quote.
   * @param {RawQuoteData} data - Raw Quote data. This has been mildly formatted with additional information from the user. (stop offs and other general settings)
   */
  constructor (data) {
    if (!data.CONTACT) data.CONTACT = '';
    if (!data.EMAIL) data.EMAIL = '';

    /**
     * Boolean value representing whether or not this is a customer lane.
     */
    this.isCustomer = data.ISCUST;

    /**
     * SCAC Code
     */
    this.code = data.RACODE;

    /**
     * Customer/Carrier Name
     */
    this.name = data.RPCNAME;

    /**
     * Object containing the contact information for this lane's Carrier/Customer
     * @property {string} name - Contact name
     * @property {string} phone - Phone number (if known) and extension (if known)
     * @property {string} email - email address (if known)
     */
    this.contactInfo = {
      name: data.CONTACT.trim(),
      phone: `${data.PHONE}\n${(data.EXT) ? `ext: ${data.EXT}` : ''}`,
      email: data.EMAIL.trim()
    };

    /**
     * Number of stop offs on this route
     */
    this.stopOffs = data.stopOffs;

    /**
     * Base value for the charge/cost of this lane.
     * Will either be a float or the string 'Mileage Not Foun!' if BASE is either not a number or is equal to 0.0
     */
    this.base = (isNaN(parseFloat(data.BASE)) || parseFloat(data.BASE) === 0.0) ? 'Mileage Not Found!' : parseFloat(data.BASE);

    /**
     * Total cost of fuel for this lane.
     * Will either be a float or the string 'INCLUDED' if FUELC is either not a number or is equal to 0.0
     */
    this.fuelCharge = (isNaN(parseFloat(data.FUELC)) || parseFloat(data.FUELC) === 0.0) ? 'INCLUDED' : parseFloat(data.FUELC);

    /**
     * Total cost/charge for this lane. Includes Fuel charge (if separate) and any stop off charges
     * Will either be a float or the string 'ERROR!'
     */
    this.total = (isNaN(parseFloat(data.TOTAL)) || parseFloat(data.TOTAL) === 0.0) ? 'ERROR!' : parseFloat(data.TOTAL);

    /**
     * Number of miles for this route (as it applies to this lane, i.e. either HHG or Practical)
     * Will either be a float or the string 'Mileage Not Found!'
     */
    this.miles = (isNaN(parseInt(data.MILE)) || parseInt(data.MILE) === 0) ? 'Mileage Not Found!' : parseInt(data.MILE);

    /**
     * Charge/Cost per mile. If applicable
     * Will either be a float or the string 'FLAT'
     */
    this.ratePerMile = (isNaN(parseFloat(data.RARPM)) || parseFloat(data.RARPM) === 0.0) ? 'FLAT' : parseFloat(data.RARPM);

    /**
     * User comments for this lane, trimmed to remove extra spaces.
     */
    this.comments = data.RANOTE.trim();

    /**
     * Set to true if something about this Quote is in error and should be flagged to the user.
     */
    this.error = false;

    if (!isNaN(parseFloat(this.base)) && !isNaN(parseInt(this.mile))) {
      if (this.stopOffs && (this.ratePerMile === 'FLAT' || this.ratePerMile === 0.0)) {
        let ratePerMile = parseFloat(this.base) / (parseInt(this.mile) - this.stopOffs);
        if (ratePerMile < 0) ratePerMile = 0.0;
        this.total = round(this.total + (ratePerMile * this.stopOffs));
        this.fuelCharge = round(this.fuelCharge + (this.fuelCharge / this.miles));
      } else if (this.stopOffs) {
        this.total = round(this.total + (this.ratePerMile * this.stopOffs));
        this.fuelCharge = round(this.fuelCharge + (this.fuelCharge / this.miles));
      } else {
        this.total = round(this.total);
        this.fuelCharge = round(this.fuelCharge);
      }
      this.base = round(this.base);
    } else {
      this.error = true;
    }
  }
}
