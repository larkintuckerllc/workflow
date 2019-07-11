import { NextFunction, Request, Response } from 'express';
import pg from './pg';

export interface Workflow {
  id: number;
  stateId: number;
  typeId: number;
}

export default (actionName: string) => async (req: Request, res: Response, next: NextFunction) => {
  req.body.workflowActionName = actionName;
  const id = req.body.workflowId;
  if (typeof id !== 'number') {
    res.status(400).send();
    return;
  }
  try {
    const workflows = await pg
      .select<Workflow[]>('id', { stateId: 'workflow_state_id' }, { typeId: 'workflow_type_id' })
      .from('workflows')
      .where({
        id,
      });
    if (workflows.length === 0) {
      res.sendStatus(404);
      return;
    }
    const { stateId } = workflows[0];
    req.body.workflow_state_id = stateId;
    const stateActions = await pg
      .select<number[]>('workflow_states_workflow_actions.id')
      .from('workflow_states_workflow_actions')
      .innerJoin(
        'workflow_actions',
        'workflow_states_workflow_actions.workflow_action_id',
        'workflow_actions.id'
      )
      .where({
        'workflow_actions.name': actionName,
        'workflow_states_workflow_actions.workflow_state_id': stateId,
      });
    if (stateActions.length === 0) {
      res.sendStatus(409);
      return;
    }
    next();
  } catch (err) {
    res.sendStatus(500);
    return;
  }
};
