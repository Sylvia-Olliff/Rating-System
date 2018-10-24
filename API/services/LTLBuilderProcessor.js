'use strict';

import { LTLEntry } from '../models/LTLEntry';
import { execInserts } from '../db/dbConn';

async function processInserts (data) {
  try {
    const ltlEntry = new LTLEntry(data);
    await ltlEntry.hydrate();
    const results = await execInserts(ltlEntry.genInsertArray());
    return results;
  } catch (error) {
    throw error;
  }
}

export function processData (req, res, next) {
  
}
