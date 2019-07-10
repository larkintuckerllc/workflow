import bodyParser from 'body-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { authenticate, authorize } from './auth';
import pg from './pg';
import workflowAllow, { Workflow } from './workflowAllow';

const WORKFLOW_TYPE_ID = 1;
const INITIAL_WORKFLOW_STATE_ID = 1;

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => res.send({ hello: 'world' }));

app.get('/workflows', async (req, res) => {
  try {
    const workflows = await pg
      .select<Workflow[]>('id', 'workflow_state_id', 'workflow_type_id')
      .from('workflows');
    res.send(workflows);
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
      workflow_state_id: INITIAL_WORKFLOW_STATE_ID,
      workflow_type_id: WORKFLOW_TYPE_ID,
    };
    res.send(workflow);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/a', authenticate, workflowAllow(1), authorize(1), (req, res) => {
  res.send({ hello: 'A' });
});

app.post('/b', authenticate, workflowAllow(2), authorize(2), async (req, res) => {
  const workflow_id = req.body.workflow_id; // ALREADY VALIDATED
  try {
    await pg('workflows')
      .where('id', workflow_id)
      .update({
        workflow_state_id: 2,
      });
    res.send({ hello: 'B (State Changed)' });
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/c', authenticate, workflowAllow(3), authorize(3), (req, res) => {
  res.send({ hello: 'C' });
});

app.post('/d', authenticate, workflowAllow(4), authorize(4), async (req, res) => {
  const workflow_id = req.body.workflow_id; // ALREADY VALIDATED
  try {
    await pg('workflows')
      .where('id', workflow_id)
      .update({
        workflow_state_id: 3,
      });
    res.send({ hello: 'D (State Changed)' });
  } catch (err) {
    res.sendStatus(500);
  }
});

app.post('/e', authenticate, workflowAllow(5), authorize(5), (req, res) => {
  res.send({ hello: 'E' });
});

app.post('/f', authenticate, workflowAllow(6), authorize(6), (req, res) => {
  res.send({ hello: 'F' });
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
