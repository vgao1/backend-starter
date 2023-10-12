import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ReactionDoc extends BaseDoc {
    content: string,
    post: ObjectId,
    reacter: ObjectId,
    voters: Array<string>,
    reactionType: string,
    numVotes: number
}

export default class ReactionConcept {
    public readonly reactions = new DocCollection<ReactionDoc>("reactions");
    
    async postReaction(content: string, post: ObjectId, reacter: ObjectId, reactionType: string) {
        const voters = Array<string>();
        voters.push(reacter.toString());
        const _id = await this.reactions.createOne({ content, post, reacter, voters, reactionType, numVotes: 0});
        return { msg: "Reaction successfully posted!", reaction: await this.reactions.readOne({ _id }) };
    }

    async deleteReaction(reaction_id: string) {
        await this.reactions.deleteOne({ _id: new ObjectId(reaction_id) });
        return { msg: "Reaction deleted successfully!" };
    }

    async deleteAllReactions(_id: ObjectId) {
        await this.reactions.deleteMany({post: _id});
        return { msg: "Successfully deleted all reactions of deleted post!"};
    }

    async getReactionType(id: string) {
        const reaction = await this.reactions.readOne({_id: new ObjectId(id)});
        if (!reaction) {
            throw new ReactionNotFoundError();
        }
        return reaction.reactionType
    }

    async getVoters(id: string) {
        const reaction = await this.reactions.readOne({_id: new ObjectId(id)});
        if (!reaction) {
            throw new ReactionNotFoundError();
        }
        return reaction.voters;
    }

    async findSimilarPosts(id: string) {
        const reaction = await this.reactions.readOne({_id: new ObjectId(id)});
        if (!reaction) {
            throw new ReactionNotFoundError();
        }
        else if (reaction.reactionType !== "tag") {
            throw new NotATagError("used to find similar posts");
        } else {
            const tag = reaction.content;
            const query: Filter<ReactionDoc> = {
                "content":tag,
                "reactionType": "tag"
            }
            const posts = await this.reactions.readMany(query);
            return posts.map(post => post.post);
        }
    }

    async upvote(user: ObjectId, reaction_id: string) {
        const reactionType = await this.getReactionType(reaction_id);
        if (reactionType!=="tag") {
            throw new NotATagError("upvoted");
        } else {
            const existingVoters = await this.getVoters(reaction_id);
            const userIdString = user.toString();
            if (existingVoters.includes(userIdString)) {
                throw new AlreadyUpvotedError(reaction_id);
            } else {
                const _id = new ObjectId(reaction_id);
                existingVoters.push(userIdString);
                this.reactions.updateOne({_id}, {voters: existingVoters, numVotes: existingVoters.length});
                return { msg: "Reaction successfully upvoted!" };
            }
        }
    }

    async isReacter(user: ObjectId, reaction_id: string) {
        const _id = new ObjectId(reaction_id);
        const reaction = await this.reactions.readOne({ _id });
        if (!reaction) {
            throw new ReactionNotFoundError();
        }
        if (reaction.reacter.toString() !== user.toString()) {
            throw new ReacterNotMatchError(_id);
        }
    }

    async getReactions(query: Filter<ReactionDoc>) {
        const reactions = await this.reactions.readMany(query, {
          sort: { numVotes: -1, dateUpdated: -1 },
        });
        return reactions;
    }

    async getByPost(post: ObjectId) {
        return await this.getReactions({ post });
    }
}

export class ReacterNotMatchError extends NotAllowedError {
    constructor(
      public readonly _id: ObjectId,
    ) {
      super("You do not have a reaction with id {0}!", _id);
    }
}

export class ReactionNotFoundError extends NotFoundError {
    constructor(){
        super("Reaction not found!");
    }
}

export class CantDeleteReactionError extends NotAllowedError {
    constructor(){
        super("Reaction isn't a comment, so it can't be deleted!");
    }
}

export class NotATagError extends NotAllowedError {
    constructor(
        public readonly prohibitedAction: string
    ){
        super("Reaction isn't a tag, so it can't be {0}!", prohibitedAction);
    }
}

export class AlreadyUpvotedError extends NotAllowedError {
    constructor(
        public readonly reaction_id: string
    ){
        super("Already upvoted reaction {0}!", reaction_id);
    }
}