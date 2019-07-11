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

interface WorkflowType {
  id: number;
  name: string;
}

interface WorkflowAction {
  id: number;
  name: string;
}

interface WorkflowState {
  id: number;
}

interface WorkflowActionWithStates extends WorkflowAction {
  workflowStates: WorkflowState[];
}

interface WorkflowTypeWorkflowAction {
  workflow_action_id: number;
  workflow_type_id: number;
}

interface WorkflowStateWorkflowAction {
  workflow_action_id: number;
  workflow_state_id: number;
}

interface WorkflowActionsWithStatesById {
  [key: number]: WorkflowActionWithStates;
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

app.get('/workflow-types', async (req, res) => {
  try {
    const workflowTypes = await pg.select<WorkflowType[]>('id', 'name').from('workflow_types');
    const workflowActions = await pg
      .select<WorkflowAction[]>('id', 'name')
      .from('workflow_actions');
    const typesActions = await pg
      .select<WorkflowTypeWorkflowAction[]>('workflow_type_id', 'workflow_action_id')
      .from('workflow_types_workflow_actions');
    const statesActions = await pg
      .select<WorkflowStateWorkflowAction[]>('workflow_state_id', 'workflow_action_id')
      .from('workflow_states_workflow_actions');
    const workflowActionsWithStates = workflowActions.map<WorkflowActionWithStates>(
      workflowAction => {
        const matchingStatesActions = statesActions.filter(
          stateAction => stateAction.workflow_action_id === workflowAction.id
        );
        const matchingWorkflowStates = matchingStatesActions.map(stateAction => ({
          id: stateAction.workflow_state_id,
        }));
        return { ...workflowAction, workflowStates: matchingWorkflowStates };
      }
    );
    const workflowActionsWithStatesById = workflowActionsWithStates.reduce<
      WorkflowActionsWithStatesById
    >((prev, action) => ({ ...prev, [action.id]: action }), {});
    const workflowTypesWithActions = workflowTypes.map(workflowType => {
      const matchingTypesActions = typesActions.filter(
        typeAction => typeAction.workflow_type_id === workflowType.id
      );
      const matchingWorkflowActions = matchingTypesActions.map(
        typeAction => workflowActionsWithStatesById[typeAction.workflow_action_id]
      );
      return { ...workflowType, workflowActions: matchingWorkflowActions };
    });
    res.send(workflowTypesWithActions);
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
