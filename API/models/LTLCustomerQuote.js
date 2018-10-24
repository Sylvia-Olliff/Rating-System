'use strict';
/**
 * LTL Quote generated from applicable [Lanes]{@link module:API/models/LTLLane} for a given Customer
 * @alias LTLCustomerQuote
 * @module API/models/LTLCustomerQuote
 */

import { round } from '../services/Utils';

/**
 *  Class representing a single LTL Quote for a carrier/customer
 */
export class LTLCustomerQuote {
  constructor (data) {
    if (!data.CONTACT) data.CONTACT = '';
    if (!data.EMAIL) data.EMAIL = '';

    this.code = data.RDSCAC;
    this.name = data.RPCNAME;
    this.conditions = data.RDCONDTN;

    this.contactInfo = {
      name: data.CONTACT.trim(),
      phone: `${data.PHONE}\n${(data.EXT) ? `ext: ${data.EXT}` : ''}`,
      email: data.EMAIL.trim()
    };

    this.fakData = {
      useFak: data.RFFAK,
      fakRange: [
        data.RFFRFAK,
        data.RFTOFAK
      ]
    };

    this.discountData = {
      discount: parseFloat(data.RDDISC),
      minCharge: parseFloat(data.RDMINC),
      fuel: parseFloat(data.FUEL),
      classes: data.RDCLASSES.trim().split('-')
    };
  }

  calculateSell (sellData) {
    try {
      let totalCharge = 0.0;
      let totalWeight = 0;
      let gross = 0.0;
      let discTotal = 0.0;
      let fuelCharge = 0.0;
      let total = 0.0;

      sellData.forEach(item => {
        let charge = parseFloat(item.charge);
        if (item.nmfcClass < this.discountData.classes[0] && item.nmfcClass > this.discountData.classes[1]) {
          gross += charge;
        } else {
          gross += charge - ((this.discountData.discount / 100) * charge);
          discTotal += round((this.discountData.discount / 100) * charge);
        }
        totalCharge += charge;
        totalWeight += parseFloat(item.weight);
      });
      fuelCharge = round(gross * this.discountData.fuel);
      total = round(gross + fuelCharge);

      return {
        totalCharge,
        totalWeight,
        gross,
        discTotal,
        fuelCharge,
        total
      };
    } catch (error) {
      throw error;
    }
  }
}
