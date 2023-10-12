import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ModerationDoc extends BaseDoc {
    post: ObjectId,
    item: ObjectId,
    itemType: string,
    reports: Array<string>,
    reporters: Array<string>,
    votersToRemove: Array<string>
}

export interface ModeratorDoc extends BaseDoc {
    moderator: ObjectId,
    canUpdateModerators: Boolean
}

export default class ModerationConcept {
    public readonly reportedItems = new DocCollection<ModerationDoc>("reportedItems");
    public readonly moderators = new DocCollection<ModeratorDoc>("moderators");
    private moderatorLeaders = ["6519bfd5bfa5e73fdb8e53de"];

    async report(reporter: string, post: string, item: string, itemType: string, reason: string) {
        const item_id = new ObjectId(item);
        const post_id = new ObjectId(post);
        const existingReportedItem = await this.reportedItems.readOne(
            { 
                post: post_id,
                item: item_id,
                itemType: itemType
            }
        );
        let report_id;
        if (existingReportedItem) {
            if (existingReportedItem.reporters.includes(reporter)) {
                throw new AlreadyReportedError(existingReportedItem._id);
            }  else {
                const item_id = new ObjectId(item);
                const reports = existingReportedItem.reports
                reports.push(reason);
                const reporters = existingReportedItem.reporters;
                reporters.push(reporter);
                this.reportedItems.updateOne(
                    {item: item_id}, 
                    {
                        reports,
                        reporters
                    }
                );
                report_id = (await this.reportedItems.readOne({item: item_id}))?._id;
            }
        } else {
            const reports = [reason];
            const reporters = [reporter];
            report_id = await this.reportedItems.createOne({item: item_id, post: post_id, itemType, reports, reporters});
        }
        return { msg: "Report successfully submitted!", report: await this.reportedItems.readOne({ _id: report_id }) };
    }

    async addModerator(currentUser: ObjectId, userToAdd: string) {
        const existingModerator = await this.moderators.readOne({moderator: currentUser});
        const hasUpdatePermission = (this.moderatorLeaders.includes(userToAdd) && this.moderatorLeaders.includes(currentUser.toString()));
        if ((existingModerator?.canUpdateModerators) || hasUpdatePermission) {
            const newModeratorId = new ObjectId(userToAdd);
            this.moderators.createOne({moderator: newModeratorId, canUpdateModerators: hasUpdatePermission});
            return { msg: "Successfully added "+userToAdd+" as moderator!"};
        } else {
            throw new NoAddModeratorPermissionError(userToAdd);
        }
    }

    async removeModerator(currentUser: ObjectId, userToRemove: string) {
        const removedModeratorId = new ObjectId(userToRemove);
        const moderatorToRemove = await this.moderators.readOne({moderator: removedModeratorId});
        if (!moderatorToRemove) {
            throw new ModeratorNotFoundError(userToRemove);
        } else {
            const currentModerator = await this.moderators.readOne({moderator: currentUser});
            if (currentModerator?.canUpdateModerators) {
                this.moderators.deleteOne({moderator: removedModeratorId});
                return {msg: "Successfully removed "+userToRemove+"!"};
            } else {
                throw new NoRemoveModeratorPermissionError(userToRemove);
            }
        }
    }

    async voteToRemove(moderator: ObjectId, item: string, itemType: string) {
        const currentModerator = await this.moderators.readOne({ moderator});
        if (!currentModerator) {
            throw new NotAModeratorError();
        } else {
            const _id = new ObjectId(item);
            const reportedItem = await this.reportedItems.readOne(
                {
                    item: _id,
                    itemType
                }
            );
            if (!reportedItem) {
                throw new ReportNotFoundError(item);
            } else {
                if (reportedItem.reporters.length<5) {
                    throw new notEnoughReportsError(item);
                } else {
                    let existingVotersToRemove = reportedItem.votersToRemove;
                    if (!existingVotersToRemove) {
                        existingVotersToRemove = Array<string>();
                    }
                    existingVotersToRemove.push(moderator.toString());
                    this.reportedItems.updateOne(
                        {item: _id},
                        {votersToRemove: existingVotersToRemove}
                    );
                    return {
                        msg: "Successfully voted to remove item!",
                        numVotesToRemove: existingVotersToRemove.length
                    }
                }
            }
        }
    }

    async deleteAllReportsByPost(post_id: ObjectId) {
        await this.reportedItems.deleteMany({post: post_id});
        return {msg: "Successfully deleted all reported items by post!"};
    }

    async deleteAllReportsByReaction(reaction_id: string) {
        await this.reportedItems.deleteMany({item: new ObjectId(reaction_id), itemType: "reaction"});
        return {msg: "Successfully deleted all reported items by reaction!"};
    }
}

export class ModeratorNotFoundError extends NotFoundError {
    constructor(
        public readonly userToRemove: string
    ) {
        super("Moderator {0} not found!", userToRemove);
    }
}

export class ReportNotFoundError extends NotFoundError {
    constructor(
        public readonly item: string
    ) {
        super("Report for item {0} not found!", item);
    }
}

export class AlreadyReportedError extends NotAllowedError {
    constructor(
        public readonly item: ObjectId
    ) {
        super("Already submitted report for item {0}!", item);
    }
}

export class NoAddModeratorPermissionError extends NotAllowedError {
    constructor(
        public readonly userToAdd: string
    ) {
        super("You do not have permission to add user {0} to be a moderator", userToAdd);
    }
}

export class NoRemoveModeratorPermissionError extends NotAllowedError {
    constructor(
        public readonly userToRemove: string
    ) {
        super("You do not have permission to remove moderator {0}", userToRemove);
    }
}

export class NotAModeratorError extends NotAllowedError {
    constructor(){
        super("You are not a moderator!");
    }
}

export class notEnoughReportsError extends NotAllowedError {
    constructor(
        public readonly item: string
    ) {
        super("Not enough users submitted reports for item {0}, so you can't vote to remove", item);
    }
}