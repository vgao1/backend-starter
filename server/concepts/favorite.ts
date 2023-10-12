import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";


export interface FavoriteDoc extends BaseDoc {
    liker: ObjectId;
    likedItem: ObjectId;
    itemType: string
}

export default class FavoriteConcept {
    public readonly favorites = new DocCollection<FavoriteDoc>("favorites");

    async favorite(liker: ObjectId, likedItem: ObjectId, itemType: string) {
        const existingFavorite = await this.getFavorites({liker, likedItem, itemType})
        if (existingFavorite.length > 0) {
            throw new AlreadyFavoritedError(likedItem);
        }
        const _id = await this.favorites.createOne({ liker, likedItem, itemType});
        return { msg: "Successfully favorited!", favorite: await this.favorites.readOne({ _id }) };
    }

    async unfavorite(favorite_id: string) {
        await this.favorites.deleteOne({ _id: new ObjectId(favorite_id) });
        return { msg: "Successfully unfavorited!" };
    }

    async unfavoriteAll(post_id: ObjectId) {
        await this.favorites.deleteMany({itemType: "post", likedItem: post_id});
        return { msg: "Successfully unfavorited all posts "+post_id};
    }
    async getFavorites(query: Filter<FavoriteDoc>) {
        const favorites = await this.favorites.readMany(query, {
          sort: { dateUpdated: -1 },
        });
        return favorites;
    }

    async getByLiker(liker: ObjectId) {
        return await this.getFavorites({ liker });
    }

    async isLiker(user: ObjectId, favorite_id: string) {
        const _id = new ObjectId(favorite_id);
        const favorite = await this.favorites.readOne({ _id });
        if (!favorite) {
            throw new FavoriteNotFoundError(_id);
        }
        if (favorite.liker.toString() !== user.toString()) {
            throw new LikerNotMatchError(_id);
        }
    }
}

export class AlreadyFavoritedError extends NotAllowedError {
    constructor(
      public readonly _id: ObjectId
    ) {
      super("You already favorited post {0}!", _id);
    }
}

export class LikerNotMatchError extends NotAllowedError {
    constructor(
      public readonly _id: ObjectId
    ) {
      super("You do not have a favorite with id {0}!", _id);
    }
}

export class FavoriteNotFoundError extends NotFoundError {
    constructor(
        public readonly _id: ObjectId
    ) {
        super("Favorite {0} does not exist!", _id);
    }
}