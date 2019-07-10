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

app.post('/a', authenticate, workflowAllow('A'), authorize('A'), (req, res) => {
  res.send({ hello: 'A' });
});

app.post('/b', authenticate, workflowAllow('B'), authorize('B'), async (req, res) => {
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

app.post('/c', authenticate, workflowAllow('C'), authorize('C'), (req, res) => {
  res.send({ hello: 'C' });
});

app.post('/d', authenticate, workflowAllow('D'), authorize('D'), async (req, res) => {
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

app.post('/e', authenticate, workflowAllow('E'), authorize('E'), (req, res) => {
  res.send({ hello: 'E' });
});

app.post('/f', authenticate, workflowAllow('F'), authorize('F'), (req, res) => {
  res.send({ hello: 'F' });
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
