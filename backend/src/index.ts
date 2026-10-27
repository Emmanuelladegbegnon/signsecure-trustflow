import { createApp } from './app.js'
import { env } from './env.js'
import { isFileEncryptionEnabled } from './lib/fileCrypto.js'
import { startScheduler } from './lib/scheduler.js'
import { registerSealCertificate } from './lib/pdfSeal.js'

const app = createApp()

app.listen(env.port, () => {
  console.log(`SignSecure TrustFlow API — http://localhost:${env.port}`)
  if (!isFileEncryptionEnabled()) {
    console.warn('[Sécurité] FILE_ENCRYPTION_KEY absente : les nouveaux fichiers seront stockés EN CLAIR sur disque (voir .env.example).')
  }
  registerSealCertificate().catch((err) => console.error('[Cachet] Enregistrement du certificat impossible :', err))
  startScheduler()
})
