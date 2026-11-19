import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import HandoversPage from './pages/HandoversPage.jsx';
import HandoverDetailPage from './pages/HandoverDetailPage.jsx';
import NewHandoverPage from './pages/NewHandoverPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/handovers" element={<HandoversPage />} />
        <Route path="/handovers/new" element={<NewHandoverPage />} />
        <Route path="/handovers/:handoverId" element={<HandoverDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
