import { NextFunction, Request, Response } from 'express';
import pg from './pg';

export interface Workflow {
  id: number;
  workflow_state_id: number;
  workflow_type_id: number;
}

export default (workflowActionName: string) => async (
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
      .select<any[]>('workflow_states_workflow_actions.id')
      .from('workflow_states_workflow_actions')
      .innerJoin(
        'workflow_actions',
        'workflow_states_workflow_actions.workflow_action_id',
        'workflow_actions.id'
      )
      .where({
        'workflow_actions.name': workflowActionName,
        'workflow_states_workflow_actions.workflow_state_id': workflowStateId,
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
