import bodyParser from 'body-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
// import { Action, authenticate, authorize } from './auth';
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

app.post('/a', workflowAllow(1), (req, res) => {
  res.send({ hello: 'A' });
});

app.post('/b', workflowAllow(2), (req, res) => {
  // TODO: CHANGE WORKFLOW
  res.send({ hello: 'B' });
});

app.post('/c', workflowAllow(3), (req, res) => {
  res.send({ hello: 'C' });
});

app.post('/d', workflowAllow(4), (req, res) => {
  // TODO: CHANGE WORKFLOW
  res.send({ hello: 'D' });
});

app.post('/e', workflowAllow(5), (req, res) => {
  res.send({ hello: 'E' });
});

app.post('/f', workflowAllow(6), (req, res) => {
  res.send({ hello: 'F' });
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));
