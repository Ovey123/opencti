import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { Formik, Field, Form } from 'formik';
import { withStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuItem from '@material-ui/core/MenuItem';
import Fab from '@material-ui/core/Fab';
import { Add, Close } from '@material-ui/icons';
import {
  compose, pathOr, pipe, map, pluck, union, assoc,
} from 'ramda';
import * as Yup from 'yup';
import graphql from 'babel-plugin-relay/macro';
import { ConnectionHandler } from 'relay-runtime';
import { parse } from '../../../utils/Time';
import inject18n from '../../../components/i18n';
import {
  QueryRenderer,
  fetchQuery,
  commitMutation,
} from '../../../relay/environment';
import Autocomplete from '../../../components/Autocomplete';
import AutocompleteCreate from '../../../components/AutocompleteCreate';
import TextField from '../../../components/TextField';
import DatePickerField from '../../../components/DatePickerField';
import Select from '../../../components/Select';
import { markingDefinitionsSearchQuery } from '../settings/MarkingDefinitions';
import IdentityCreation, {
  identityCreationIdentitiesSearchQuery,
} from '../common/identities/IdentityCreation';
import { attributesQuery } from '../settings/attributes/AttributesLines';

const styles = (theme) => ({
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    backgroundColor: theme.palette.navAlt.background,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: 0,
  },
  createButton: {
    position: 'fixed',
    bottom: 30,
    right: 30,
  },
  buttons: {
    marginTop: 20,
    textAlign: 'right',
  },
  button: {
    marginLeft: theme.spacing(2),
  },
  header: {
    backgroundColor: theme.palette.navAlt.backgroundHeader,
    padding: '20px 20px 20px 60px',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    left: 5,
  },
  importButton: {
    position: 'absolute',
    top: 15,
    right: 20,
  },
  container: {
    padding: '10px 20px 20px 20px',
  },
});

const reportMutation = graphql`
  mutation ReportCreationMutation($input: ReportAddInput!) {
    reportAdd(input: $input) {
      ...ReportLine_node
    }
  }
`;

const reportValidation = (t) => Yup.object().shape({
  name: Yup.string().required(t('This field is required')),
  published: Yup.date()
    .typeError(t('The value must be a date (YYYY-MM-DD)'))
    .required(t('This field is required')),
  report_class: Yup.string().required(t('This field is required')),
  description: Yup.string(),
});

const sharedUpdater = (store, userId, paginationOptions, newEdge) => {
  const userProxy = store.get(userId);
  const conn = ConnectionHandler.getConnection(
    userProxy,
    'Pagination_reports',
    paginationOptions,
  );
  ConnectionHandler.insertEdgeBefore(conn, newEdge);
};

