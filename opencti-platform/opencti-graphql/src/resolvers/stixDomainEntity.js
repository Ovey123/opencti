import { withFilter } from 'graphql-subscriptions';
import { BUS_TOPICS } from '../config/conf';
import {
  addStixDomainEntity,
  findAll,
  findByExternalReference,
  findById,
  findByName,
  findByStixId,
  stixDomainEntitiesNumber,
  stixDomainEntitiesTimeSeries,
  stixDomainEntityAddRelation,
  stixDomainEntityExportAsk,
  stixDomainEntityCleanContext,
  stixDomainEntityDelete,
  stixDomainEntityDeleteRelation,
  stixDomainEntityEditContext,
  stixDomainEntityEditField,
  stixDomainEntityExportPush,
  stixDomainEntityImportPush,
  stixDomainEntityAddRelations
} from '../domain/stixDomainEntity';
import { fetchEditContext, pubsub } from '../database/redis';
import withCancel from '../schema/subscriptionWrapper';
import { filesListing } from '../database/minio';
import {
  createdByRef,
  markingDefinitions,
  reports,
  tags
} from '../domain/stixEntity';

const stixDomainEntityResolvers = {
  Query: {
    stixDomainEntity: (_, { id }) => findById(id),
    stixDomainEntities: (_, args) => {
      if (args.stix_id_key && args.stix_id_key.length > 0) {
        return findByStixId(args);
      }
      if (args.name && args.name.length > 0) {
        return findByName(args);
      }
      if (args.externalReferenceId && args.externalReferenceId.length > 0) {
        return findByExternalReference(args);
      }
      return findAll(args);
    },
    stixDomainEntitiesTimeSeries: (_, args) =>
      stixDomainEntitiesTimeSeries(args),
    stixDomainEntitiesNumber: (_, args) => stixDomainEntitiesNumber(args)
  },
  StixDomainEntity: {
    // eslint-disable-next-line no-underscore-dangle
    __resolveType(obj) {
      if (obj.entity_type) {
        return obj.entity_type.replace(/(?:^|-)(\w)/g, (matches, letter) =>
          letter.toUpperCase()
        );
      }
      return 'Unknown';
    },
    importFiles: (entity, { first }) => filesListing(first, 'import', entity),
    exportFiles: (entity, { first }) => filesListing(first, 'export', entity),
    createdByRef: entity => createdByRef(entity.id),
    editContext: entity => fetchEditContext(entity.id),
    tags: (entity, args) => tags(entity.id, args),
    reports: (entity, args) => reports(entity.id, args),
    markingDefinitions: (entity, args) => markingDefinitions(entity.id, args)
  },
  Mutation: {
    stixDomainEntityEdit: (_, { id }, { user }) => ({
      delete: () => stixDomainEntityDelete(id),
      fieldPatch: ({ input }) => stixDomainEntityEditField(user, id, input),
      contextPatch: ({ input }) => stixDomainEntityEditContext(user, id, input),
      contextClean: () => stixDomainEntityCleanContext(user, id),
      relationAdd: ({ input }) => stixDomainEntityAddRelation(user, id, input),
      relationsAdd: ({ input }) =>
        stixDomainEntityAddRelations(user, id, input),
      relationDelete: ({ relationId }) =>
        stixDomainEntityDeleteRelation(user, id, relationId),
      importPush: ({ file }) => stixDomainEntityImportPush(user, id, file),
      exportAsk: ({ format, exportType }) =>
        stixDomainEntityExportAsk(id, format, exportType),
      exportPush: ({ file }) => stixDomainEntityExportPush(user, id, file)
    }),
    stixDomainEntityAdd: (_, { input }, { user }) =>
      addStixDomainEntity(user, input)
  },
  Subscription: {
    stixDomainEntity: {
      resolve: payload => payload.instance,
      subscribe: (_, { id }, { user }) => {
        stixDomainEntityEditContext(user, id);
        const filtering = withFilter(
          () => pubsub.asyncIterator(BUS_TOPICS.StixDomainEntity.EDIT_TOPIC),
          payload => {
            if (!payload) return false; // When disconnect, an empty payload is dispatched.
            return payload.user.id !== user.id && payload.instance.id === id;
          }
        )(_, { id }, { user });
        return withCancel(filtering, () => {
          stixDomainEntityCleanContext(user, id);
        });
      }
    }
  }
};

export default stixDomainEntityResolvers;
