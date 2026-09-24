import { CriticalCasesQueue } from "./components/dashboard/CriticalCasesQueue";
import { DocumentUpload } from "./components/dashboard/DocumentUpload";
import { DashboardLayout } from "./layout/DashboardLayout";
import { DocumentCount } from "./layout/DocumentCount";

function App() {
  return (
    <>
      <DashboardLayout>
        <DocumentCount />
        <DocumentUpload />
        <CriticalCasesQueue />
      </DashboardLayout>
    </>
  );
}

export default App;
