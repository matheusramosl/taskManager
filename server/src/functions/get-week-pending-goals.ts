import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import { sql, and, lte, count, gte, eq } from "drizzle-orm";

dayjs.extend(weekOfYear);

export async function getWeekPendingGoals() {
  const firstDayOfWeek = dayjs().startOf("week").toDate();
  const lastDayOfWeek = dayjs().endOf("week").toDate();

  const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.created_at,
      })
      .from(goals)
      .where(lte(goals.created_at, lastDayOfWeek))
  );

  const goalsCompletionCounts = db.$with("goals_completions_counts").as(
    db
      .select({
        goalId: goalCompletions.goalId,
        completionsCount: count(goalCompletions.id).as("completionsCount"),
      })
      .from(goalCompletions)
      .where(and(gte(goalCompletions.created_at, firstDayOfWeek), lte(goalCompletions.created_at, lastDayOfWeek)))
      .groupBy(goalCompletions.goalId)
  );

  const pendingGoals = await db
    .with(goalsCreatedUpToWeek, goalsCompletionCounts)
    .select({
      id: goalsCreatedUpToWeek.id,
      title: goalsCreatedUpToWeek.title,
      desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,
      completionsCount: sql`
      COALESCE(${goalsCompletionCounts.completionsCount}, 0)
      `.mapWith(Number),
    })
    .from(goalsCreatedUpToWeek)
    .leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goalsCreatedUpToWeek.id));

  return {
    pendingGoals,
  };
}
