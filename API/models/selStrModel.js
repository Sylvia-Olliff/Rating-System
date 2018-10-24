'use strict';
import config from 'config';
/**
 * Stores the SELECT clause of the Rating System Query. This keeps this monster seperate
 * and somewhat easier to deal with if changes need to be made.
 * Also contains a similar SELECT statement for LTL lanes
 * @module API/models/selStrModel
 * @requires {@link external:config|config}
 */

/**
 * Get a formatted SQL Select str custom built for this quote request.
 * @param {number} HHG - miles in HHG
 * @param {number} PRACT - miles in Practical
 * @param {string} date - ship date for quote
 */
export function getSelect (HHG, PRACT, date) {
  return `SELECT RACODE, RPCNAME, CONTACT, PHONE, EXT, EMAIL, ISCUST, IFNULL(BASE, 0) as BASE, IFNULL(FUEL, 0) as FUELC, (BASE + IFNULL(FUEL, 0)) as TOTAL, MILE, RARPM, RANOTE FROM (
          SELECT DISTINCT
            RATYPE as PREC,
            RACODE,
            CASE
              WHEN (SELECT COUNT(*) FROM ${config.get('SYSTEM.DB.FILES.CARRIER_PROFILE')} WHERE RPSCAC = RATE.RACODE) = 0
                THEN (SELECT RCUSTN FROM ${config.get('SYSTEM.DB.FILES.ADDRESSES')} WHERE RBILLC = RATE.RACODE)
                ELSE (SELECT RPCNAME FROM ${config.get('SYSTEM.DB.FILES.CARRIER_PROFILE')} WHERE RPSCAC = RATE.RACODE)
            END as RPCNAME,
            (SELECT RCCONT FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = RATE.RACODE AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as CONTACT,
            (SELECT RCPHONE FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = RATE.RACODE AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as PHONE,
            (SELECT RCEXT FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = RATE.RACODE AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as EXT,
            (SELECT RCEMAIL FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = RATE.RACODE AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as EMAIL,
            (SELECT RPCUST FROM ${config.get('SYSTEM.DB.FILES.CARRIER_PROFILE')} WHERE RPSCAC = RATE.RACODE) as ISCUST,
            CASE
              WHEN RAPTOP <> 0
                THEN RAPTOP
                ELSE
                  CASE
                    WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                      THEN (SELECT CASE WHEN (${PRACT} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${PRACT} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                      ELSE (SELECT CASE WHEN (${HHG} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${HHG} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                  END
            END as BASE,
            CASE
              WHEN RAFINCL <> 'Y'
                THEN CASE
                  WHEN (SELECT PRFTABL FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = ''
                    THEN CASE
                      WHEN RATE.RAFUEL <> ''
                        THEN (SELECT
                          CASE
                            WHEN SP.SPPCT = 0
                              THEN CASE
                                WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                  THEN (SELECT (${PRACT} * SP.SPFUEL$) FROM SYSIBM.SYSDUMMY1)
                                  ELSE (SELECT (${HHG} * SP.SPFUEL$) FROM SYSIBM.SYSDUMMY1)
                                END
                              ELSE CASE
                                WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                  THEN (SELECT (${PRACT} * SP.SPPCT) FROM SYSIBM.SYSDUMMY1)
                                  ELSE (SELECT (${HHG} * SP.SPPCT) FROM SYSIBM.SYSDUMMY1)
                                END
                          END
                          FROM ${config.get('SYSTEM.DB.FILES.FUEL_TABLES')} as SP
                          WHERE SPBAMT <= CASE
                                  WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                    THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                    ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                                  END
                              AND SPEAMT >= CASE
                                  WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) < ${date}
                                    THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                    ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                                  END
                              AND SNAME = RATE.RAFUEL AND SMODE = RATE.RAMCDE)
                        ELSE (SELECT
                          CASE
                            WHEN SP.SPPCT = 0
                              THEN CASE
                                WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                  THEN (SELECT (${PRACT} * SP.SPFUEL$) FROM SYSIBM.SYSDUMMY1)
                                  ELSE (SELECT (${HHG} * SP.SPFUEL$) FROM SYSIBM.SYSDUMMY1)
                                END
                              ELSE CASE
                                WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                  THEN (SELECT (CASE
                                                  WHEN RATE.RAPTOP <> 0
                                                    THEN RATE.RAPTOP
                                                    ELSE
                                                      CASE
                                                        WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                                          THEN (SELECT CASE WHEN (${PRACT} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${PRACT} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                          ELSE (SELECT CASE WHEN (${HHG} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${HHG} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                      END
                                                END * SP.SPPCT) FROM SYSIBM.SYSDUMMY1)
                                  ELSE (SELECT (CASE
                                                  WHEN RATE.RAPTOP <> 0
                                                    THEN RATE.RAPTOP
                                                    ELSE
                                                      CASE
                                                        WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                                          THEN (SELECT CASE WHEN (${PRACT} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${PRACT} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                          ELSE (SELECT CASE WHEN (${HHG} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${HHG} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                      END
                                                END * SP.SPPCT) FROM SYSIBM.SYSDUMMY1)
                                END
                          END
                          FROM ${config.get('SYSTEM.DB.FILES.FUEL_TABLES')} as SP
                          WHERE SPBAMT <= CASE
                              WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                              END
                            AND SPEAMT >= CASE
                              WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                              END
                            AND SNAME = '*DEF' AND SMODE = RATE.RAMCDE)
                    END
                  ELSE (SELECT
                    CASE
                      WHEN SP.SPPCT = 0
                        THEN CASE
                          WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                            THEN (SELECT (${PRACT} * SP.SPFUEL$) FROM SYSIBM.SYSDUMMY1)
                            ELSE (SELECT (${HHG} * SP.SPFUEL$) FROM SYSIBM.SYSDUMMY1)
                        END
                        ELSE CASE
                          WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                            THEN (SELECT (CASE
                                            WHEN RATE.RAPTOP <> 0
                                              THEN RATE.RAPTOP
                                              ELSE
                                                CASE
                                                  WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                                    THEN (SELECT CASE WHEN (${PRACT} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${PRACT} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                    ELSE (SELECT CASE WHEN (${HHG} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${HHG} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                END
                                          END * SP.SPPCT) FROM SYSIBM.SYSDUMMY1)
                            ELSE (SELECT (CASE
                                            WHEN RATE.RAPTOP <> 0
                                              THEN RATE.RAPTOP
                                              ELSE
                                                CASE
                                                  WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                                                    THEN (SELECT CASE WHEN (${PRACT} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${PRACT} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                    ELSE (SELECT CASE WHEN (${HHG} * RATE.RARPM) < RATE.RAMC THEN RATE.RAMC ELSE (${HHG} * RATE.RARPM) END FROM SYSIBM.SYSDUMMY1)
                                                END
                                          END * SP.SPPCT) FROM SYSIBM.SYSDUMMY1)
                        END
                      END
                      FROM ${config.get('SYSTEM.DB.FILES.FUEL_TABLES')} as SP
                      WHERE SPBAMT <= CASE
                        WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                          THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                          ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                      END
                      AND SPEAMT >= CASE
                        WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                          THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                          ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                      END
                      AND SNAME = (SELECT PRFTABL FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE) AND SMODE = RATE.RAMCDE)
                END
              ELSE 0
            END as FUEL,
            CASE
              WHEN (SELECT PRMILEA FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = RATE.RACODE AND PRACTI = 'A') = 'PM'
                THEN (${PRACT})
                ELSE (${HHG})
            END as MILE,
            RARPM, RANOTE
            FROM ${config.get('SYSTEM.DB.FILES.STD_LANES')} as RATE WHERE (`;
}

