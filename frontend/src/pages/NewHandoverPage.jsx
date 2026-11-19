import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBanner, Loading, PageHeader, useLoader } from '../components/ui.jsx';
import HandoverForm from '../components/HandoverForm.jsx';
import { api } from '../services/api.js';

export default function NewHandoverPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId') ?? '';

  const lookups = useLoader(async () => {
    const [projects, employees] = await Promise.all([api.listProjects(), api.listEmployees()]);
    return { projects, employees };
  });

  const create = async (payload) => {
    const created = await api.createHandover(payload);
    navigate(`/handovers/${created.id}`);
  };

  return (
    <>
      <PageHeader title="New handover" />
      <p className="page-intro">
        Handovers start as drafts. Edit the draft, submit it for review, then the incoming employee acknowledges it.
      </p>
      <ErrorBanner message={lookups.error} onRetry={lookups.reload} />
      {lookups.loading && <Loading />}
      {lookups.data && (
        <section className="panel">
          <HandoverForm
            projects={lookups.data.projects}
            employees={lookups.data.employees}
            fixedProjectId={projectId || undefined}
            onCancel={() => navigate(projectId ? `/projects/${projectId}` : '/handovers')}
            onSubmit={create}
          />
        </section>
      )}
      <Link to="/handovers">Back to handovers</Link>
    </>
  );
}
