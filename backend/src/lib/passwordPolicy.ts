/**
 * Règle de mot de passe des comptes internes : longueur d'abord (12 caractères
 * minimum, recommandation actuelle de l'ANSSI et du NIST plutôt qu'un mélange
 * imposé de symboles), refus des mots de passe les plus courants et de ceux
 * qui reprennent le nom ou l'email de la personne.
 */
const MIN_LENGTH = 12
const MAX_LENGTH = 128

// Extrait des mots de passe les plus fréquents (listes publiques de fuites),
// plus des variantes locales évidentes. Comparaison sans casse ni chiffres finaux.
const COMMON = new Set([
  'password', 'motdepasse', 'azerty', 'azertyuiop', 'qwerty', 'qwertyuiop', 'abcdef', 'abc123', 'admin', 'administrateur',
  'administrator', 'welcome', 'bienvenue', 'letmein', 'iloveyou', 'jetaime', 'soleil', 'bonjour', 'secret', 'monkey',
  'dragon', 'football', 'baseball', 'master', 'shadow', 'sunshine', 'princess', 'superman', 'batman', 'trustno1',
  'changeme', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'motdepass', 'signsecure', 'trustflow', 'durabilis', 'benin', 'cotonou',
  'portonovo', 'parakou', 'porto-novo', 'dieuestgrand', 'dieu', 'jesus', 'amour', 'loulou', 'chouchou', 'doudou',
  '123456', '1234567', '12345678', '123456789', '1234567890', '12345678910', '0000000000', '1111111111', '123123123',
  '987654321', 'aaaaaaaaaaaa', 'azerty123', 'qwerty123', 'password1', 'motdepasse1', 'bonjour123', 'admin123',
])

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s._-]/g, '').replace(/[0-9!?@#$%*]+$/, '')
}

export interface PasswordContext {
  email?: string
  nom?: string
  prenom?: string
}

/** Retourne le premier problème trouvé, ou null si le mot de passe est acceptable. */
export function passwordProblem(password: string, context: PasswordContext = {}): string | null {
  if (password.length < MIN_LENGTH) return `Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`
  if (password.length > MAX_LENGTH) return `Le mot de passe ne doit pas dépasser ${MAX_LENGTH} caractères.`
  if (/^(.)\1+$/.test(password)) return 'Le mot de passe ne peut pas répéter un seul caractère.'
  const normalized = normalize(password)
  if (COMMON.has(normalized) || COMMON.has(password.toLowerCase())) return 'Ce mot de passe fait partie des plus utilisés : choisissez-en un autre.'
  if (/^\d+$/.test(password)) return 'Le mot de passe ne peut pas être composé uniquement de chiffres.'

  const personal = [context.email?.split('@')[0], context.nom, context.prenom]
    .map((v) => (v ? normalize(v) : ''))
    .filter((v) => v.length >= 3)
  if (personal.some((p) => normalized.includes(p))) return 'Le mot de passe ne doit pas contenir votre nom ou votre email.'
  return null
}

export const PASSWORD_MIN_LENGTH = MIN_LENGTH
