import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { compose, pathOr, head } from 'ramda';
import graphql from 'babel-plugin-relay/macro';
import { withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import { Description } from '@material-ui/icons';
import inject18n from '../../../components/i18n';
import ItemMarking from '../../../components/ItemMarking';
import { QueryRenderer } from '../../../relay/environment';

const styles = (theme) => ({
  paper: {
    minHeight: '100%',
    margin: '10px 0 0 0',
    padding: 0,
    borderRadius: 6,
  },
  item: {
    height: 60,
    minHeight: 60,
    maxHeight: 60,
    paddingRight: 0,
  },
  itemText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingRight: 10,
  },
  itemIcon: {
    marginRight: 0,
    color: theme.palette.primary.main,
  },
});

const inlineStyles = {
  itemDate: {
    fontSize: 11,
    width: 80,
    minWidth: 80,
    maxWidth: 80,
    marginRight: 24,
    textAlign: 'right',
    color: '#ffffff',
  },
};

const entityLastReportsQuery = graphql`
  query EntityLastReportsQuery(
    $objectId: String
    $authorId: String
    $first: Int
    $orderBy: ReportsOrdering
    $orderMode: OrderingMode
  ) {
    reports(
      objectId: $objectId
      authorId: $authorId
      first: $first
      orderBy: $orderBy
      orderMode: $orderMode
    ) {
      edges {
        node {
          id
          name
          description
          published
          markingDefinitions {
            edges {
              node {
                definition
              }
            }
          }
        }
      }
    }
  }
`;

class EntityLastReports extends Component {
  render() {
    const {
      t, nsd, classes, entityId, authorId,
    } = this.props;
    return (
      <div style={{ height: '100%' }}>
        <Typography variant="h4" gutterBottom={true}>
          {authorId
            ? t('Last reports wrote by the entity')
            : t('Last reports about the entity')}
        </Typography>
        <Paper classes={{ root: classes.paper }} elevation={2}>
          <QueryRenderer
            query={entityLastReportsQuery}
            variables={{
              objectId: authorId ? null : entityId,
              authorId: authorId || null,
              first: 8,
              orderBy: 'published',
              orderMode: 'desc',
            }}
            render={({ props }) => {
              if (props && props.reports) {
                return (
                  <List>
                    {props.reports.edges.map((reportEdge) => {
                      const report = reportEdge.node;
                      const markingDefinition = head(
                        pathOr([], ['markingDefinitions', 'edges'], report),
                      );
                      return (
                        <ListItem
                          key={report.id}
                          dense={true}
                          button={true}
                          classes={{ root: classes.item }}
                          divider={true}
                          component={Link}
                          to={`/dashboard/reports/all/${report.id}`}
                        >
                          <ListItemIcon classes={{ root: classes.itemIcon }}>
                            <Description />
                          </ListItemIcon>
                          <ListItemText
                            classes={{ root: classes.itemText }}
                            primary={report.name}
                            secondary={report.description}
                          />
                          <div style={{ minWidth: 100 }}>
                            {markingDefinition ? (
                              <ItemMarking
                                key={markingDefinition.node.id}
                                label={markingDefinition.node.definition}
                              />
                            ) : (
                              ''
                            )}
                          </div>
                          <div style={inlineStyles.itemDate}>
                            {nsd(report.published)}
                          </div>
                        </ListItem>
                      );
                    })}
                  </List>
                );
              }
              return <div> &nbsp; </div>;
            }}
          />
        </Paper>
      </div>
    );
  }
}

EntityLastReports.propTypes = {
  entityId: PropTypes.string,
  authorId: PropTypes.string,
  classes: PropTypes.object,
  t: PropTypes.func,
  nsd: PropTypes.func,
};

export default compose(
  inject18n,
  withStyles(styles),
)(EntityLastReports);
