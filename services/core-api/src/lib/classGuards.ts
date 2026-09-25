import mongoose from "mongoose";
import { HttpError } from "./httpError.js";
import { ClassModel, ClassMember } from "../models/index.js";

/**
 * LMS-07: Shared guard - verifies that user is a member of the class.
 * Replaces duplicate private assertClassMember/assertMemberAndPost methods
 * across PostService, CommentService, ReactionService.
 *
 * @throws HttpError 400 if classId is not a valid ObjectId
 * @throws HttpError 404 if class is not found
 * @throws HttpError 403 if user is not a member of the class
 */
export async function assertClassMembership(userId: string, classId: string) {
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new HttpError(400, "Invalid class ID format", "INVALID_ID");
  }

  const cls = await ClassModel.findById(classId);
  if (!cls) {
    throw new HttpError(404, "Class not found", "CLASS_NOT_FOUND");
  }

  const membership = await ClassMember.findOne({ classId, userId });
  if (!membership) {
    throw new HttpError(403, "You are not a member of this class", "FORBIDDEN");
  }

  return { cls, membership };
}
