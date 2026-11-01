import { ClassModel } from "./Class.js";
import { ClassMember } from "./ClassMember.js";
import { ClassSession } from "./ClassSession.js";
import { Comment } from "./Comment.js";
import { Exam } from "./Exam.js";
import { Exercise } from "./Exercise.js";
import { Grade } from "./Grade.js";
import { Material } from "./Material.js";
import { MaterialUnlock } from "./MaterialUnlock.js";
import { Post } from "./Post.js";
import { Reaction } from "./Reaction.js";
import { Submission } from "./Submission.js";

export const coreModels = [
  ClassModel,
  ClassMember,
  ClassSession,
  Post,
  Comment,
  Material,
  MaterialUnlock,
  Exercise,
  Exam,
  Submission,
  Grade,
  Reaction,
];

export async function syncCoreIndexes(): Promise<void> {
  await Promise.all(coreModels.map((model) => model.syncIndexes()));
}
