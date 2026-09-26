import { CriticalCasesQueue } from "./components/dashboard/CriticalCasesQueue";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { DashboardLayout } from "./layout/DashboardLayout";
import { DocumentCount } from "./components/dashboard/DocumentCount";
import { DashboardFooter } from "./components/dashboard/DashboardFooter";

function App() {
  return (
    <>
      <DashboardLayout>
        <DocumentCount />
        <DocumentUpload />
        <CriticalCasesQueue />
        <DashboardFooter></DashboardFooter>
      </DashboardLayout>
    </>
  );
}

export default App;
