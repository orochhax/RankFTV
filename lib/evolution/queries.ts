import "server-only";

import roadmapJson from "@/data/evolution/roadmap.json";
import rankJson from "@/data/evolution/rankftv.json";
import { requireEvolutionOwner } from "./access";
import { todayInSaoPaulo } from "./date";
import { computeEvolutionScore, computeStudyWeek, weekRange } from "./metrics";
import type { RankSnapshot, RoadmapSnapshot, StudySession } from "./types";

// Agrega fontes opcionais e mantém defaults explícitos enquanto a migration não foi aplicada.
// eslint-disable-next-line complexity
export async function getEvolutionData() {
  const fetchedAt = new Date().toISOString();
  const { supabase, user } = await requireEvolutionOwner();
  const today = todayInSaoPaulo();
  const range = weekRange(today);

  const [
    settingsResult,
    sessionsResult,
    trainingResult,
    weightsResult,
    followersResult,
    equipmentResult,
    videoResult,
    roadmapProgressResult,
    projectProgressResult,
    reviewResult,
    sourceSnapshotsResult,
    ideasResult,
  ] = await Promise.all([
    supabase.from("evo_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("evo_study_sessions").select("id,study_date,minutes,source,started_at,ended_at").eq("user_id", user.id).gte("study_date", range.start).lte("study_date", range.end).order("study_date"),
    supabase.from("evo_training_logs").select("training_date,body_parts").eq("user_id", user.id).gte("training_date", range.start).lte("training_date", range.end).order("training_date"),
    supabase.from("evo_weight_logs").select("measured_on,weight_kg").eq("user_id", user.id).order("measured_on", { ascending: false }).limit(8),
    supabase.from("evo_follower_snapshots").select("measured_on,followers,source").eq("user_id", user.id).order("measured_on", { ascending: false }).limit(12),
    supabase.from("evo_equipment").select("id,name,priority,purchased_at").eq("user_id", user.id).order("purchased_at", { ascending: true, nullsFirst: true }).order("created_at"),
    supabase.from("evo_weekly_videos").select("week_start,idea_id,title_snapshot,published_at").eq("user_id", user.id).eq("week_start", range.start).maybeSingle(),
    supabase.from("evo_roadmap_progress").select("task_id,completed_at").eq("user_id", user.id),
    supabase.from("evo_project_progress").select("project_id,progress,status,note,updated_at").eq("user_id", user.id),
    supabase.from("evo_ai_reviews").select("week_start,score,verdict,actions,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("evo_source_snapshots").select("source_kind,payload").eq("user_id", user.id),
    supabase.from("yt_ideas").select("id,title,status,current_rank,score,rationale").not("status", "eq", "discarded").order("current_rank", { ascending: true }).limit(6),
  ]);

  const settings = settingsResult.data ?? {
    daily_study_target_minutes: 120,
    weekly_study_target_minutes: 600,
    follower_target: 500,
    current_weight_kg: null,
    goal_weight_kg: null,
  };
  const sessions: StudySession[] = (sessionsResult.data ?? []).map((session) => ({
    id: String(session.id),
    studyDate: String(session.study_date),
    minutes: Number(session.minutes),
    source: session.source === "timer" ? "timer" : "manual",
    startedAt: session.started_at ? String(session.started_at) : null,
    endedAt: session.ended_at ? String(session.ended_at) : null,
  }));
  const study = computeStudyWeek(
    sessions,
    today,
    Number(settings.daily_study_target_minutes),
    Number(settings.weekly_study_target_minutes),
  );
  const training = trainingResult.data ?? [];
  const weights = weightsResult.data ?? [];
  const followers = followersResult.data ?? [];
  const video = videoResult.data;
  const sourceSnapshots = sourceSnapshotsResult.data ?? [];
  const roadmap = (sourceSnapshots.find((snapshot) => snapshot.source_kind === "roadmap")?.payload ?? roadmapJson) as RoadmapSnapshot;
  const rank = (sourceSnapshots.find((snapshot) => snapshot.source_kind === "rankftv")?.payload ?? rankJson) as RankSnapshot;
  const score = computeEvolutionScore({
    study,
    videoPublished: Boolean(video?.published_at),
    trainingDays: training.length,
    expectedTrainingDays: 6,
    weightLogged: weights.some((entry) => String(entry.measured_on) >= range.start),
  });

  return {
    fetchedAt,
    databaseReady: !settingsResult.error,
    today,
    range,
    settings,
    sessions,
    study,
    training,
    weights,
    followers,
    equipment: equipmentResult.data ?? [],
    video,
    roadmapProgress: new Set((roadmapProgressResult.data ?? []).map((item) => String(item.task_id))),
    projectProgress: projectProgressResult.data ?? [],
    latestReview: reviewResult.data,
    ideas: ideasResult.data ?? [],
    score,
    roadmap,
    rank,
  };
}
