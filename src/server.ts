import bodyParser from 'body-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { authenticate, authorize } from './auth';
import pg from './pg';
import workflowAllow, { Workflow } from './workflowAllow';

interface User {
  id: number;
  name: string;
  profileId: number;
}

interface WorkflowTypesActionsStates {
  workflow_type_id: number;
  'workflow_actions.name': number;
  workflow_state_id: number;
}

const WORKFLOW_TYPE_ID = 1;
const INITIAL_WORKFLOW_STATE_ID = 1;

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => res.send({ hello: 'world' }));

app.get('/users', async (req, res) => {
  try {
    const users = await pg.select<User[]>('id', 'name', { profileId: 'profile_id' }).from('users');
    res.send(users);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.get('/workflows', async (req, res) => {
  try {
    const workflows = await pg
      .select<Workflow[]>('id', { stateId: 'workflow_state_id' }, { typeId: 'workflow_type_id' })
      .from('workflows');
    res.send(workflows);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.get('/workflow-types-actions-states', async (req, res) => {
  try {
    const workflowTypesActionsStates = await pg
      .select<WorkflowTypesActionsStates[]>(
        'workflow_types_workflow_actions.workflow_type_id',
        {
          'workflow_actions.name': 'workflow_actions.name',
        },
        'workflow_states_workflow_actions.workflow_state_id'
      )
      .from('workflow_types_workflow_actions')
      .innerJoin(
        'workflow_actions',
        'workflow_types_workflow_actions.workflow_action_id',
        'workflow_actions.id'
      )
      .leftOuterJoin(
        'workflow_states_workflow_actions',
        'workflow_types_workflow_actions.workflow_action_id',
        'workflow_states_workflow_actions.workflow_action_id'
      );
    // TODO: NEED ANOTHER JOIN FOR ONLY STATES OF WORKFLOW TYPE
    // TODO: CLEAN UP DATA
    res.send(workflowTypesActionsStates);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/workflows', async (req, res) => {
  try {
    const [id] = await pg('workflows')
      .returning('id')
      .insert({
        workflow_state_id: INITIAL_WORKFLOW_STATE_ID,
        workflow_type_id: WORKFLOW_TYPE_ID,
      });
    const workflow = {
      id,
      stateId: INITIAL_WORKFLOW_STATE_ID,
      typeId: WORKFLOW_TYPE_ID,
    };
    res.send(workflow);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/a', authenticate, workflowAllow('A'), authorize(), (req, res) => {
  res.send({ hello: 'A' });
});

app.post('/b', authenticate, workflowAllow('B'), authorize(), async (req, res) => {
  const workflowId = req.body.workflowId;
  if (workflowId === undefined) {
    res.sendStatus(400);
    return;
  }
  try {
    await pg('workflows')
      .where('id', workflowId)
      .update({
        workflow_state_id: 2,
      });
    res.send({ hello: 'B (State Changed)' });
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/c', authenticate, workflowAllow('C'), authorize(), (req, res) => {
  res.send({ hello: 'C' });
});

app.post('/d', authenticate, workflowAllow('D'), authorize(), async (req, res) => {
  const workflowId = req.body.workflowId;
  if (workflowId === undefined) {
    res.sendStatus(400);
    return;
  }
  try {
    await pg('workflows')
      .where('id', workflowId)
      .update({
        workflow_state_id: 3,
      });
    res.send({ hello: 'D (State Changed)' });
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/e', authenticate, workflowAllow('E'), authorize(), (req, res) => {
  res.send({ hello: 'E' });
});

// EXAMPLE OF NOT USING WORKFLOW ALLOW
app.post('/f', authenticate, authorize('F'), (req, res) => {
  res.send({ hello: 'F' });
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
