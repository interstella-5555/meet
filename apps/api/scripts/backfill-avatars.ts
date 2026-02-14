/**
 * Backfill avatar URLs for seeded users.
 * Reads .seed-cache.json for bio/interests, then sets avatar_url directly in the DB.
 * Pet profiles (bio mentions cats/dogs/animals) get pet photos.
 * Run: bun run scripts/backfill-avatars.ts
 */

const CACHE_PATH = `${import.meta.dir}/.seed-cache.json`;

const FEMALE_NAMES = new Set([
  'Ania', 'Kasia', 'Magda', 'Ola', 'Zuzia', 'Basia', 'Ewa', 'Marta', 'Joanna', 'Agnieszka',
  'Natalia', 'Weronika', 'Paulina', 'Karolina', 'Dominika', 'Sylwia', 'Monika', 'Izabela', 'Patrycja', 'Aleksandra',
  'Kamila', 'Justyna', 'Beata', 'Dorota', 'Renata', 'Hanna', 'Lena', 'Maja', 'Zofia', 'Alicja',
  'Julia', 'Emilia', 'Gabriela', 'Sandra', 'Klaudia', 'Dagmara', 'Marzena', 'Iwona', 'Teresa', 'Celina',
]);

interface SeedUserData {
  name: string;
  email: string;
  bio: string;
  lookingFor: string;
  interests: string[];
}

function detectPetType(bio: string, interests: string[]): 'cat' | 'dog' | null {
  const text = `${bio} ${interests.join(' ')}`.toLowerCase();
  const hasCat = text.includes('kot') || text.includes('koty');
  const hasDog = text.includes('pies') || text.includes('psy') || text.includes('schronisk');
  const hasGenericPet = text.includes('zwierz') || text.includes('weteryn');

  if (hasCat && !hasDog) return 'cat';
  if (hasDog) return 'dog';
  if (hasGenericPet) return 'cat';
  return null;
}

function generateAvatarUrl(user: SeedUserData, index: number): string {
  const pet = detectPetType(user.bio, user.interests);
  if (pet === 'cat') return `https://placekitten.com/${400 + (index % 20)}/${400 + (index % 15)}`;
  if (pet === 'dog') return `https://placedog.net/400/400?id=${index + 1}`;

  const isFemale = FEMALE_NAMES.has(user.name);
  const gender = isFemale ? 'women' : 'men';
  return `https://randomuser.me/api/portraits/${gender}/${index % 100}.jpg`;
}

async function main() {
  const file = Bun.file(CACHE_PATH);
  if (!(await file.exists())) {
    console.error('No seed cache found. Run seed-users.ts first.');
    process.exit(1);
  }

  const seedData: SeedUserData[] = await file.json();
  console.log(`Loaded ${seedData.length} users from cache.`);

  // Read DB URL
  const envPath = `${import.meta.dir}/../.env.local`;
  const envFile = await Bun.file(envPath).text().catch(() => '');
  const mainEnvPath = `${import.meta.dir}/../.env`;
  const mainEnvFile = await Bun.file(mainEnvPath).text().catch(() => '');
  const allEnv = mainEnvFile + '\n' + envFile;
  const dbUrlMatch = allEnv.match(/DATABASE_URL=(.+)/);
  if (!dbUrlMatch) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  const { default: postgres } = await import('postgres');
  const sql = postgres(dbUrlMatch[1].trim());

  let petCount = 0;
  let personCount = 0;

  for (let i = 0; i < seedData.length; i++) {
    const user = seedData[i];
    const avatarUrl = generateAvatarUrl(user, i);
    const pet = detectPetType(user.bio, user.interests);

    if (pet) petCount++;
    else personCount++;

    await sql`
      UPDATE profiles
      SET avatar_url = ${avatarUrl}
      WHERE user_id IN (
        SELECT id FROM "user" WHERE email = ${user.email}
      )
    `;
  }

  await sql.end();
  console.log(`Done! Set ${personCount} person avatars, ${petCount} pet avatars.`);
}

main().catch(console.error);
