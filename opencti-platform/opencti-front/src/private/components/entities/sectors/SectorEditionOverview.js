import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import graphql from 'babel-plugin-relay/macro';
import { createFragmentContainer } from 'react-relay';
import { Formik, Field, Form } from 'formik';
import { withStyles } from '@material-ui/core/styles';
import {
  assoc,
  compose,
  map,
  pathOr,
  pipe,
  pick,
  difference,
  head,
  union,
  filter,
} from 'ramda';
import * as Yup from 'yup';
import inject18n from '../../../../components/i18n';
import Autocomplete from '../../../../components/Autocomplete';
import TextField from '../../../../components/TextField';
import { SubscriptionFocus } from '../../../../components/Subscription';
import {
  commitMutation,
  fetchQuery,
  WS_ACTIVATED,
} from '../../../../relay/environment';
import { now } from '../../../../utils/Time';
import { markingDefinitionsSearchQuery } from '../../settings/MarkingDefinitions';
import { sectorsSearchQuery } from '../Sectors';
import AutocompleteCreate from '../../../../components/AutocompleteCreate';
import IdentityCreation, {
  identityCreationIdentitiesSearchQuery,
} from '../../common/identities/IdentityCreation';

const styles = (theme) => ({
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    overflow: 'hidden',
    backgroundColor: theme.palette.navAlt.background,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: '30px 30px 30px 30px',
  },
  createButton: {
    position: 'fixed',
    bottom: 30,
    right: 30,
  },
  importButton: {
    position: 'absolute',
    top: 30,
    right: 30,
  },
});

const sectorMutationFieldPatch = graphql`
  mutation SectorEditionOverviewFieldPatchMutation(
    $id: ID!
    $input: EditInput!
  ) {
    sectorEdit(id: $id) {
      fieldPatch(input: $input) {
        ...SectorEditionOverview_sector
      }
    }
  }
`;

export const sectorEditionOverviewFocus = graphql`
  mutation SectorEditionOverviewFocusMutation($id: ID!, $input: EditContext!) {
    sectorEdit(id: $id) {
      contextPatch(input: $input) {
        id
      }
    }
  }
`;

const sectorMutationRelationAdd = graphql`
  mutation SectorEditionOverviewRelationAddMutation(
    $id: ID!
    $input: RelationAddInput!
  ) {
    sectorEdit(id: $id) {
      relationAdd(input: $input) {
        node {
          ...SectorEditionOverview_sector
        }
      }
    }
  }
`;

const sectorMutationRelationDelete = graphql`
  mutation SectorEditionOverviewRelationDeleteMutation(
    $id: ID!
    $relationId: ID!
  ) {
    sectorEdit(id: $id) {
      relationDelete(relationId: $relationId) {
        node {
          ...SectorEditionOverview_sector
        }
      }
    }
  }
`;

const sectorValidation = (t) => Yup.object().shape({
  name: Yup.string().required(t('This field is required')),
  description: Yup.string()
    .min(3, t('The value is too short'))
    .max(5000, t('The value is too long'))
    .required(t('This field is required')),
});

class SectorEditionOverviewComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      subsectors: [],
      markingDefinitions: [],
      identityCreation: false,
      identities: [],
    };
  }

  searchIdentities(event) {
    fetchQuery(identityCreationIdentitiesSearchQuery, {
      search: event.target.value,
      first: 10,
    }).then((data) => {
      const identities = pipe(
        pathOr([], ['identities', 'edges']),
        map((n) => ({ label: n.node.name, value: n.node.id })),
      )(data);
      this.setState({ identities: union(this.state.identities, identities) });
    });
  }

  handleOpenIdentityCreation(inputValue) {
    this.setState({ identityCreation: true, identityInput: inputValue });
  }

  handleCloseIdentityCreation() {
    this.setState({ identityCreation: false });
  }

  searchMarkingDefinitions(event) {
    fetchQuery(markingDefinitionsSearchQuery, {
      search: event.target.value,
    }).then((data) => {
      const markingDefinitions = pipe(
        pathOr([], ['markingDefinitions', 'edges']),
        map((n) => ({ label: n.node.definition, value: n.node.id })),
      )(data);
      this.setState({
        markingDefinitions: union(
          this.state.markingDefinitions,
          markingDefinitions,
        ),
      });
    });
  }

  searchSubsector(event) {
    fetchQuery(sectorsSearchQuery, {
      search: event.target.value,
    }).then((data) => {
      const subsectors = pipe(
        pathOr([], ['sectors', 'edges']),
        map((n) => ({ label: n.node.name, value: n.node.id })),
      )(data);
      this.setState({
        subsectors: union(
          this.state.subsectors,
          filter((n) => n.value !== this.props.sector.id, subsectors),
        ),
      });
    });
  }

  handleChangeFocus(name) {
    if (WS_ACTIVATED) {
      commitMutation({
        mutation: sectorEditionOverviewFocus,
        variables: {
          id: this.props.sector.id,
          input: {
            focusOn: name,
          },
        },
      });
    }
  }

  handleSubmitField(name, value) {
    sectorValidation(this.props.t)
      .validateAt(name, { [name]: value })
      .then(() => {
        commitMutation({
          mutation: sectorMutationFieldPatch,
          variables: { id: this.props.sector.id, input: { key: name, value } },
        });
      })
      .catch(() => false);
  }

  handleChangeCreatedByRef(name, value) {
    const { sector } = this.props;
    const currentCreatedByRef = {
      label: pathOr(null, ['createdByRef', 'node', 'name'], sector),
      value: pathOr(null, ['createdByRef', 'node', 'id'], sector),
      relation: pathOr(null, ['createdByRef', 'relation', 'id'], sector),
    };

    if (currentCreatedByRef.value === null) {
      commitMutation({
        mutation: sectorMutationRelationAdd,
        variables: {
          id: value.value,
          input: {
            fromRole: 'creator',
            toId: this.props.sector.id,
            toRole: 'so',
            through: 'created_by_ref',
          },
        },
      });
    } else if (currentCreatedByRef.value !== value.value) {
      commitMutation({
        mutation: sectorMutationRelationDelete,
        variables: {
          id: this.props.sector.id,
          relationId: currentCreatedByRef.relation,
        },
      });
      commitMutation({
        mutation: sectorMutationRelationAdd,
        variables: {
          id: value.value,
          input: {
            fromRole: 'creator',
            toId: this.props.sector.id,
            toRole: 'so',
            through: 'created_by_ref',
          },
        },
      });
    }
  }

  handleChangeMarkingDefinition(name, values) {
    const { sector } = this.props;
    const currentMarkingDefinitions = pipe(
      pathOr([], ['markingDefinitions', 'edges']),
      map((n) => ({
        label: n.node.definition,
        value: n.node.id,
        relationId: n.relation.id,
      })),
    )(sector);

    const added = difference(values, currentMarkingDefinitions);
    const removed = difference(currentMarkingDefinitions, values);

    if (added.length > 0) {
      commitMutation({
        mutation: sectorMutationRelationAdd,
        variables: {
          id: head(added).value,
          input: {
            fromRole: 'marking',
            toId: this.props.sector.id,
            toRole: 'so',
            through: 'object_marking_refs',
          },
        },
      });
    }

    if (removed.length > 0) {
      commitMutation({
        mutation: sectorMutationRelationDelete,
        variables: {
          id: this.props.sector.id,
          relationId: head(removed).relationId,
        },
      });
    }
  }

  handleChangeSubsectors(name, values) {
    const { sector } = this.props;
    const currentSubsectors = pipe(
      pathOr([], ['subsectors', 'edges']),
      map((n) => ({
        label: n.node.name,
        value: n.node.id,
        relationId: n.relation.id,
      })),
    )(sector);

    const added = difference(values, currentSubsectors);
    const removed = difference(currentSubsectors, values);

    if (added.length > 0) {
      commitMutation({
        mutation: sectorMutationRelationAdd,
        variables: {
          id: head(added).value,
          input: {
            fromRole: 'part_of',
            toId: this.props.sector.id,
            toRole: 'gather',
            through: 'gathering',
            first_seen: now(),
            last_seen: now(),
            weight: 4,
            stix_id_key: 'create',
          },
        },
      });
    }

    if (removed.length > 0) {
      commitMutation({
        mutation: sectorMutationRelationDelete,
        variables: {
          id: this.props.sector.id,
          relationId: head(removed).relationId,
        },
      });
    }
  }

  render() {
    const {
      t, sector, editUsers, me,
    } = this.props;
    const createdByRef = pathOr(null, ['createdByRef', 'node', 'name'], sector) === null
      ? ''
      : {
        label: pathOr(null, ['createdByRef', 'node', 'name'], sector),
        value: pathOr(null, ['createdByRef', 'node', 'id'], sector),
        relation: pathOr(null, ['createdByRef', 'relation', 'id'], sector),
      };
    const subsectors = pipe(
      pathOr([], ['subsectors', 'edges']),
      map((n) => ({
        label: n.node.name,
        value: n.node.id,
        relationId: n.relation.id,
      })),
    )(sector);
    const markingDefinitions = pipe(
      pathOr([], ['markingDefinitions', 'edges']),
      map((n) => ({
        label: n.node.definition,
        value: n.node.id,
        relationId: n.relation.id,
      })),
    )(sector);
    const initialValues = pipe(
      assoc('createdByRef', createdByRef),
      assoc('subsectors', subsectors),
      assoc('markingDefinitions', markingDefinitions),
      pick([
        'name',
        'description',
        'createdByRef',
        'subsectors',
        'markingDefinitions',
      ]),
    )(sector);
    return (
      <div>
        <Formik
          enableReinitialize={true}
          initialValues={initialValues}
          validationSchema={sectorValidation(t)}
          onSubmit={() => true}
          render={({ setFieldValue }) => (
            <div>
              <Form style={{ margin: '20px 0 20px 0' }}>
                <Field
                  name="name"
                  component={TextField}
                  label={t('Name')}
                  fullWidth={true}
                  onFocus={this.handleChangeFocus.bind(this)}
                  onSubmit={this.handleSubmitField.bind(this)}
                  helperText={
                    <SubscriptionFocus
                      me={me}
                      users={editUsers}
                      fieldName="name"
                    />
                  }
                />
                <Field
                  name="description"
                  component={TextField}
                  label={t('Description')}
                  fullWidth={true}
                  multiline={true}
                  rows="4"
                  style={{ marginTop: 10 }}
                  onFocus={this.handleChangeFocus.bind(this)}
                  onSubmit={this.handleSubmitField.bind(this)}
                  helperText={
                    <SubscriptionFocus
                      me={me}
                      users={editUsers}
                      fieldName="description"
                    />
                  }
                />
                <Field
                  name="createdByRef"
                  component={AutocompleteCreate}
                  multiple={false}
                  handleCreate={this.handleOpenIdentityCreation.bind(this)}
                  label={t('Author')}
                  options={this.state.identities}
                  onInputChange={this.searchIdentities.bind(this)}
                  onChange={this.handleChangeCreatedByRef.bind(this)}
                  onFocus={this.handleChangeFocus.bind(this)}
                  helperText={
                    <SubscriptionFocus
                      me={me}
                      users={editUsers}
                      fieldName="createdByRef"
                    />
                  }
                />
                {!sector.isSubsector ? (
                  <Field
                    name="subsectors"
                    component={Autocomplete}
                    multiple={true}
                    label={t('Subsectors')}
                    options={this.state.subsectors}
                    onInputChange={this.searchSubsector.bind(this)}
                    onChange={this.handleChangeSubsectors.bind(this)}
                    onFocus={this.handleChangeFocus.bind(this)}
                    helperText={
                      <SubscriptionFocus
                        me={me}
                        users={editUsers}
                        fieldName="subsectors"
                      />
                    }
                  />
                ) : (
                  ''
                )}
                <Field
                  name="markingDefinitions"
                  component={Autocomplete}
                  multiple={true}
                  label={t('Marking')}
                  options={this.state.markingDefinitions}
                  onInputChange={this.searchMarkingDefinitions.bind(this)}
                  onChange={this.handleChangeMarkingDefinition.bind(this)}
                  onFocus={this.handleChangeFocus.bind(this)}
                  helperText={
                    <SubscriptionFocus
                      me={me}
                      users={editUsers}
                      fieldName="markingDefinitions"
                    />
                  }
                />
              </Form>
              <IdentityCreation
                contextual={true}
                inputValue={this.state.identityInput}
                open={this.state.identityCreation}
                handleClose={this.handleCloseIdentityCreation.bind(this)}
                creationCallback={(data) => {
                  setFieldValue('createdByRef', {
                    label: data.identityAdd.name,
                    value: data.identityAdd.id,
                  });
                  this.handleChangeCreatedByRef('createdByRef', {
                    label: data.identityAdd.name,
                    value: data.identityAdd.id,
                  });
                }}
              />
            </div>
          )}
        />
      </div>
    );
  }
}

SectorEditionOverviewComponent.propTypes = {
  classes: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
  sector: PropTypes.object,
  editUsers: PropTypes.array,
  me: PropTypes.object,
};

const SectorEditionOverview = createFragmentContainer(
  SectorEditionOverviewComponent,
  {
    sector: graphql`
      fragment SectorEditionOverview_sector on Sector {
        id
        name
        description
        isSubsector
        createdByRef {
          node {
            id
            name
            entity_type
          }
          relation {
            id
          }
        }
        subsectors {
          edges {
            node {
              id
              name
            }
            relation {
              id
            }
          }
        }
        markingDefinitions {
          edges {
            node {
              id
              definition
              definition_type
            }
            relation {
              id
            }
          }
        }
      }
    `,
  },
);

export default compose(
  inject18n,
  withStyles(styles, { withTheme: true }),
)(SectorEditionOverview);
