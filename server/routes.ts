import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Favorite, Friend, Post, Reaction, User, WebSession } from "./app";
import { PostDoc, PostOptions } from "./concepts/post";
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
  async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
    // createPost(session: WebSessionDoc, photo: string, zipCode: string, address: string)
    // where photo can be a link to a photo
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    // will need to update "Update Post" object in util.ts so that 
    // update contains fields for photo, zipCode, and address
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  @Router.post("/favorites")
  async favoritePost(session: WebSessionDoc, post: string) {
    const user = WebSession.getUser(session);
    const postId = new ObjectId(post);
    return await Favorite.favorite(user, postId);
  }

  @Router.delete("/favorites/:_id")
  async unfavoritePost(favorite: string) {
    return Favorite.unfavorite(favorite);
  }

  @Router.get("/favorites")
  async getFavorites(liker: string) {
    let favorites;
    if (liker) {
      const id = (await User.getUserByUsername(liker))._id;
      favorites = await Favorite.getByLiker(id);
    } else {
      favorites = await Favorite.getFavorites({});
    }
    return Responses.favorites(favorites);
  }

  @Router.post("/reactions")
  async postReaction(session: WebSessionDoc, post: string, content: string, reactionType: string) {
    const user = WebSession.getUser(session);
    const numVotes = (reactionType=="comment") ? 0 : 1;
    const postId = new ObjectId(post);
    console.log(postId);
    return await Reaction.postReaction(content, postId, user, numVotes, reactionType)
  }

  @Router.delete("/reactions/:_id")
  async deleteReaction(reaction: string) {
    return await Reaction.deleteReaction(reaction);
  }

  @Router.post("/reactions/upvote")
  async upvoteTag(reaction: string) {
    return await Reaction.upvote(reaction);
  }

  @Router.get("/reactions")
  async findSimilarPosts(reaction: string) {
    return await Reaction.findSimilarPosts(reaction);
  }

  @Router.post("/map/start_address")
  async addStartingAddress(startAddress: string, zipCode: string) {
    // Adds the address of a starting address (of a public location) to map displayed for zipCode
  }

  @Router.post("/map/destination_address")
  async addDestinationAddress(destinationAddress: string, zipCode: string) {
    // Adds the address of a destination address to map displayed for zipCode
  }

  @Router.delete("/map/start_address/:id")
  async removeStartingAddress(startAddress: string) {
    // Adds the address of a starting address (of a public location)
  }

  @Router.delete("/map/destination_address/:id")
  async removeDestinationAddress(destinationAddress: string, zipCode: string) {
    // Adds the address of a destination address to map displayed for zipCode
  }

  @Router.get("/map/starting_address")
  async getStartingAddress(zipCode: String) {
    // Gets all the starting addresses associated with zipCode
  }

  @Router.get("/map/destination_address")
  async getDestinationAddress(zipCode: String) {
    // Gets all the destination addresses associated with zipCode
  }

  @Router.get("/map/findRoute")
  async findRoute(zipCode: string, startingAddress: string, destinationAddress: string, transportationMode: string) {
    // Generate URL to Google Maps showing route from startingAddress to destinationAddress using transportationMode
  }

  @Router.post("/report")
  async uploadReport(session: WebSessionDoc, post: string, content: string, item: string) {
    // called when user submits a report to report item for being inappropriate. post is the post item is under
    // if item is a comment/tag or the post that is reported is item is a post
  }

  @Router.post("/voteToRemove") 
  async voteRemove(session: WebSessionDoc, post: string, item: string) {
    // called when a moderator votes to remove an item that was reported to be inappropriate. post 
    // is the post item is under if item is a comment/tag or the post that is reported if item is a post.
  }
}

export default getExpressRouter(new Routes());
