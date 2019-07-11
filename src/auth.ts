import { NextFunction, Request, Response } from 'express';
import pg from './pg';
import { Workflow } from './workflowAllow';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const user = req.headers.authorization; // TYPICALLY MORE COMPLICATED
  if (user === undefined) {
    res.status(401).send();
    return;
  }
  req.body.user = user;
  next();
};

export const authorize = (name?: string) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const actionNameFromAllow: string = req.body.workflowActionName;
  if (actionNameFromAllow !== undefined && name !== undefined && actionNameFromAllow !== name) {
    res.sendStatus(500);
    return;
  }
  const actionName = name !== undefined ? name : actionNameFromAllow;
  if (actionName === undefined) {
    res.sendStatus(500);
    return;
  }
  const user = req.body.user;
  if (user === undefined) {
    res.sendStatus(500);
    return;
  }
  const id = req.body.workflowId;
  if (typeof id !== 'number') {
    res.status(400).send();
    return;
  }
  try {
    let stateId: number = req.body.workflowStateId;
    if (stateId === undefined) {
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
      stateId = workflows[0].stateId;
    }
    const profilePermissions = await pg
      .select<number[]>('permissions_workflow.id')
      .from('users')
      .innerJoin('profiles', 'users.profile_id', 'profiles.id')
      .innerJoin('profiles_permissions', 'profiles.id', 'profiles_permissions.profile_id')
      .innerJoin('permissions', 'profiles_permissions.permission_id', 'permissions.id')
      .innerJoin('permissions_workflow', 'permissions.id', 'permissions_workflow.permission_id')
      .innerJoin(
        'workflow_actions',
        'permissions_workflow.workflow_action_id',
        'workflow_actions.id'
      )
      .where({
        'permissions_workflow.workflow_state_id': stateId,
        'users.name': user,
        'workflow_actions.name': actionName,
      });
    const profilePermission = profilePermissions.length !== 0;
    const permissionSetPermissions = await pg
      .select<number[]>('permissions_workflow.id')
      .from('users')
      .innerJoin('users_permission_sets', 'users.id', 'users_permission_sets.user_id')
      .innerJoin('permission_sets', 'users_permission_sets.permission_set_id', 'permission_sets.id')
      .innerJoin(
        'permission_sets_permissions',
        'permission_sets.id',
        'permission_sets_permissions.permission_set_id'
      )
      .innerJoin('permissions', 'permission_sets_permissions.permission_id', 'permissions.id')
      .innerJoin('permissions_workflow', 'permissions.id', 'permissions_workflow.permission_id')
      .innerJoin(
        'workflow_actions',
        'permissions_workflow.workflow_action_id',
        'workflow_actions.id'
      )
      .where({
        'permissions_workflow.workflow_state_id': stateId,
        'users.name': user,
        'workflow_actions.name': actionName,
      });
    const permissionSetPermission = permissionSetPermissions.length !== 0;
    if (!profilePermission && !permissionSetPermission) {
      res.status(401).send();
      return;
    }
    next();
  } catch (err) {
    res.send(500).send();
    return;
  }
};
