import type { Domain, Organization, Project, Task } from '@ops-dashboard/core';

const MAX_CONTEXT = 50_000;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/g;

function contextText(value: string, maxLength?: number): string {
  const normalized = value.replace(CONTROL_CHARACTERS, ' ').replace(/\s+/g, ' ').trim();
  return maxLength === undefined ? normalized : Array.from(normalized).slice(0, maxLength).join('');
}

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
  const lines: string[] = [];

  const activeOrganizations = organizations.filter(
    (organization) => !organization.deletedAt && !organization.archivedAt,
  );
  const activeDomains = domains.filter((domain) => !domain.deletedAt && !domain.archivedAt);
  const activeProjects = projects.filter(
    (project) =>
      !project.deletedAt &&
      !project.archivedAt &&
      (project.status === 'active' || project.status === 'paused'),
  );
  const projectMap = new Map(activeProjects.map((project) => [project.id, project]));
  const domainMap = new Map(activeDomains.map((domain) => [domain.id, domain]));
  const organizationMap = new Map(
    activeOrganizations.map((organization) => [organization.id, organization]),
  );

  if (activeOrganizations.length > 0) {
    lines.push('=== ORGANIZATIONS ===');
    for (const organization of activeOrganizations) {
      lines.push(`- ${contextText(organization.name)}`);
    }
    lines.push('');
  }

  if (activeProjects.length > 0) {
    lines.push('=== PROJECTS ===');
    for (const project of activeProjects) {
      const organization = project.orgId ? organizationMap.get(project.orgId) : undefined;
      const domain = project.domainId ? domainMap.get(project.domainId) : undefined;
      const parts = [`[${project.kind}/${project.status}]`, contextText(project.name)];
      if (organization) parts.push(`organization:${contextText(organization.name)}`);
      if (domain) parts.push(`domain:${contextText(domain.name)}`);
      if (project.dueDate) parts.push(`due:${project.dueDate}`);
      if (project.description) parts.push(`description:${contextText(project.description, 120)}`);
      lines.push(`- ${parts.join(' | ')}`);
    }
    lines.push('');
  }

  const openTasks = tasks.filter(
    (task) => !task.deletedAt && task.status !== 'done' && task.status !== 'archived',
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
      const parts = [`[${task.status.toUpperCase()}]`, contextText(task.title)];
      if (task.dueAt) parts.push(`due:${task.dueAt.slice(0, 10)}`);
      if (task.scheduledFor) parts.push(`scheduled:${task.scheduledFor}`);
      if (task.priority > 0) parts.push(`priority:${task.priority}`);
      if (organization) parts.push(`organization:${contextText(organization.name)}`);
      if (project) parts.push(`project:${contextText(project.name)}`);
      if (domain) parts.push(`domain:${contextText(domain.name)}`);
      if (task.tags.length > 0)
        parts.push(`tags:${task.tags.map((tag) => contextText(tag)).join(',')}`);
      lines.push(`- ${parts.join(' | ')}`);
    }
  }

  const context = lines.join('\n');
  return context.length > MAX_CONTEXT ? context.slice(0, MAX_CONTEXT) : context;
}
