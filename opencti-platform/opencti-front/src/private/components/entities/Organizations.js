import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import {
  compose, propOr, assoc, dissoc, mapObjIndexed, map,
} from 'ramda';
import { withRouter } from 'react-router-dom';
import { QueryRenderer } from '../../../relay/environment';
import {
  buildViewParamsFromUrlAndStorage,
  saveViewParameters,
} from '../../../utils/ListParameters';
import inject18n from '../../../components/i18n';
import ListLines from '../../../components/list_lines/ListLines';
import OrganizationsLines, {
  organizationsLinesQuery,
} from './organizations/OrganizationsLines';
import OrganizationCreation from './organizations/OrganizationCreation';

class Organizations extends Component {
  constructor(props) {
    super(props);
    const params = buildViewParamsFromUrlAndStorage(
      props.history,
      props.location,
      'Organizations-view',
    );
    this.state = {
      sortBy: propOr('name', 'sortBy', params),
      orderAsc: propOr(true, 'orderAsc', params),
      searchTerm: propOr('', 'searchTerm', params),
      view: propOr('lines', 'view', params),
      filters: {},
    };
  }

  saveView() {
    saveViewParameters(
      this.props.history,
      this.props.location,
      'Organizations-view',
      dissoc('filters', this.state),
    );
  }

  handleSearch(value) {
    this.setState({ searchTerm: value }, () => this.saveView());
  }

  handleSort(field, orderAsc) {
    this.setState({ sortBy: field, orderAsc }, () => this.saveView());
  }

  handleAddFilter(key, id, value, event) {
    event.stopPropagation();
    event.preventDefault();
    this.setState({
      filters: assoc(key, [{ id, value }], this.state.filters),
    });
  }

  handleRemoveFilter(key) {
    this.setState({ filters: dissoc(key, this.state.filters) });
  }

  renderLines(paginationOptions) {
    const {
      sortBy, orderAsc, searchTerm, filters,
    } = this.state;
    const dataColumns = {
      name: {
        label: 'Name',
        width: '23%',
        isSortable: true,
      },
      organization_class: {
        label: 'Type',
        width: '15%',
        isSortable: true,
      },
      tags: {
        label: 'Tags',
        width: '23%',
        isSortable: true,
      },
      created: {
        label: 'Creation date',
        width: '15%',
        isSortable: true,
      },
      modified: {
        label: 'Modification date',
        width: '15%',
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
        handleRemoveFilter={this.handleRemoveFilter.bind(this)}
        displayImport={true}
        keyword={searchTerm}
        filters={filters}
      >
        <QueryRenderer
          query={organizationsLinesQuery}
          variables={{ count: 25, ...paginationOptions }}
          render={({ props }) => (
            <OrganizationsLines
              data={props}
              paginationOptions={paginationOptions}
              dataColumns={dataColumns}
              initialLoading={props === null}
              onTagClick={this.handleAddFilter.bind(this)}
            />
          )}
        />
      </ListLines>
    );
  }

  render() {
    const {
      view, sortBy, orderAsc, searchTerm, filters,
    } = this.state;
    const paginationOptions = {
      search: searchTerm,
      orderBy: sortBy,
      orderMode: orderAsc ? 'asc' : 'desc',
      filters: mapObjIndexed((value) => map((n) => n.id, value), filters),
    };
    return (
      <div>
        {view === 'lines' ? this.renderLines(paginationOptions) : ''}
        <OrganizationCreation paginationOptions={paginationOptions} />
      </div>
    );
  }
}

Organizations.propTypes = {
  t: PropTypes.func,
  history: PropTypes.object,
  location: PropTypes.object,
};

export default compose(
  inject18n,
  withRouter,
)(Organizations);
