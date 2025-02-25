import { withFilter } from 'graphql-subscriptions';
import { BUS_TOPICS } from '../config/conf';
import {
  addStixObservable,
  stixObservableDelete,
  findAll,
  findById,
  findByValue,
  stixObservablesNumber,
  search,
  stixObservablesTimeSeries,
  stixObservableEditContext,
  stixObservableCleanContext,
  stixObservableEditField,
  stixObservableAddRelation,
  stixObservableDeleteRelation,
  stixObservableAskEnrichment,
  findByStixId
} from '../domain/stixObservable';
import { pubsub } from '../database/redis';
import withCancel from '../schema/subscriptionWrapper';
import { workForEntity } from '../domain/work';
import { connectorsForEnrichment } from '../domain/connector';

const stixObservableResolvers = {
  Query: {
    stixObservable: (_, { id }) => findById(id),
    stixObservables: (_, args) => {
      if (args.stix_id_key && args.stix_id_key.length > 0) {
        return findByStixId(args);
      }
      if (args.search && args.search.length > 0) {
        return search(args);
      }
      if (args.observableValue && args.observableValue.length > 0) {
        return findByValue(args);
      }
      return findAll(args);
    },
    stixObservablesTimeSeries: (_, args) => stixObservablesTimeSeries(args),
    stixObservablesNumber: (_, args) => stixObservablesNumber(args)
  },
  StixObservable: {
    jobs: (stixObservable, args) => workForEntity(stixObservable.id, args),
    connectors: (stixObservable, { onlyAlive = false }) =>
      connectorsForEnrichment(stixObservable.entity_type, onlyAlive)
  },
  Mutation: {
    stixObservableEdit: (_, { id }, { user }) => ({
      delete: () => stixObservableDelete(id),
      fieldPatch: ({ input }) => stixObservableEditField(user, id, input),
      contextPatch: ({ input }) => stixObservableEditContext(user, id, input),
      contextClean: () => stixObservableCleanContext(user, id),
      relationAdd: ({ input }) => stixObservableAddRelation(user, id, input),
      relationDelete: ({ relationId }) =>
        stixObservableDeleteRelation(user, id, relationId),
      askEnrichment: ({ connectorId }) =>
        stixObservableAskEnrichment(id, connectorId)
    }),
    stixObservableAdd: (_, { input }, { user }) =>
      addStixObservable(user, input)
  },
  Subscription: {
    stixObservable: {
      resolve: payload => payload.instance,
      subscribe: (_, { id }, { user }) => {
        stixObservableEditContext(user, id);
        const filtering = withFilter(
          () => pubsub.asyncIterator(BUS_TOPICS.StixObservable.EDIT_TOPIC),
          payload => {
            if (!payload) return false; // When disconnect, an empty payload is dispatched.
            return payload.user.id !== user.id && payload.instance.id === id;
          }
        )(_, { id }, { user });
        return withCancel(filtering, () => {
          stixObservableCleanContext(user, id);
        });
      }
    }
  }
};

export default stixObservableResolvers;
