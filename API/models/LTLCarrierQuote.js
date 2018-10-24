'use strict';
/**
 * LTL Quote generated from applicable [Lanes]{@link module:API/models/LTLLane} for a given Carrier
 * @alias LTLCarrierQuote
 * @module API/models/LTLCarrierQuote
 */

import { round } from '../services/Utils';

export class LTLCarrierQuote {
  constructor (data) {
    if (!data.CONTACT) data.CONTACT = '';
    if (!data.EMAIL) data.EMAIL = '';

    this.code = data.RDSCAC;
    this.name = data.RPCNAME;
    this.conditions = data.RDCONDTN.trim();

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
      minCharge: round(parseFloat(data.RDMINC)),
      fuel: parseFloat(data.FUEL),
      classes: data.RDCLASSES.trim().split('-')
    };
  }

  calculateCharge (chargeData) {
    try {
      let shipDetails = [];
      let base = 0.0;
      let gross = 0.0;
      let fuelCharge = 0.0;
      let discTotal = 0.0;
      let total = 0.0;

      chargeData.forEach(item => {
        let charge = parseFloat(item.charge);
        if (this.discountData.discount) {
          if (item.nmfcClass < this.discountData.classes[0] && item.nmfcClass > this.discountData.classes[1]) {
            shipDetails.push({ charge, class: item.nmfcClass });
            gross += charge;
          } else {
            charge = charge * (1 - (parseFloat(item.discount) / 100));
            shipDetails.push({ charge, class: item.nmfcClass });
            gross += charge - ((this.discountData.discount / 100) * charge);
            discTotal += (this.discountData.discount / 100) * charge;
          }
        } else {
          shipDetails.push({ charge, class: item.nmfcClass });
          gross += charge;
        }
        base += charge;
      });

      if (gross < this.discountData.minCharge) {
        gross = this.discountData.minCharge;
      } else {
        gross = round(gross);
      }

      base = round(base);
      fuelCharge = round(gross * this.discountData.fuel);
      total = round(gross + fuelCharge);
      discTotal = round(discTotal);

      return {
        base,
        gross,
        fuelCharge,
        discTotal,
        total,
        shipDetails
      };
    } catch (error) {
      throw error;
    }
  }
}
