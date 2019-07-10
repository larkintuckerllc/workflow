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
  const workflowActionNameFromAllow: string = req.body.workflow_action_name;
  if (
    workflowActionNameFromAllow !== undefined &&
    name !== undefined &&
    workflowActionNameFromAllow !== name
  ) {
    res.sendStatus(500);
    return;
  }
  const workflowActionName = name !== undefined ? name : workflowActionNameFromAllow;
  if (workflowActionName === undefined) {
    res.sendStatus(500);
    return;
  }
  const user = req.body.user;
  if (user === undefined) {
    res.sendStatus(500);
    return;
  }
  const workflow_id = req.body.workflow_id;
  if (typeof workflow_id !== 'number') {
    res.status(400).send();
    return;
  }
  try {
    let workflowStateId: number = req.body.workflow_state_id;
    if (workflowStateId === undefined) {
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
      workflowStateId = workflows[0].workflow_state_id;
    }
    const profilePermissions = await pg
      .select<any[]>('permissions_workflow.id')
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
        'permissions_workflow.workflow_state_id': workflowStateId,
        'users.name': user,
        'workflow_actions.name': workflowActionName,
      });
    const profilePermission = profilePermissions.length !== 0;
    const permissionSetPermissions = await pg
      .select<any[]>('permissions_workflow.id')
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
        'permissions_workflow.workflow_state_id': workflowStateId,
        'users.name': user,
        'workflow_actions.name': workflowActionName,
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
