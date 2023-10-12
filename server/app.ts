import FavoriteConcept from "./concepts/favorite";
import MapConcept from "./concepts/map";
import ModerationConcept from "./concepts/moderation";
import PostConcept from "./concepts/post";
import ReactionConcept from "./concepts/reaction";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Favorite = new FavoriteConcept();
export const Reaction = new ReactionConcept();
export const Moderation = new ModerationConcept();
export const ZipCodeMap = new MapConcept();