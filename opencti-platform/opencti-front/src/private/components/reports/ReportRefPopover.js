import React, { Component } from 'react';
import * as PropTypes from 'prop-types';
import { compose } from 'ramda';
import graphql from 'babel-plugin-relay/macro';
import { withStyles } from '@material-ui/core/styles/index';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Slide from '@material-ui/core/Slide';
import MoreVert from '@material-ui/icons/MoreVert';
import inject18n from '../../../components/i18n';
import { commitMutation, fetchQuery } from '../../../relay/environment';
import { stixRelationEditionDeleteMutation } from '../common/stix_relations/StixRelationEdition';

const styles = theme => ({
  container: {
    margin: 0,
  },
  drawerPaper: {
    minHeight: '100vh',
    width: '50%',
    position: 'fixed',
    overflow: 'auto',
    backgroundColor: theme.palette.navAlt.background,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    padding: 0,
  },
});

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));
Transition.displayName = 'TransitionSlide';

const reportRefPopoverDeletionMutation = graphql`
  mutation ReportRefPopoverDeletionMutation(
    $id: ID!
    $relationId: ID!
    $relationType: String
  ) {
    reportEdit(id: $id) {
      relationDelete(relationId: $relationId) {
        node {
          ...ReportEntities_report
          ...ReportObservablesLines_report @arguments(relationType: $relationType)
        }
      }
    }
  }
`;

const reportRefPopoverCheckRelationQuery = graphql`
  query ReportRefPopoverCheckRelationQuery($id: String!) {
    stixRelation(id: $id) {
      id
      reports {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

class ReportRefPopover extends Component {
  constructor(props) {
    super(props);
    this.state = {
      anchorEl: null,
      displayDelete: false,
      deleting: false,
    };
  }

  handleOpen(event) {
    this.setState({ anchorEl: event.currentTarget });
    event.stopPropagation();
  }

  handleClose() {
    this.setState({ anchorEl: null });
  }

  handleOpenDelete() {
    this.setState({ displayDelete: true });
    this.handleClose();
  }

  handleCloseDelete() {
    this.setState({ deleting: false, displayDelete: false });
  }

  submitDelete() {
    this.setState({ deleting: true });
    if (this.props.isRelation) {
      fetchQuery(reportRefPopoverCheckRelationQuery, {
        id: this.props.entityId,
      }).then((data) => {
        if (data.stixRelation.reports.edges.length === 1) {
          commitMutation({
            mutation: stixRelationEditionDeleteMutation,
            variables: {
              id: this.props.entityId,
            },
          });
        }
        commitMutation({
          mutation: reportRefPopoverDeletionMutation,
          variables: {
            id: this.props.reportId,
            relationId: this.props.secondaryRelationId,
            relationType: 'indicates',
          },
        });
      });
    }
    commitMutation({
      mutation: reportRefPopoverDeletionMutation,
      variables: {
        id: this.props.reportId,
        relationId: this.props.relationId,
        relationType: 'indicates',
      },
      onCompleted: () => {
        this.handleCloseDelete();
      },
    });
  }

  render() {
    const { classes, t } = this.props;
    return (
      <div className={classes.container}>
        <IconButton onClick={this.handleOpen.bind(this)} aria-haspopup="true">
          <MoreVert />
        </IconButton>
        <Menu
          anchorEl={this.state.anchorEl}
          open={Boolean(this.state.anchorEl)}
          onClose={this.handleClose.bind(this)}
          style={{ marginTop: 50 }}
        >
          <MenuItem onClick={this.handleOpenDelete.bind(this)}>
            {t('Remove')}
          </MenuItem>
        </Menu>
        <Dialog
          open={this.state.displayDelete}
          keepMounted={true}
          TransitionComponent={Transition}
          onClose={this.handleCloseDelete.bind(this)}
        >
          <DialogContent>
            <DialogContentText>
              {t('Do you want to remove the entity from this report?')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={this.handleCloseDelete.bind(this)}
              color="primary"
              disabled={this.state.deleting}
            >
              {t('Cancel')}
            </Button>
            <Button
              onClick={this.submitDelete.bind(this)}
              color="primary"
              disabled={this.state.deleting}
            >
              {t('Remove')}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

ReportRefPopover.propTypes = {
  reportId: PropTypes.string,
  entityId: PropTypes.string,
  relationId: PropTypes.string,
  secondaryRelationId: PropTypes.string,
  isRelation: PropTypes.bool,
  paginationOptions: PropTypes.object,
  classes: PropTypes.object,
  t: PropTypes.func,
};

export default compose(
  inject18n,
  withStyles(styles),
)(ReportRefPopover);