/**
 * Get a formatted SQL Select str custom built for this quote request (LTL).
 * @param {string} date - selected ship date
 */
export function getSelectLTL (date) {
  return `SELECT RDLABEL, RDSCAC, RDDISC, RDMINC, RDCONDTN, RFFAK, RFFRFAK, RFTOFAK, RDCLASSES,
                       CASE
                         WHEN (SELECT COUNT(*) FROM ${config.get('SYSTEM.DB.FILES.CARRIER_PROFILE')} WHERE RPSCAC = DISC.RDSCAC) = 0
                           THEN (SELECT RCUSTN FROM ${config.get('SYSTEM.DB.FILES.ADDRESSES')} WHERE RBILLC = DISC.RDSCAC)
                           ELSE (SELECT RPCNAME FROM ${config.get('SYSTEM.DB.FILES.CARRIER_PROFILE')} WHERE RPSCAC = DISC.RDSCAC)
                       END as RPCNAME,
                       (SELECT RCCONT FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = DISC.RDSCAC AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as CONTACT,
                       (SELECT RCPHONE FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = DISC.RDSCAC AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as PHONE,
                       (SELECT RCEXT FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = DISC.RDSCAC AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as EXT,
                       (SELECT RCEMAIL FROM ${config.get('SYSTEM.DB.FILES.CONTACTS')} WHERE RCSCAC = DISC.RDSCAC AND RCDEP = 'DISPATCH/CS' AND RCPHL = 1 ORDER BY RCCONT FETCH FIRST ROW ONLY) as EMAIL,
                       CASE
                         WHEN (SELECT PRFTABL FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = DISC.RDSCAC AND PRACTI = 'A') = ''
                           THEN CASE
                             WHEN DISC.RDFUEL <> '*DEF'
                               THEN (SELECT SPPCT FROM ${config.get('SYSTEM.DB.FILES.FUEL_TABLES')} as SP
                                 WHERE SPBAMT <= CASE
                                   WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                     THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                     ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                                   END
                                 AND SPEAMT >= CASE
                                   WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                     THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                     ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                                   END
                                 AND SNAME = DISC.RDFUEL AND SMODE = 'LTL')
                               ELSE (SELECT SPPCT FROM ${config.get('SYSTEM.DB.FILES.FUEL_TABLES')} as SP
                                 WHERE SPBAMT <= CASE
                                   WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                     THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                     ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                                   END
                                 AND SPEAMT >= CASE
                                   WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) < ${date}
                                     THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                     ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                                   END
                                 AND SNAME = 'CFSC' AND SMODE = 'LTL')
                             END
                           ELSE (SELECT SPPCT FROM ${config.get('SYSTEM.DB.FILES.FUEL_TABLES')} as SP
                             WHERE SPBAMT <= CASE
                               WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                 THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                 ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                               END
                             AND SPEAMT >= CASE
                               WHEN (SELECT FPBEGDT FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY) <= ${date}
                                 THEN (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} ORDER BY FPENDDT DESC FETCH FIRST ROW ONLY)
                                 ELSE (SELECT FPFUEL$ FROM ${config.get('SYSTEM.DB.FILES.FUEL_PRICES')} WHERE FPBEGDT <= ${date} AND FPENDDT >= ${date})
                               END
                             AND SNAME = (SELECT PRFTABL FROM ${config.get('SYSTEM.DB.FILES.RATE_PROFILE')} WHERE PRBCDE = DISC.RDSCAC) AND SMODE = 'LTL')
                          END as FUEL
                       FROM ${config.get('SYSTEM.DB.FILES.LTL_LANES')} as DISC join ${config.get('SYSTEM.DB.FILES.FAK_DATA')} on RDSCAC = RFCODE WHERE `;
}
