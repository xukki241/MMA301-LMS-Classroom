import { ClassModel } from "./Class.js";
import { ClassMember } from "./ClassMember.js";
import { Comment } from "./Comment.js";
import { Exercise } from "./Exercise.js";
import { Grade } from "./Grade.js";
import { Material } from "./Material.js";
import { Post } from "./Post.js";
import { Submission } from "./Submission.js";

export const coreModels = [
  ClassModel,
  ClassMember,
  Post,
  Comment,
  Material,
  Exercise,
  Submission,
  Grade,
];

export async function syncCoreIndexes(): Promise<void> {
  await Promise.all(coreModels.map((model) => model.syncIndexes()));
}
