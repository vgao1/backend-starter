import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";


export interface FavoriteDoc extends BaseDoc {
    liker: ObjectId;
    likedPost: ObjectId;
}

export default class FavoriteConcept {
    public readonly favorites = new DocCollection<FavoriteDoc>("favorites");

    async favorite(liker: ObjectId, likedPost: ObjectId) {
        const _id = await this.favorites.createOne({ liker, likedPost });
        return { msg: "Successfully favorited!", favorite: await this.favorites.readOne({ _id }) };
    }

    async unfavorite(favorite_id: string) {
        await this.favorites.deleteOne({ _id: new ObjectId(favorite_id) });
        return { msg: "Successfully unfavorited!" };
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
}