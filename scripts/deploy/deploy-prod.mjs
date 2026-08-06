/**
 * Production deploy + keep ALL public domains on the new deployment.
 * Do not remove domains — only re-point aliases.
 */
import { execSync } from 'node:child_process'

const SCOPE = 'yabloko69cs-9664s-projects'

/** All production hostnames — keep aliased; non-primary redirect to PRIMARY */
export const PRIMARY_DOMAIN = 'vibe-flows.vercel.app'

export const PRODUCTION_DOMAINS = [
  PRIMARY_DOMAIN,
  'vibeflowe.vercel.app',
  'vibeflows-app.vercel.app',
  'vibeflowapp.vercel.app',
  'vibeflowsapp.vercel.app',
  'vibeflowsweb.vercel.app',
]

function run(cmd) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

// Avoid --format json: Vercel sometimes returns HTML challenge pages
const raw = run(`npx vercel --prod --yes --scope ${SCOPE}`)
console.log(raw)

const match = raw.match(
  /https:\/\/(vibe-flows-[a-z0-9]+-yabloko69cs-9664s-projects\.vercel\.app)/i,
)
const deployment = match?.[1]
if (!deployment) {
  console.error('Could not parse deployment URL from Vercel output')
  process.exit(1)
}

console.log(`Deployed: https://${deployment}`)

for (const domain of PRODUCTION_DOMAINS) {
  console.log(`Alias → ${domain}`)
  try {
    console.log(
      run(
        `npx vercel alias set ${deployment} ${domain} --scope ${SCOPE}`,
      ).trim(),
    )
  } catch (e) {
    console.error(`Alias failed for ${domain}:`, e.message)
  }
}

console.log('All production domains updated:')
for (const d of PRODUCTION_DOMAINS) console.log(`  https://${d}`)
