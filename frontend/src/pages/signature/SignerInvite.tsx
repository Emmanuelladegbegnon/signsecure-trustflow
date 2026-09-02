import { useParams } from 'react-router-dom'
import { Icon } from '../../components/ui/Icon'
import { ApplySignature } from './ApplySignature'

/**
 * Point d'entrée réel du signataire externe : /signer/:token.
 *
 * Conformément à CLAUDE.md (§ Sign), le signataire n'a pas de compte et
 * atterrit directement ici depuis le lien à usage unique reçu par email —
 * jamais via la navigation interne (tableau de bord, etc.).
 *
 * La validation du token (signature JWT, expiration 48h, usage unique) est
 * une responsabilité serveur. Ce composant se contente d'afficher les 3
 * états possibles ; le back branchera son verdict à la place de ce mock.
 */
export function SignerInvite() {
  const { token } = useParams<{ token: string }>()

  if (!token || token === 'invalid') {
    return (
      <InviteError
        title="Lien invalide"
        message="Ce lien de signature n'est pas reconnu. Vérifiez l'email reçu ou contactez l'expéditeur du document."
      />
    )
  }

  if (token === 'expired') {
    return (
      <InviteError
        title="Lien expiré"
        message="Ce lien de signature à usage unique a expiré (validité 48h). Demandez à l'expéditeur de renvoyer une invitation."
      />
    )
  }

  return <ApplySignature />
}

function InviteError({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-margin-mobile">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mb-4">
          <Icon name="link_off" className="text-on-error-container" size={28} />
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{message}</p>
      </div>
    </div>
  )
}
