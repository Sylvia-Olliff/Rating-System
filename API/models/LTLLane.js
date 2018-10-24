'use strict';
/**
 * Standard Maintenance Lane
 * @alias LTLLane
 * @module API/models/LTLLane
 */

import moment from 'moment';
import config from 'config';

export class LTLLane {
  constructor (data) {
    /**
    * Relative Record Number formatted to an actual number.
    */
    this.recordNum = parseInt(data.RRN);
    this.code = data.RDSCAC.trim();
    this.forCust = data.RDCUST;

    this.effectiveFromDate = data.RDFDTE;
    this.effectiveToDate = data.RDEDTE;

    this.fromStates = data.RDFSTATE.trim();
    this.toStates = data.RDTSTATE.trim();

    this.fromStatesArray = this.fromStates.split(',');
    this.toStatesArray = this.toStates.split(',');

    this.stateRange = `${this.fromStates} - ${this.toStates}`;

    this.originFromZip = data.RDOFZIP.trim();
    this.originToZip = data.RDOTZIP.trim();
    this.destinationFromZip = data.RDDFZIP.trim();
    this.destinationToZip = data.RDDTZIP.trim();

    this.originZipRange = `${this.originFromZip}-${this.originToZip}`;
    this.destinationZipRange = `${this.destinationFromZip}-${this.destinationToZip}`;

    this.classRange = data.RDCLASSES;
    this.discClassArray = this.classRange.split('-');

    this.minCharge = parseFloat(data.RDMINC);
    this.fromWeight = data.RDFWEIGHT.trim();
    this.toWeight = data.RDTWEIGHT.trim();
    this.discount = data.RDDISC;

    this.conditions = data.RDCONDTN.trim();
  }

  delete () {
    return `DELETE FROM ${config.get('SYSTEM.DB.FILES.LTL_LANES')} WHERE RRN(${config.get('SYSTEM.DB.FILES.LTL_LANES')}) = ${this.recordNum}`;
  }

  edit () {
    return `UPDATE ${config.get('SYSTEM.DB.FILES.LTL_LANES')} SET
        RDSCAC = '${this.scac}',
        RDFDTE = ${moment(this.effectiveFromDate).format('YYYYMMDD')}, 
        RDEDTE = ${moment(this.effectiveToDate).format('YYYYMMDD')}, 
        RDCUST = '${this.forCust}', 
        RDDISC = ${this.discount}, 
        RDFSTATE = '${this.fromStates}', 
        RDTSTATE = '${this.toStates}', 
        RDOFZIP = ${this.originFromZip}, 
        RDOTZIP = ${this.originToZip}, 
        RDDFZIP = ${this.destinationFromZip}, 
        RDDTZIP = ${this.destinationToZip},
        RDCLASSES = '${this.classRange}', 
        RDCONDTN = '${this.conditions}', 
        RDFWEIGHT = '${this.fromWeight}', 
        RDTWEIGHT = '${this.toWeight}',
        RDMINC = ${this.minCharge} 
        WHERE RDLABEL='${this.label}' with NC`;
  }
}
