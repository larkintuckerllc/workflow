import bodyParser from 'body-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
// import { Action, authenticate, authorize } from './auth';
import pg from './pg';

const WORKFLOW_TYPE_ID = 1;
const WORKFLOW_STATE_ID = 1;

// TODO: MOVE OUT
interface Workflow {
  id: number;
  workflow_state_id: number;
  workflow_type_id: number;
}

const middleware = (workflowActionId: number) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const workflow_id = req.body.workflow_id;
  if (typeof workflow_id !== 'number') {
    res.status(400).send();
    return;
  }
  try {
    const workflows = await pg
      .select<Workflow[]>('id', 'workflow_state_id', 'workflow_type_id')
      .from('workflows')
      .where({
        id: workflow_id,
      });
    if (workflows.length === 0) {
      res.sendStatus(404);
      return;
    }
    const { workflow_state_id: workflowStateId } = workflows[0];
    const stateActions = await pg
      .select<any[]>('id')
      .from('workflow_states_workflow_actions')
      .where({
        workflow_action_id: workflowActionId,
        workflow_state_id: workflowStateId,
      });
    if (stateActions.length === 0) {
      res.sendStatus(409);
      return;
    }
    next();
  } catch (err) {
    res.send(500).send();
    return;
  }
};

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => res.send({ hello: 'world' }));

app.post('/a', middleware(1), (req, res) => {
  res.send({ hello: 'A' });
});

app.post('/b', middleware(2), (req, res) => {
  res.send({ hello: 'B' });
});

app.post('/c', middleware(3), (req, res) => {
  res.send({ hello: 'C' });
});

app.post('/d', middleware(4), (req, res) => {
  res.send({ hello: 'D' });
});

app.post('/e', middleware(5), (req, res) => {
  res.send({ hello: 'E' });
});

app.post('/f', middleware(6), (req, res) => {
  res.send({ hello: 'F' });
});

app.post('/workflows', async (req, res) => {
  try {
    const [id] = await pg('workflows')
      .returning('id')
      .insert({
        workflow_state_id: WORKFLOW_STATE_ID,
        workflow_type_id: WORKFLOW_TYPE_ID,
      });
    const workflow = {
      id,
      workflow_state_id: WORKFLOW_STATE_ID,
      workflow_type_id: WORKFLOW_TYPE_ID,
    };
    res.send(workflow);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
