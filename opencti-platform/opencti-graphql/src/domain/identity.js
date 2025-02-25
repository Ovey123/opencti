import { assoc, head, join, map, tail } from 'ramda';
import uuid from 'uuid/v4';
import {
  dayFormat,
  escapeString,
  executeWrite,
  getById,
  graknNow,
  monthFormat,
  notify,
  prepareDate,
  yearFormat
} from '../database/grakn';
import { BUS_TOPICS, logger } from '../config/conf';
import { paginate as elPaginate } from '../database/elasticSearch';
import { linkCreatedByRef, linkMarkingDef } from './stixEntity';

export const findAll = args => {
  return elPaginate(
    'stix_domain_entities',
    assoc('types', ['user', 'organization', 'region', 'country', 'city'], args)
  );
};

export const findById = identityId => getById(identityId);

export const addIdentity = async (user, identity) => {
  const identId = await executeWrite(async wTx => {
    const internalId = identity.internal_id_key
      ? escapeString(identity.internal_id_key)
      : uuid();
    const now = graknNow();
    const query = `insert $identity isa ${identity.type},
    has internal_id_key "${internalId}",
    has entity_type "${identity.type.toLowerCase()}",
    has stix_id_key "${
      identity.stix_id_key
        ? escapeString(identity.stix_id_key)
        : `${escapeString(identity.type.toLowerCase())}--${uuid()}`
    }",
    has stix_label "",
    ${
      identity.alias
        ? `${join(
            ' ',
            map(
              val => `has alias "${escapeString(val)}",`,
              tail(identity.alias)
            )
          )} has alias "${escapeString(head(identity.alias))}",`
        : 'has alias "",'
    }
    has name "${escapeString(identity.name)}",
    has description "${escapeString(identity.description)}",
    has created ${identity.created ? prepareDate(identity.created) : now},
    has modified ${identity.modified ? prepareDate(identity.modified) : now},
    has revoked false,
    has created_at ${now},
    has created_at_day "${dayFormat(now)}",
    has created_at_month "${monthFormat(now)}",
    has created_at_year "${yearFormat(now)}", 
    has updated_at ${now};
  `;
    const identityIterator = await wTx.tx.query(query);
    logger.debug(`[GRAKN - infer: false] addIdentity > ${query}`);
    const createIdentity = await identityIterator.next();
    const createdIdentityId = await createIdentity.map().get('identity').id;

    // Create associated relations
    await linkCreatedByRef(wTx, createdIdentityId, identity.createdByRef);
    await linkMarkingDef(wTx, createdIdentityId, identity.markingDefinitions);
    return internalId;
  });
  return getById(identId).then(created => {
    return notify(BUS_TOPICS.StixDomainEntity.ADDED_TOPIC, created, user);
  });
};
