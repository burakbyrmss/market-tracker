// Queues an EAS development build for each platform whose native fingerprint has no usable
// build yet. A change that only touches JavaScript or docs keeps the fingerprint, so the
// existing development build still works and no build quota is spent.
import { execFileSync } from 'node:child_process';

const PROFILE = 'development';
// Builds in these states already serve, or will serve, this fingerprint.
const USABLE = new Set(['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'FINISHED']);

function eas(args) {
  return execFileSync('eas', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

const toBuild = [];
for (const platform of ['ios', 'android']) {
  const { hash } = JSON.parse(
    eas(['fingerprint:generate', '-p', platform, '-e', PROFILE, '--json', '--non-interactive']),
  );
  const builds = JSON.parse(
    eas([
      'build:list',
      '-p',
      platform,
      '-e',
      PROFILE,
      '--fingerprint-hash',
      hash,
      '--json',
      '--non-interactive',
      '--limit',
      '10',
    ]),
  );
  const existing = builds.find((build) => USABLE.has(build.status));
  if (existing) {
    console.log(
      `${platform}: fingerprint ${hash} already has build ${existing.id} (${existing.status}). Skipping.`,
    );
  } else {
    console.log(`${platform}: fingerprint ${hash} has no usable build. Queuing one.`);
    toBuild.push(platform);
  }
}

if (toBuild.length > 0) {
  const platform = toBuild.length === 2 ? 'all' : toBuild[0];
  execFileSync(
    'eas',
    ['build', '--profile', PROFILE, '--platform', platform, '--non-interactive', '--no-wait'],
    { stdio: 'inherit' },
  );
}
