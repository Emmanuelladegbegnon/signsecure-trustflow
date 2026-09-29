import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RoleRoute } from './auth/RoleRoute'
import { ROUTES } from './routes'

import { AccountActivation } from './pages/auth/AccountActivation'
import { Login } from './pages/auth/Login'
import { OtpLogin } from './pages/auth/OtpLogin'

import { Dashboard } from './pages/dashboard/Dashboard'
import { MyFolders } from './pages/dashboard/MyFolders'

import { NewDocument } from './pages/signature/NewDocument'
import { AssignSigners } from './pages/signature/AssignSigners'
import { SignerInvite } from './pages/signature/SignerInvite'
import { ProofReport } from './pages/signature/ProofReport'

import { PublicVerification } from './pages/verification/PublicVerification'
import { VerificationResult } from './pages/verification/VerificationResult'
import { FileComparison } from './pages/verification/FileComparison'
import { PersonalData } from './pages/legal/PersonalData'

import { TraceabilityList } from './pages/traceability/TraceabilityList'
import { TraceabilityDetail } from './pages/traceability/TraceabilityDetail'

import { RegistrationStep1 } from './pages/mobile/RegistrationStep1'
import { CameraCapture } from './pages/mobile/CameraCapture'
import { Observations } from './pages/mobile/Observations'
import { ReportIncident } from './pages/mobile/ReportIncident'
import { TransferRequest } from './pages/mobile/TransferRequest'
import { TransferReception } from './pages/mobile/TransferReception'

import { UserManagement } from './pages/admin/UserManagement'
import { AuditLog } from './pages/admin/AuditLog'
import { PermissionsMatrix } from './pages/admin/PermissionsMatrix'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.login} replace />} />

      {/* Public — sans token, en miroir des routes non protégées d'API_CONTRACT.md
          (/api/auth/login, /api/auth/otp/*, /api/auth/invitation/*, /api/sign/link/*, /api/verify/*) */}
      <Route path={ROUTES.login} element={<Login />} />
      <Route path={ROUTES.otpLogin} element={<OtpLogin />} />
      <Route path={ROUTES.accountActivation} element={<AccountActivation />} />
      <Route path={ROUTES.signerInvite} element={<SignerInvite />} />
      <Route path={ROUTES.verifyPublic} element={<PublicVerification />} />
      <Route path={ROUTES.verifyResult} element={<VerificationResult />} />
      <Route path={ROUTES.compareFiles} element={<FileComparison />} />
      <Route path={ROUTES.personalData} element={<PersonalData />} />

      {/* Protégé — nécessite une session active (voir auth/ProtectedRoute) */}
      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        <Route path={ROUTES.myFolders} element={<MyFolders />} />

        {/* Écrans réservés par rôle (voir auth/access.ts) — confort d'UX, le serveur reste seul juge final */}
        <Route element={<RoleRoute area="sign" />}>
          <Route path={ROUTES.newDocument} element={<NewDocument />} />
          <Route path={ROUTES.assignSigners} element={<AssignSigners />} />
          <Route path={ROUTES.proofReport} element={<ProofReport />} />
        </Route>

        <Route element={<RoleRoute area="trace" />}>
          <Route path={ROUTES.traceabilityList} element={<TraceabilityList />} />
          <Route path={ROUTES.traceabilityDetail} element={<TraceabilityDetail />} />

          <Route path={ROUTES.mobileRegistrationStep1} element={<RegistrationStep1 />} />
          <Route path={ROUTES.mobileCapture} element={<CameraCapture />} />
          <Route path={ROUTES.mobileObservations} element={<Observations />} />
          <Route path={ROUTES.mobileIncident} element={<ReportIncident />} />
          <Route path={ROUTES.mobileTransferRequest} element={<TransferRequest />} />
          <Route path={ROUTES.mobileTransferReception} element={<TransferReception />} />
        </Route>

        <Route element={<RoleRoute area="users" />}>
          <Route path={ROUTES.adminUsers} element={<UserManagement />} />
        </Route>
        <Route element={<RoleRoute area="audit" />}>
          <Route path={ROUTES.adminAuditLog} element={<AuditLog />} />
        </Route>
        <Route element={<RoleRoute area="permissions" />}>
          <Route path={ROUTES.adminPermissions} element={<PermissionsMatrix />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
    </Routes>
  )
}

export default App
