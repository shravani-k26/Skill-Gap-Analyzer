import { Routes, Route } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

import HomePage from "./pages/Home/HomePage";
import LoginPage from "./pages/Login/LoginPage";
import RegisterPage from "./pages/Register/RegisterPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import NotFoundPage from "./pages/NotFound/NotFoundPage";
import LearnerProfilePage from "./pages/LearnerProfile/LearnerProfilePage";
import SkillAssessmentPage from "./pages/SkillAssessment/SkillAssessmentPage";
import RoleManagementPage from "./pages/RoleManagement/RoleManagementPage";
import JobDescriptionPage from "./pages/JobDescription/JobDescriptionPage";
import SkillGapAnalysisPage from "./pages/SkillGapAnalysis/SkillGapAnalysisPage";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/learner-profile"
            element={<LearnerProfilePage />}
          />
          <Route
            path="/skill-assessment"
            element={<SkillAssessmentPage />}
          />
          <Route
            path="/role-management"
            element={<RoleManagementPage />}
          />
          <Route
            path="/job-descriptions"
            element={<JobDescriptionPage />}
          />
          <Route
            path="/skill-gap-analysis"
            element={<SkillGapAnalysisPage />}
          />
        </Route>    
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;