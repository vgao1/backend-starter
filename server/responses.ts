import { ObjectId } from "mongodb";
import { User } from "./app";
import { FavoriteDoc } from "./concepts/favorite";
import { ModerationDoc } from "./concepts/moderation";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/post";
import { ReactionDoc } from "./concepts/reaction";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const author = await User.getUserById(post.author);
    return { ...post, author: author.username };
  }

  /**
   * Convert ModerationDoc into more readable format for the frontend by converting the reporters'
   * id into a username.
   */
  static async report(report: ModerationDoc | null) {
    if (!report) {
      return report;
    }
    const reporters = await User.idsToUsernames(report.reporters.map((reporter) => new ObjectId(reporter)));
    return { ...report, reporters};
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authors = await User.idsToUsernames(posts.map((post) => post.author));
    return posts.map((post, i) => ({ ...post, author: authors[i] }));
  }

  /**
   * Convert ReactionDoc into more readable format for the frontend by converting the reacter id into a username
   */
  static async reactions(reactions: ReactionDoc[]) {
    const reacters = await User.idsToUsernames(reactions.map((reaction) => reaction.reacter));
    return reactions.map((reaction, i) => ({ ...reaction, reacter: reacters[i] }));
  }

  /**
   * Convert FavoriteDoc into more readable format for the frontend by converting the liker id into a username.
   */
  static async favorites(favorites: FavoriteDoc[]) {
    const likers = await User.idsToUsernames(favorites.map((favorite) => favorite.liker));
    return favorites.map((favorite, i) => ({ ...favorite, liker: likers[i] }));
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await User.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});
