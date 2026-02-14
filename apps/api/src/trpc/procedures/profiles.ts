import { z } from 'zod';
import { eq, and, ne, or, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { router, protectedProcedure } from '../trpc';
import { db } from '../../db';
import { profiles, blocks, connectionSnippets } from '../../db/schema';
import {
  createProfileSchema,
  updateProfileSchema,
  updateLocationSchema,
  getNearbyUsersSchema,
  getNearbyUsersForMapSchema,
} from '@repo/shared';
import { toGridCenter, roundDistance } from '../../lib/grid';
import {
  generateEmbedding,
  generateSocialProfile,
  extractInterests,
  generateConnectionSnippet,
} from '../../services/ai';

function profileHash(bio: string, lookingFor: string): string {
  return createHash('sha256')
    .update(`${bio}|${lookingFor}`)
    .digest('hex')
    .slice(0, 8);
}

export const profilesRouter = router({
  // Get current user's profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, ctx.userId));

    return profile || null;
  }),

  // Create profile
  create: protectedProcedure
    .input(createProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if profile already exists
      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, ctx.userId));

      if (existing) {
        throw new Error('Profile already exists');
      }

      // Pipeline: bio+lookingFor → socialProfile → (embedding, interests)
      const socialProfile = await generateSocialProfile(
        input.bio,
        input.lookingFor
      );

      const [embedding, interests] = await Promise.all([
        generateEmbedding(socialProfile),
        extractInterests(socialProfile),
      ]);

      const [profile] = await db
        .insert(profiles)
        .values({
          userId: ctx.userId,
          displayName: input.displayName,
          bio: input.bio,
          lookingFor: input.lookingFor,
          socialProfile,
          interests,
          embedding,
        })
        .returning();

      return profile;
    }),

  // Update profile
  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        ...input,
        updatedAt: new Date(),
      };

      // Regenerate socialProfile + embedding + interests if bio or lookingFor changed
      if (input.bio || input.lookingFor) {
        const [currentProfile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, ctx.userId));

        if (currentProfile) {
          const bio = input.bio || currentProfile.bio;
          const lookingFor = input.lookingFor || currentProfile.lookingFor;

          const socialProfile = await generateSocialProfile(bio, lookingFor);
          const [embedding, interests] = await Promise.all([
            generateEmbedding(socialProfile),
            extractInterests(socialProfile),
          ]);

          updateData.socialProfile = socialProfile;
          updateData.embedding = embedding;
          updateData.interests = interests;
        }
      }

      const [profile] = await db
        .update(profiles)
        .set(updateData)
        .where(eq(profiles.userId, ctx.userId))
        .returning();

      return profile;
    }),

  // Update location
  updateLocation: protectedProcedure
    .input(updateLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const [profile] = await db
        .update(profiles)
        .set({
          latitude: input.latitude,
          longitude: input.longitude,
          lastLocationUpdate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, ctx.userId))
        .returning();

      return profile;
    }),

  // Get nearby users
  getNearbyUsers: protectedProcedure
    .input(getNearbyUsersSchema)
    .query(async ({ ctx, input }) => {
      const { latitude, longitude, radiusMeters, limit } = input;

      // Calculate bounding box for initial filter (uses index!)
      // ~111km per degree latitude, longitude varies by latitude
      const latDelta = radiusMeters / 111000;
      const lonDelta =
        radiusMeters / (111000 * Math.cos((latitude * Math.PI) / 180));

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;
      const minLon = longitude - lonDelta;
      const maxLon = longitude + lonDelta;

      // Get blocked users and current profile in parallel
      const [blockedUsers, blockedByUsers, currentProfileResult] =
        await Promise.all([
          db
            .select({ blockedId: blocks.blockedId })
            .from(blocks)
            .where(eq(blocks.blockerId, ctx.userId)),
          db
            .select({ blockerId: blocks.blockerId })
            .from(blocks)
            .where(eq(blocks.blockedId, ctx.userId)),
          db.select().from(profiles).where(eq(profiles.userId, ctx.userId)),
        ]);

      const allBlockedIds = new Set([
        ...blockedUsers.map((b) => b.blockedId),
        ...blockedByUsers.map((b) => b.blockerId),
      ]);

      const currentProfile = currentProfileResult[0];

      // Query with bounding box filter first (fast, uses index)
      // Then calculate exact Haversine distance
      const distanceFormula = sql<number>`
        6371000 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(${profiles.latitude})) *
            cos(radians(${profiles.longitude}) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(${profiles.latitude}))
          ))
        )
      `;

      const nearbyUsers = await db
        .select({
          profile: profiles,
          distance: distanceFormula,
        })
        .from(profiles)
        .where(
          and(
            ne(profiles.userId, ctx.userId),
            eq(profiles.isHidden, false),
            // Bounding box filter (uses index)
            sql`${profiles.latitude} BETWEEN ${minLat} AND ${maxLat}`,
            sql`${profiles.longitude} BETWEEN ${minLon} AND ${maxLon}`,
            // Exact distance filter
            sql`${distanceFormula} <= ${radiusMeters}`
          )
        )
        .orderBy(distanceFormula)
        .limit(limit + allBlockedIds.size); // Fetch extra to account for filtered

      // Filter blocked and calculate similarity in one pass
      const results = [];
      for (const u of nearbyUsers) {
        if (allBlockedIds.has(u.profile.userId)) continue;
        if (results.length >= limit) break;

        let similarityScore: number | null = null;
        if (currentProfile?.embedding && u.profile.embedding) {
          similarityScore = cosineSimilarity(
            currentProfile.embedding,
            u.profile.embedding
          );
        }

        results.push({
          profile: u.profile,
          distance: u.distance,
          similarityScore,
        });
      }

      return results;
    }),

  // Get nearby users for map view (with grid-based privacy + ranking)
  getNearbyUsersForMap: protectedProcedure
    .input(getNearbyUsersForMapSchema)
    .query(async ({ ctx, input }) => {
      const { latitude, longitude, radiusMeters, limit } = input;

      // Calculate bounding box for initial filter (uses index!)
      const latDelta = radiusMeters / 111000;
      const lonDelta =
        radiusMeters / (111000 * Math.cos((latitude * Math.PI) / 180));

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;
      const minLon = longitude - lonDelta;
      const maxLon = longitude + lonDelta;

      // Get blocked users + current profile in parallel
      const [blockedUsers, blockedByUsers, currentProfileResult] =
        await Promise.all([
          db
            .select({ blockedId: blocks.blockedId })
            .from(blocks)
            .where(eq(blocks.blockerId, ctx.userId)),
          db
            .select({ blockerId: blocks.blockerId })
            .from(blocks)
            .where(eq(blocks.blockedId, ctx.userId)),
          db.select().from(profiles).where(eq(profiles.userId, ctx.userId)),
        ]);

      const allBlockedIds = new Set([
        ...blockedUsers.map((b) => b.blockedId),
        ...blockedByUsers.map((b) => b.blockerId),
      ]);

      const currentProfile = currentProfileResult[0];

      // Haversine distance formula
      const distanceFormula = sql<number>`
        6371000 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${latitude})) * cos(radians(${profiles.latitude})) *
            cos(radians(${profiles.longitude}) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(${profiles.latitude}))
          ))
        )
      `;

      const nearbyUsers = await db
        .select({
          profile: profiles,
          distance: distanceFormula,
        })
        .from(profiles)
        .where(
          and(
            ne(profiles.userId, ctx.userId),
            eq(profiles.isHidden, false),
            sql`${profiles.latitude} BETWEEN ${minLat} AND ${maxLat}`,
            sql`${profiles.longitude} BETWEEN ${minLon} AND ${maxLon}`,
            sql`${distanceFormula} <= ${radiusMeters}`
          )
        )
        .orderBy(distanceFormula)
        .limit(limit + allBlockedIds.size);

      const myInterests = currentProfile?.interests ?? [];
      const myEmbedding = currentProfile?.embedding ?? null;

      // Filter blocked users, calculate ranking, add grid positions
      const results = [];
      for (const u of nearbyUsers) {
        if (allBlockedIds.has(u.profile.userId)) continue;
        if (results.length >= limit) break;

        const gridPos = toGridCenter(
          u.profile.latitude!,
          u.profile.longitude!
        );

        // Ranking calculation
        const proximity = 1 - Math.min(u.distance, radiusMeters) / radiusMeters;

        let similarity: number | null = null;
        if (myEmbedding?.length && u.profile.embedding?.length) {
          similarity = cosineSimilarity(myEmbedding, u.profile.embedding);
        }

        const theirInterests = u.profile.interests ?? [];
        const commonInterests = myInterests.filter((i) =>
          theirInterests.includes(i)
        );
        const interestScore =
          myInterests.length > 0
            ? commonInterests.length / myInterests.length
            : 0;

        const matchScore =
          similarity != null
            ? 0.7 * similarity + 0.3 * interestScore
            : interestScore;
        const rankScore = 0.6 * matchScore + 0.4 * proximity;

        results.push({
          profile: {
            id: u.profile.id,
            userId: u.profile.userId,
            displayName: u.profile.displayName,
            bio: u.profile.bio,
            lookingFor: u.profile.lookingFor,
            avatarUrl: u.profile.avatarUrl,
          },
          distance: roundDistance(u.distance),
          gridLat: gridPos.gridLat,
          gridLng: gridPos.gridLng,
          gridId: gridPos.gridId,
          rankScore: Math.round(rankScore * 100) / 100,
          commonInterests,
        });
      }

      // Sort by rankScore descending
      results.sort((a, b) => b.rankScore - a.rankScore);

      return results;
    }),

  // Get connection snippets for a batch of users (async LLM layer)
  getConnectionSnippets: protectedProcedure
    .input(z.object({ userIds: z.array(z.string()).max(20) }))
    .query(async ({ ctx, input }) => {
      if (input.userIds.length === 0) return {};

      // Fetch my profile + all target profiles
      const [myProfileResult, targetProfiles] = await Promise.all([
        db.select().from(profiles).where(eq(profiles.userId, ctx.userId)),
        db
          .select()
          .from(profiles)
          .where(
            or(...input.userIds.map((id) => eq(profiles.userId, id)))
          ),
      ]);

      const myProfile = myProfileResult[0];
      if (!myProfile?.socialProfile) return {};

      const myHash = profileHash(myProfile.bio, myProfile.lookingFor);
      const result: Record<string, string> = {};

      // Check cache for all pairs
      const pairKeys = input.userIds.map((theirUserId) => {
        const [a, b] = [ctx.userId, theirUserId].sort();
        return { userAId: a, userBId: b, theirUserId };
      });

      const cachedSnippets = await db
        .select()
        .from(connectionSnippets)
        .where(
          or(
            ...pairKeys.map((p) =>
              and(
                eq(connectionSnippets.userAId, p.userAId),
                eq(connectionSnippets.userBId, p.userBId)
              )
            )
          )
        );

      // Map cache results
      const cacheMap = new Map<string, (typeof cachedSnippets)[0]>();
      for (const cs of cachedSnippets) {
        cacheMap.set(`${cs.userAId}|${cs.userBId}`, cs);
      }

      // Identify cache misses and valid cache hits
      const targetProfileMap = new Map(
        targetProfiles.map((p) => [p.userId, p])
      );
      const missedPairs: typeof pairKeys = [];

      for (const pair of pairKeys) {
        const cached = cacheMap.get(`${pair.userAId}|${pair.userBId}`);
        const theirProfile = targetProfileMap.get(pair.theirUserId);
        if (!theirProfile) continue;

        const theirHash = profileHash(
          theirProfile.bio,
          theirProfile.lookingFor
        );

        if (
          cached &&
          cached.profileHashA === (pair.userAId === ctx.userId ? myHash : theirHash) &&
          cached.profileHashB === (pair.userBId === ctx.userId ? myHash : theirHash)
        ) {
          result[pair.theirUserId] = cached.snippet;
        } else {
          missedPairs.push(pair);
        }
      }

      // Generate missing snippets in parallel (max 10 concurrent)
      const CONCURRENCY = 10;
      for (let i = 0; i < missedPairs.length; i += CONCURRENCY) {
        const batch = missedPairs.slice(i, i + CONCURRENCY);
        const snippets = await Promise.all(
          batch.map(async (pair) => {
            const theirProfile = targetProfileMap.get(pair.theirUserId);
            if (!theirProfile?.socialProfile) return { pair, snippet: '' };

            const snippet = await generateConnectionSnippet(
              { socialProfile: myProfile.socialProfile! },
              {
                socialProfile: theirProfile.socialProfile,
                displayName: theirProfile.displayName,
              }
            );
            return { pair, snippet };
          })
        );

        // Save to DB and collect results
        for (const { pair, snippet } of snippets) {
          if (!snippet) continue;

          const theirProfile = targetProfileMap.get(pair.theirUserId)!;
          const theirHash = profileHash(
            theirProfile.bio,
            theirProfile.lookingFor
          );

          const hashA = pair.userAId === ctx.userId ? myHash : theirHash;
          const hashB = pair.userBId === ctx.userId ? myHash : theirHash;

          // Upsert: delete old + insert new
          await db
            .delete(connectionSnippets)
            .where(
              and(
                eq(connectionSnippets.userAId, pair.userAId),
                eq(connectionSnippets.userBId, pair.userBId)
              )
            );

          await db.insert(connectionSnippets).values({
            userAId: pair.userAId,
            userBId: pair.userBId,
            snippet,
            profileHashA: hashA,
            profileHashB: hashB,
          });

          result[pair.theirUserId] = snippet;
        }
      }

      return result;
    }),

  // Get profile by user ID
  getById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, input.userId));

      return profile || null;
    }),
});

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
