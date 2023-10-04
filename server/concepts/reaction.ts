import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ReactionDoc extends BaseDoc {
    content: string,
    post: ObjectId,
    reacter: ObjectId,
    numVotes: number,
    reactionType: string
}

export default class ReactionConcept {
    public readonly reactions = new DocCollection<ReactionDoc>("reactions");
    
    async postReaction(content: string, post: ObjectId, reacter: ObjectId, numVotes: number, reactionType: string) {
        const _id = await this.reactions.createOne({ content, post, reacter, numVotes, reactionType});
        return { msg: "Reaction successfully posted!", reaction: await this.reactions.readOne({ _id }) };
    }

    async deleteReaction(reaction_id: string) {
        const reactionType = await this.getReactionType(reaction_id);
        if (reactionType==="comment") {
            await this.reactions.deleteOne({ reaction_id });
            return { msg: "Reaction deleted successfully!" };
        } else {
            throw new NotAllowedError("Reaction isn't a comment, so it can't be deleted!");
        }
        
    }

    async getReactionType(id: string) {
        const reaction = await this.reactions.readOne({_id: new ObjectId(id)});
        if (reaction == null) {
            throw new NotFoundError(`Reaction not found!`);
        }
        return reaction.reactionType
    }

    async getNumVotes(id: string) {
        const reaction = await this.reactions.readOne({_id: new ObjectId(id)});
        if (reaction == null) {
            throw new NotFoundError(`Reaction not found!`);
        }
        return reaction.numVotes;
    }

    async findSimilarPosts(id: string) {
        const reaction = await this.reactions.readOne({_id: new ObjectId(id)});
        if (reaction == null) {
            throw new NotFoundError(`Reaction not found!`);
        }
        else if (reaction.reactionType != "tag") {
            throw new NotAllowedError("reaction needs to be a tag");
        } else {
            const tag = reaction.content;
            const posts = await this.reactions.readMany({
                "content":tag,
                "reactionType": "tag"
            });
            return posts.map(post => post.post)
        }
    }

    async upvote(reaction_id: string) {
        const reactionType = await this.getReactionType(reaction_id);
        const newNumVotes = (await this.getNumVotes(reaction_id))+1;
        if (reactionType==="tag") {
            this.reactions.updateOne(
                {_id: new ObjectId(reaction_id)},
                {"numVotes": newNumVotes}
            )
            return {"msg": "Successfully updated vote count to "+newNumVotes.toString()};
        } else {
            throw new NotAllowedError("Reaction isn't a tag");
        }
    }
}