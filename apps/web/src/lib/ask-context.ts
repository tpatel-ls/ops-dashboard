import type { Domain, Organization, Project, Task } from '@ops-dashboard/core';

const MAX_CONTEXT = 50_000;

export function buildWorkContext({
  tasks,
  projects,
  domains,
  organizations,
}: {
  tasks: Task[];
  projects: Project[];
  domains: Domain[];
  organizations: Organization[];
}): string {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const domainMap = new Map(domains.map((domain) => [domain.id, domain]));
  const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));
  const lines: string[] = [];

  const activeOrganizations = organizations.filter(
    (organization) => !organization.deletedAt && !organization.archivedAt,
  );
  if (activeOrganizations.length > 0) {
    lines.push('=== ORGANIZATIONS ===');
    for (const organization of activeOrganizations) {
      lines.push(`- ${organization.name}`);
    }
    lines.push('');
  }

  const activeProjects = projects.filter(
    (project) =>
      !project.deletedAt &&
      !project.archivedAt &&
      (project.status === 'active' || project.status === 'paused'),
  );
  if (activeProjects.length > 0) {
    lines.push('=== PROJECTS ===');
    for (const project of activeProjects) {
      const organization = project.orgId ? organizationMap.get(project.orgId) : undefined;
      const domain = project.domainId ? domainMap.get(project.domainId) : undefined;
      const parts = [`[${project.kind}/${project.status}]`, project.name];
      if (organization) parts.push(`organization:${organization.name}`);
      if (domain) parts.push(`domain:${domain.name}`);
      if (project.dueDate) parts.push(`due:${project.dueDate}`);
      if (project.description) parts.push(`description:${project.description.slice(0, 120)}`);
      lines.push(`- ${parts.join(' | ')}`);
    }
    lines.push('');
  }

  const openTasks = tasks.filter(
    (task) =>
      !task.deletedAt && task.status !== 'done' && task.status !== 'archived',
  );
  if (openTasks.length > 0) {
    lines.push('=== OPEN TASKS ===');
    for (const task of openTasks) {
      const project = task.projectId ? projectMap.get(task.projectId) : undefined;
      const organization = task.orgId
        ? organizationMap.get(task.orgId)
        : project?.orgId
          ? organizationMap.get(project.orgId)
          : undefined;
      const domain = task.domainId
        ? domainMap.get(task.domainId)
        : project?.domainId
          ? domainMap.get(project.domainId)
          : undefined;
      const parts = [`[${task.status.toUpperCase()}]`, task.title];
      if (task.dueAt) parts.push(`due:${task.dueAt.slice(0, 10)}`);
      if (task.scheduledFor) parts.push(`scheduled:${task.scheduledFor}`);
      if (task.priority > 0) parts.push(`priority:${task.priority}`);
      if (organization) parts.push(`organization:${organization.name}`);
      if (project) parts.push(`project:${project.name}`);
      if (domain) parts.push(`domain:${domain.name}`);
      if (task.tags.length > 0) parts.push(`tags:${task.tags.join(',')}`);
      lines.push(`- ${parts.join(' | ')}`);
    }
  }

  const context = lines.join('\n');
  return context.length > MAX_CONTEXT ? context.slice(0, MAX_CONTEXT) : context;
}
