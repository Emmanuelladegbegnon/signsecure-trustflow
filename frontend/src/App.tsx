import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
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
import { UnknownCode } from './pages/verification/UnknownCode'
import { ResultValid } from './pages/verification/ResultValid'
import { ResultRevoked } from './pages/verification/ResultRevoked'
import { FileComparison } from './pages/verification/FileComparison'

import { TraceabilityList } from './pages/traceability/TraceabilityList'
import { TraceabilityDetail } from './pages/traceability/TraceabilityDetail'

import { RegistrationStep1 } from './pages/mobile/RegistrationStep1'
import { CameraCapture } from './pages/mobile/CameraCapture'
import { CodeLabel } from './pages/mobile/CodeLabel'
import { Observations } from './pages/mobile/Observations'
import { RegistrationConfirmation } from './pages/mobile/RegistrationConfirmation'
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
      <Route path={ROUTES.verifyUnknown} element={<UnknownCode />} />
      <Route path={ROUTES.verifyValid} element={<ResultValid />} />
      <Route path={ROUTES.verifyRevoked} element={<ResultRevoked />} />
      <Route path={ROUTES.compareFiles} element={<FileComparison />} />

      {/* Protégé — nécessite une session active (voir auth/ProtectedRoute) */}
      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        <Route path={ROUTES.myFolders} element={<MyFolders />} />

        <Route path={ROUTES.newDocument} element={<NewDocument />} />
        <Route path={ROUTES.assignSigners} element={<AssignSigners />} />
        <Route path={ROUTES.proofReport} element={<ProofReport />} />

        <Route path={ROUTES.traceabilityList} element={<TraceabilityList />} />
        <Route path={ROUTES.traceabilityDetail} element={<TraceabilityDetail />} />

        <Route path={ROUTES.mobileRegistrationStep1} element={<RegistrationStep1 />} />
        <Route path={ROUTES.mobileCapture} element={<CameraCapture />} />
        <Route path={ROUTES.mobileCodeLabel} element={<CodeLabel />} />
        <Route path={ROUTES.mobileObservations} element={<Observations />} />
        <Route path={ROUTES.mobileRegistrationConfirm} element={<RegistrationConfirmation />} />
        <Route path={ROUTES.mobileIncident} element={<ReportIncident />} />
        <Route path={ROUTES.mobileTransferRequest} element={<TransferRequest />} />
        <Route path={ROUTES.mobileTransferReception} element={<TransferReception />} />

        <Route path={ROUTES.adminUsers} element={<UserManagement />} />
        <Route path={ROUTES.adminAuditLog} element={<AuditLog />} />
        <Route path={ROUTES.adminPermissions} element={<PermissionsMatrix />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
    </Routes>
  )
}

export default App
