import { and, count, gte, lte, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import dayjs from "dayjs";

interface CreateGoalCompletionRequest {
  goalId: string;
}

export async function createGoalCompletion({ goalId }: CreateGoalCompletionRequest) {
  const firstDayOfWeek = dayjs().startOf("week").toDate();
  const lastDayOfWeek = dayjs().endOf("week").toDate();

  const goalsCompletionCounts = db.$with("goals_completions_counts").as(
    db
      .select({
        goalId: goalCompletions.goalId,
        completionsCount: count(goalCompletions.id).as("completionsCount"),
      })
      .from(goalCompletions)
      .where(and(gte(goalCompletions.created_at, firstDayOfWeek), lte(goalCompletions.created_at, lastDayOfWeek), eq(goalCompletions.id, goalId)))
      .groupBy(goalCompletions.goalId)
  );

  const result = await db
    .with(goalsCompletionCounts)
    .select({
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      completionsCount: sql`
      COALESCE(${goalsCompletionCounts.completionsCount}, 0)
      `.mapWith(Number),
    })
    .from(goals)
    .leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goals.id))
    .where(eq(goals.id, goalId))
    .limit(1);

  const { completionsCount, desiredWeeklyFrequency } = result[0];

  if (completionsCount >= desiredWeeklyFrequency) {
    throw new Error("Goal already completed this week!");
  }

  const insertResult = await db.insert(goalCompletions).values({ goalId }).returning();

  const goalCompletion = insertResult[0];

  return { goalCompletion };
}
