import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { compose } from 'ramda';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { QueryRenderer } from '../../../relay/environment';
import inject18n from '../../../components/i18n';
import ListLines from '../../../components/list_lines/ListLines';
import StixObservableEntitiesLines, {
  stixObservableEntitiesLinesQuery,
} from './StixObservableEntitiesLines';
import StixRelationCreationFromEntity from '../common/stix_relations/StixRelationCreationFromEntity';

const styles = () => ({
  paper: {
    minHeight: '100%',
    margin: '0 0 0 0',
    padding: '25px 15px 15px 15px',
    borderRadius: 6,
  },
});

class StixObservableEnrichmentEntities extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sortBy: null,
      orderAsc: false,
      searchTerm: '',
      view: 'lines',
    };
  }

  handleSort(field, orderAsc) {
    this.setState({ sortBy: field, orderAsc });
  }

  handleSearch(value) {
    this.setState({ searchTerm: value });
  }

  renderLines(paginationOptions) {
    const { sortBy, orderAsc } = this.state;
    const dataColumns = {
      relationship_type: {
        label: 'Relation',
        width: '15%',
        isSortable: true,
      },
      entity_type: {
        label: 'Entity type',
        width: '15%',
        isSortable: false,
      },
      name: {
        label: 'Name',
        width: '22%',
        isSortable: false,
      },
      first_seen: {
        label: 'First obs.',
        width: '15%',
        isSortable: true,
      },
      last_seen: {
        label: 'Last obs.',
        width: '15%',
        isSortable: true,
      },
      weight: {
        label: 'Confidence',
        width: '12%',
        isSortable: true,
      },
    };
    return (
      <ListLines
        sortBy={sortBy}
        orderAsc={orderAsc}
        dataColumns={dataColumns}
        handleSort={this.handleSort.bind(this)}
        handleSearch={this.handleSearch.bind(this)}
        displayImport={true}
        secondaryAction={true}
      >
        <QueryRenderer
          query={stixObservableEntitiesLinesQuery}
          variables={{ count: 25, ...paginationOptions }}
          render={({ props }) => (
            <StixObservableEntitiesLines
              data={props}
              paginationOptions={paginationOptions}
              dataColumns={dataColumns}
              initialLoading={props === null}
              displayRelation={true}
            />
          )}
        />
      </ListLines>
    );
  }

  render() {
    const {
      view, sortBy, orderAsc, searchTerm,
    } = this.state;
    const {
      classes, t, entityId, relationType,
    } = this.props;
    const paginationOptions = {
      inferred: true,
      fromId: entityId,
      relationType,
      search: searchTerm,
      orderBy: sortBy,
      orderMode: orderAsc ? 'asc' : 'desc',
    };
    return (
      <div>
        <Typography variant="h4" gutterBottom={true} style={{ float: 'left' }}>
          {t('Relations')}
        </Typography>
        <StixRelationCreationFromEntity
          paginationOptions={paginationOptions}
          entityId={entityId}
          variant="inLine"
          isFrom={true}
          targetEntityTypes={[
            'Region',
            'Country',
            'City',
            'Organization',
            'Person',
          ]}
        />
        <div className="clearfix" />
        <Paper classes={{ root: classes.paper }} elevation={2}>
          {view === 'lines' ? this.renderLines(paginationOptions) : ''}
        </Paper>
      </div>
    );
  }
}

StixObservableEnrichmentEntities.propTypes = {
  entityId: PropTypes.string,
  relationType: PropTypes.string,
  classes: PropTypes.object,
  t: PropTypes.func,
  history: PropTypes.object,
};

export default compose(
  inject18n,
  withStyles(styles),
)(StixObservableEnrichmentEntities);
