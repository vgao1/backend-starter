import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Favorite, Moderation, Post, Reaction, User, WebSession, ZipCodeMap } from "./app";
import { NotAllowedError, NotFoundError } from "./concepts/errors";
import { PostDoc, PostOptions } from "./concepts/post";
import { CantDeleteReactionError, ReactionNotFoundError } from "./concepts/reaction";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, photoURL: string, zipCode: string, options?: PostOptions) {
    // createPost(session: WebSessionDoc, photo: string, zipCode: string, address: string)
    // where photo can be a link to a photo
    const user = WebSession.getUser(session);
    ZipCodeMap.isValidZipCode(zipCode);
    const created = await Post.create(user, photoURL, zipCode, options);
    let creationMsg = created.msg;
    let mapObj;
    if (options?.address) {
      const mapCreated = await ZipCodeMap.addAddress(user, zipCode, options.address, "destination");
      creationMsg+="\n Successfully added destination "+options.address+"!";
      mapObj = mapCreated.map;
    } else {
      mapObj = {msg:"No update to map for zip code "+zipCode};
    }
    return { msg: creationMsg, post: await Responses.post(created.post), map: mapObj};
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    const postObj = (await Post.getPost(_id));
    let msgValue = "";
    if (postObj) {
      const zipCodeChanged = (update.zipCode && update.zipCode!==postObj.zipCode);
      if (postObj.options?.address && (update.options?.address || zipCodeChanged)) {
        if (zipCodeChanged) {
          Post.update(_id, {options: undefined});
        }
        ZipCodeMap.removeAddress(user, postObj.zipCode, postObj.options.address, "destination");
        msgValue+="Successfully removed destination "+postObj.options.address+"!<br>";
      }
      if (update.options?.address) {
        const zipCode = (update.zipCode) ? update.zipCode : postObj.zipCode;
        ZipCodeMap.addAddress(user, zipCode, update.options.address, "destination");
        msgValue+="Successfully added destination "+update.options.address+"!";
      }
    }
    const postUpdate = await Post.update(_id, update);
    msgValue = postUpdate.msg+"<br>"+msgValue;
    return {msg: msgValue};
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    const postObj = await Post.getPost(_id);
    let msgValue = "";
    if (postObj) {
      if (postObj.options?.address) {
        ZipCodeMap.removeAddress(user, postObj.zipCode, postObj.options.address, "destination");
        msgValue+="Successfully removed destination "+postObj.options.address+"!";
      }
      await Moderation.deleteAllReportsByPost(postObj._id);
      await Reaction.deleteAllReactions(postObj._id);
      await Favorite.unfavoriteAll(postObj._id);
    }
    const postDeletion = await Post.delete(_id);
    msgValue = postDeletion.msg+"<br>"+msgValue;
    return {msg: msgValue};
  }

  @Router.post("/favorites")
  async favoriteItem(session: WebSessionDoc, item: string, itemType: string) {
    const user = WebSession.getUser(session);
    const _id = new ObjectId(item); 
    if (itemType==="post") {
      const postObjs = await Post.getPosts({ _id });
      if (postObjs.length == 0) {
        throw new NotFoundError("Post with ID "+item+" not found!");
      }
    } else if (itemType==="user") {
      const userObj = await User.getUserById(_id);
      if (!userObj) {
        throw new NotFoundError("User not found!");
      } else if (userObj._id.toString() === user.toString()) {
        throw new NotAllowedError("Can't favorite yourself!");
      }
    } else {
      throw new NotAllowedError("itemType's value should be 'post' or 'user'");
    }
    return await Favorite.favorite(user, _id, itemType);
  }

  @Router.delete("/favorites/:_id")
  async unfavoritePost(session: WebSessionDoc, favorite: string) {
    const user = WebSession.getUser(session);
    await Favorite.isLiker(user, favorite);
    return Favorite.unfavorite(favorite);
  }

  @Router.get("/favorites")
  async getFavorites(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    const favorites = await Favorite.getByLiker(user);
    return Responses.favorites(favorites);
  }

  @Router.post("/reactions")
  async postReaction(session: WebSessionDoc, post: string, content: string, reactionType: string) {
    const user = WebSession.getUser(session);
    const postId = new ObjectId(post);
    if (content == null) {
      throw new NotAllowedError("Reaction must be at least 1 character long!");
    }
    if (reactionType!=="comment" && reactionType!=="tag") {
      throw new NotAllowedError("reactionType's value should be 'comment' or 'tag'");
    } else if (reactionType==="tag") {
      const existingReaction = await Reaction.getReactions({post: new ObjectId(post), content, reactionType: "tag"});
      if (existingReaction.length>0) {
        throw new NotAllowedError("Tag "+content+" already exists for post "+post+"! Please upvote tag instead.");
      }
    }
    return await Reaction.postReaction(content, postId, user, reactionType)
  }

  @Router.delete("/reactions/:_id")
  async deleteReaction(session: WebSessionDoc, reaction: string) {
    const user = WebSession.getUser(session);
    await Reaction.isReacter(user, reaction);
    const existingReaction = await Reaction.getReactions({_id: new ObjectId(reaction)});
    if (existingReaction.length==0) {
      throw new ReactionNotFoundError();
    } else if (existingReaction[0].reactionType!=="comment") {
      throw new CantDeleteReactionError();
    }
    await Moderation.deleteAllReportsByReaction(reaction);
    return await Reaction.deleteReaction(reaction);
  }

  @Router.post("/reactions/upvote")
  async upvoteTag(session: WebSessionDoc, reaction: string) {
    const user = WebSession.getUser(session);
    return await Reaction.upvote(user, reaction);
  }

  @Router.get("/reactions/similarPosts")
  async findSimilarPosts(reaction: string) {
    return await Reaction.findSimilarPosts(reaction);
  }

  @Router.get("/reactions")
  async getReactions(post?: string) {
    let reactions;
    if (post) {
      const id = new ObjectId(post);
      reactions = await Reaction.getByPost(id);
    } else {
      reactions = await Reaction.getReactions({});
    }
    return Responses.reactions(reactions);
  }

  @Router.post("/map/addAddress")
  async addAddress(session: WebSessionDoc, zipCode: string, address: string, addressType: string) {
    const user = WebSession.getUser(session);
    ZipCodeMap.checkAddressType(addressType);
    return await ZipCodeMap.addAddress(user, zipCode, address, addressType);
  }

  @Router.delete("/map/removeAddress/:id")
  async removeAddress(session: WebSessionDoc, zipCode: string, address: string, addressType: string) {
    const user = WebSession.getUser(session);
    ZipCodeMap.checkAddressType(addressType);
    return await ZipCodeMap.removeAddress(user, zipCode, address, addressType);
  }

  @Router.get("/map/nearbyPlaces")
  async getNearbyPlaces(session: WebSessionDoc, zipCode: string, addressType: string) {
    WebSession.getUser(session);
    ZipCodeMap.checkAddressType(addressType);
    return await ZipCodeMap.getNearbyAddresses(zipCode, addressType);
  }

  @Router.get("/map/directions")
  async findRoute(session: WebSessionDoc, zipCode: string, startingAddress: string, destinationAddress: string, transportationMode: string) {
    // Generate URL to Google Maps showing route from startingAddress to destinationAddress using transportationMode
    WebSession.getUser(session);
    return await ZipCodeMap.findRoute(startingAddress, destinationAddress, transportationMode);
  }

  @Router.post("/report")
  async uploadReport(session: WebSessionDoc, post: string, item: string, itemType: string, reason: string) {
    // called when user submits a report to report item for being inappropriate. post is the post item is under
    // if item is a comment/tag or the post that is reported is item is a post
    const user = WebSession.getUser(session);
    if (itemType==="post") {
      const existingPost = await Post.getPosts({_id: new ObjectId(item)});
      if (existingPost.length==0) {
        throw new NotFoundError("Post "+item+" not found!");
      }
    } else if (itemType==="reaction") {
      const existingReaction = await Reaction.getReactions({_id: new ObjectId(item)});
      if (existingReaction.length==0) {
        throw new ReactionNotFoundError();
      }
    } else {
      throw new NotAllowedError("itemType should be 'post' or 'reaction'");
    }
    const report = await Moderation.report(user.toString(), post, item, itemType, reason);
    return {msg: report.msg, report: await Responses.report(report.report)}
  }

  @Router.post("/voteToRemove") 
  async voteRemove(session: WebSessionDoc, item: string, itemType: string) {
    // called when a moderator votes to remove an item that was reported to be inappropriate. post 
    // is the post item is under if item is a comment/tag or the post that is reported if item is a post.
    const user = WebSession.getUser(session);
    if (itemType!=="post" && itemType!=="reaction") {
      throw new NotAllowedError("itemType should be 'post' or 'reaction'");
    }
    return await Moderation.voteToRemove(user, item, itemType);
  }

  @Router.post("/addModerator") 
  async addModerator(session: WebSessionDoc, userToAdd: string) {
    const user = WebSession.getUser(session);
    return Moderation.addModerator(user, userToAdd);
  }

  @Router.post("/removeModerator/:id")
  async removeModerator(session: WebSessionDoc, userToRemove: string) {
    const user = WebSession.getUser(session);
    return Moderation.removeModerator(user, userToRemove);
  }

  @Router.get("/posts/getRecommendations")
  async getRecommendations(session: WebSessionDoc) {
    const liker = WebSession.getUser(session);
    const favorites = await Favorite.getFavorites({liker, itemType: "post"});
    let similarPosts: Array<string> = [];
    for (const favorite of favorites) {
      const reactions = (await Reaction.getByPost(favorite.likedItem)).slice(0,5);
      for (const reaction of reactions) {
        const postsSimilarToFavorite = await Reaction.findSimilarPosts(reaction._id.toString());
        similarPosts = similarPosts.concat(postsSimilarToFavorite.filter((post) => !similarPosts.includes(post.toString())).map((post) => post.toString()));
      }
    }
    return similarPosts;
  }
}

export default getExpressRouter(new Routes());
