import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { createPaginationContainer } from 'react-relay';
import {
  map, filter, head, compose,
} from 'ramda';
import { withStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Avatar from '@material-ui/core/Avatar';
import { CheckCircle } from '@material-ui/icons';
import graphql from 'babel-plugin-relay/macro';
import { ConnectionHandler } from 'relay-runtime';
import { truncate } from '../../../../utils/String';
import inject18n from '../../../../components/i18n';
import { commitMutation } from '../../../../relay/environment';

const styles = (theme) => ({
  avatar: {
    width: 24,
    height: 24,
  },
  icon: {
    color: theme.palette.primary.main,
  },
});

const attackPatternsLinesMutationRelationAdd = graphql`
  mutation AddAttackPatternsLinesRelationAddMutation(
    $id: ID!
    $input: RelationAddInput!
  ) {
    courseOfActionEdit(id: $id) {
      relationAdd(input: $input) {
        node {
          ... on CourseOfAction {
            id
            name
            description
          }
        }
        relation {
          id
        }
      }
    }
  }
`;

export const attackPatternsLinesMutationRelationDelete = graphql`
  mutation AddAttackPatternsLinesRelationDeleteMutation(
    $id: ID!
    $relationId: ID!
  ) {
    courseOfActionEdit(id: $id) {
      relationDelete(relationId: $relationId) {
        node {
          ... on CourseOfAction {
            id
          }
        }
      }
    }
  }
`;

const sharedUpdater = (store, userId, paginationOptions, newEdge) => {
  const userProxy = store.get(userId);
  const conn = ConnectionHandler.getConnection(
    userProxy,
    'Pagination_attackPatterns',
    paginationOptions,
  );
  ConnectionHandler.insertEdgeBefore(conn, newEdge);
};

class AddAttackPatternsLinesContainer extends Component {
  toggleAttackPattern(attackPattern) {
    const {
      courseOfActionId,
      courseOfActionAttackPatterns,
      courseOfActionPaginationOptions,
    } = this.props;
    const entityCoursesOfActionIds = map(
      (n) => n.node.id,
      courseOfActionAttackPatterns,
    );
    const alreadyAdded = entityCoursesOfActionIds.includes(attackPattern.id);

    if (alreadyAdded) {
      const existingCourseOfAction = head(
        filter(
          (n) => n.node.id === attackPattern.id,
          courseOfActionAttackPatterns,
        ),
      );
      commitMutation({
        mutation: attackPatternsLinesMutationRelationDelete,
        variables: {
          id: courseOfActionId,
          relationId: existingCourseOfAction.relation.id,
        },
        updater: (store) => {
          const container = store.getRoot();
          const userProxy = store.get(container.getDataID());
          const conn = ConnectionHandler.getConnection(
            userProxy,
            'Pagination_coursesOfAction',
            courseOfActionPaginationOptions,
          );
          ConnectionHandler.deleteNode(conn, attackPattern.id);
        },
      });
    } else {
      const input = {
        fromRole: 'mitigation',
        toId: attackPattern.id,
        toRole: 'problem',
        through: 'mitigates',
      };
      commitMutation({
        mutation: attackPatternsLinesMutationRelationAdd,
        variables: {
          id: courseOfActionId,
          input,
        },
        updater: (store) => {
          const payload = store
            .getRootField('courseOfActionEdit')
            .getLinkedRecord('relationAdd', { input });
          const container = store.getRoot();
          sharedUpdater(
            store,
            container.getDataID(),
            courseOfActionPaginationOptions,
            payload,
          );
        },
      });
    }
  }

  render() {
    const { classes, data, courseOfActionAttackPatterns } = this.props;
    const courseOfActionAttackPatternsIds = map(
      (n) => n.node.id,
      courseOfActionAttackPatterns,
    );
    return (
      <List>
        {data.attackPatterns.edges.map((attackPatternNode) => {
          const attackPattern = attackPatternNode.node;
          const alreadyAdded = courseOfActionAttackPatternsIds.includes(
            attackPattern.id,
          );
          return (
            <ListItem
              key={attackPattern.id}
              classes={{ root: classes.menuItem }}
              divider={true}
              button={true}
              onClick={this.toggleAttackPattern.bind(this, attackPattern)}
            >
              <ListItemIcon>
                {alreadyAdded ? (
                  <CheckCircle classes={{ root: classes.icon }} />
                ) : (
                  <Avatar classes={{ root: classes.avatar }}>
                    {attackPattern.name.substring(0, 1)}
                  </Avatar>
                )}
              </ListItemIcon>
              <ListItemText
                primary={attackPattern.name}
                secondary={truncate(attackPattern.description, 120)}
              />
            </ListItem>
          );
        })}
      </List>
    );
  }
}

AddAttackPatternsLinesContainer.propTypes = {
  entityId: PropTypes.string,
  entityCoursesOfAction: PropTypes.array,
  entityPaginationOptions: PropTypes.object,
  data: PropTypes.object,
  classes: PropTypes.object,
};

export const addAttackPatternsLinesQuery = graphql`
  query AddAttackPatternsLinesQuery(
    $search: String
    $count: Int!
    $cursor: ID
  ) {
    ...AddAttackPatternsLines_data
      @arguments(search: $search, count: $count, cursor: $cursor)
  }
`;

const AddAttackPatternsLines = createPaginationContainer(
  AddAttackPatternsLinesContainer,
  {
    data: graphql`
      fragment AddAttackPatternsLines_data on Query
        @argumentDefinitions(
          search: { type: "String" }
          count: { type: "Int", defaultValue: 25 }
          cursor: { type: "ID" }
        ) {
        attackPatterns(search: $search, first: $count, after: $cursor)
          @connection(key: "Pagination_attackPatterns") {
          edges {
            node {
              id
              name
              description
            }
          }
        }
      }
    `,
  },
  {
    direction: 'forward',
    getConnectionFromProps(props) {
      return props.data && props.data.attackPatterns;
    },
    getFragmentVariables(prevVars, totalCount) {
      return {
        ...prevVars,
        count: totalCount,
      };
    },
    getVariables(props, { count, cursor }, fragmentVariables) {
      return {
        count,
        cursor,
        orderBy: fragmentVariables.orderBy,
        orderMode: fragmentVariables.orderMode,
      };
    },
    query: addAttackPatternsLinesQuery,
  },
);

export default compose(
  inject18n,
  withStyles(styles),
)(AddAttackPatternsLines);