class ReportCreation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      identities: [],
      identityCreation: false,
      identityInput: '',
      markingDefinitions: [],
    };
  }

  handleOpen() {
    this.setState({ open: true });
  }

  handleClose() {
    this.setState({ open: false });
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
      this.setState({ markingDefinitions });
    });
  }

  onSubmit(values, { setSubmitting, resetForm }) {
    const finalValues = pipe(
      assoc('published', parse(values.published).format()),
      assoc('markingDefinitions', pluck('value', values.markingDefinitions)),
      assoc('createdByRef', values.createdByRef.value),
    )(values);
    commitMutation({
      mutation: reportMutation,
      variables: {
        input: finalValues,
      },
      updater: (store) => {
        const payload = store.getRootField('reportAdd');
        const newEdge = payload.setLinkedRecord(payload, 'node');
        const container = store.getRoot();
        sharedUpdater(
          store,
          container.getDataID(),
          this.props.paginationOptions,
          newEdge,
        );
      },
      setSubmitting,
      onCompleted: () => {
        setSubmitting(false);
        resetForm();
        this.handleClose();
      },
    });
  }

  onReset() {
    this.handleClose();
  }

  render() {
    const { t, classes } = this.props;
    return (
      <div>
        <Fab
          onClick={this.handleOpen.bind(this)}
          color="secondary"
          aria-label="Add"
          className={classes.createButton}
        >
          <Add />
        </Fab>
        <Drawer
          open={this.state.open}
          anchor="right"
          classes={{ paper: classes.drawerPaper }}
          onClose={this.handleClose.bind(this)}
        >
          <div className={classes.header}>
            <IconButton
              aria-label="Close"
              className={classes.closeButton}
              onClick={this.handleClose.bind(this)}
            >
              <Close fontSize="small" />
            </IconButton>
            <Typography variant="h6">{t('Create a report')}</Typography>
          </div>
          <div className={classes.container}>
            <QueryRenderer
              query={attributesQuery}
              variables={{ type: 'report_class' }}
              render={({ props }) => {
                if (props && props.attributes) {
                  const reportClassesEdges = props.attributes.edges;
                  return (
                    <Formik
                      initialValues={{
                        name: '',
                        published: null,
                        description: '',
                        report_class: '',
                        createdByRef: '',
                        markingDefinitions: [],
                      }}
                      validationSchema={reportValidation(t)}
                      onSubmit={this.onSubmit.bind(this)}
                      onReset={this.onReset.bind(this)}
                      render={({
                        submitForm,
                        handleReset,
                        isSubmitting,
                        setFieldValue,
                      }) => (
                        <div>
                          <Form style={{ margin: '20px 0 20px 0' }}>
                            <Field
                              name="name"
                              component={TextField}
                              label={t('Name')}
                              fullWidth={true}
                            />
                            <Field
                              name="published"
                              component={DatePickerField}
                              label={t('Publication date')}
                              fullWidth={true}
                              style={{ marginTop: 20 }}
                            />
                            <Field
                              name="report_class"
                              component={Select}
                              label={t('Report type')}
                              fullWidth={true}
                              inputProps={{
                                name: 'report_class',
                                id: 'report_class',
                              }}
                              containerstyle={{ marginTop: 20, width: '100%' }}
                            >
                              {reportClassesEdges.map((reportClassEdge) => (
                                <MenuItem
                                  key={reportClassEdge.node.id}
                                  value={reportClassEdge.node.value}
                                >
                                  {reportClassEdge.node.value}
                                </MenuItem>
                              ))}
                            </Field>
                            <Field
                              name="description"
                              component={TextField}
                              label={t('Description')}
                              fullWidth={true}
                              multiline={true}
                              rows="4"
                              style={{ marginTop: 20 }}
                            />
                            <Field
                              name="createdByRef"
                              component={AutocompleteCreate}
                              multiple={false}
                              handleCreate={this.handleOpenIdentityCreation.bind(
                                this,
                              )}
                              label={t('Author')}
                              options={this.state.identities}
                              onInputChange={this.searchIdentities.bind(this)}
                            />
                            <Field
                              name="markingDefinitions"
                              component={Autocomplete}
                              multiple={true}
                              label={t('Marking')}
                              options={this.state.markingDefinitions}
                              onInputChange={this.searchMarkingDefinitions.bind(
                                this,
                              )}
                            />
                            <div className={classes.buttons}>
                              <Button
                                variant="contained"
                                onClick={handleReset}
                                disabled={isSubmitting}
                                classes={{ root: classes.button }}
                              >
                                {t('Cancel')}
                              </Button>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={submitForm}
                                disabled={isSubmitting}
                                classes={{ root: classes.button }}
                              >
                                {t('Create')}
                              </Button>
                            </div>
                          </Form>
                          <IdentityCreation
                            contextual={true}
                            inputValue={this.state.identityInput}
                            open={this.state.identityCreation}
                            handleClose={this.handleCloseIdentityCreation.bind(
                              this,
                            )}
                            creationCallback={(data) => {
                              setFieldValue('createdByRef', {
                                label: data.identityAdd.name,
                                value: data.identityAdd.id,
                              });
                            }}
                          />
                        </div>
                      )}
                    />
                  );
                }
                return <div> &nbsp; </div>;
              }}
            />
          </div>
        </Drawer>
      </div>
    );
  }
}

ReportCreation.propTypes = {
  paginationOptions: PropTypes.object,
  classes: PropTypes.object,
  theme: PropTypes.object,
  t: PropTypes.func,
};

export default compose(
  inject18n,
  withStyles(styles),
)(ReportCreation);
