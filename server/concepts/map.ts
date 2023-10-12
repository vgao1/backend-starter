import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface MapDoc extends BaseDoc {
    zipCode: string,
    adder: ObjectId,
    address: string,
    addressType: string
}

export default class MapConcept {
    public readonly map = new DocCollection<MapDoc>("maps");
    
    private placeType(addressType: string) {
        return (addressType==="startingaddress") ? "starting address": "destination";
    } 

    isValidZipCode(zipCode: string) {
        const regex = /\D/;
        const isNotANum = regex.test(zipCode);
        if (!zipCode || zipCode.length!=5 || isNotANum) {
            throw new InvalidZipCodeError(zipCode);
        }
    }
    
    async addAddress(adder: ObjectId, zipCode: string, address: string, addressType: string) {
        if (!address) {
            throw new EmptyAddressError();
        }
        this.isValidZipCode(zipCode);
        const existingMap = await this.map.readOne({ zipCode, address, addressType });
        if (existingMap) {
            throw new AddressAlreadyAddedError(address, addressType, zipCode);
        } else {
            const _id = await this.map.createOne({zipCode, adder, address, addressType});
            return { msg: "Map successfully created!", map: await this.map.readOne({ _id }) };
        }
    }

    async removeAddress(adder: ObjectId, zipCode: string, address: string, addressType: string) {
        if (!address) {
            throw new EmptyAddressError();
        }
        const existingMap = await this.map.readOne({zipCode, address, addressType});
        if (!existingMap) {
            const placeTypeValue = this.placeType(addressType);
            throw new AddressNotFoundError(address, placeTypeValue, zipCode);
        } else {
            if (existingMap.adder.toString() !== adder.toString()) {
                throw new AddressAdderNotMatchError();
            } else {
                this.map.deleteOne({zipCode, adder, address, addressType});
                return {msg: "Successfully deleted "+this.placeType(addressType)+" "+address+" from map for zip code "+zipCode};
            }
        }
    }

    async getNearbyAddresses(zipCode: string, addressType: string) {
        this.isValidZipCode(zipCode);
        const pluralType = (addressType==="startingaddress") ? "(es)" : "(s)";
        const nearbyPlaces = await this.map.readMany({zipCode, addressType});
        const numNearbyPlaces = nearbyPlaces.length;
        if (numNearbyPlaces==0) {
            return {msg: "No "+this.placeType(addressType)+pluralType+" near "+zipCode};
        }
        return {msg: "Found "+numNearbyPlaces+" "+this.placeType(addressType)+pluralType+" near zip code "+zipCode, nearbyPlaces};
    }

    private replaceSpaces(text: string) {
        const whiteSpace = " ";
        const regex = new RegExp(whiteSpace, "g");
        return text.replace(regex, "+");
    }

    private async findAddress(addressStringId: string, addressType: string) {
        const _id = new ObjectId(addressStringId);
        const addressObj = await this.map.readOne({ _id, addressType});
        if (!addressObj) {
            throw new NotFoundError(this.placeType(addressType)+" with ID "+addressStringId+" not found!");
        } else {
            return addressObj.address;
        }
    }
    async findRoute(startingAddress: string, destination: string, transportationMode: string) {
        const startingAddressValue = this.replaceSpaces(await this.findAddress(startingAddress, "startingaddress"));
        const destinationValue = this.replaceSpaces(await this.findAddress(destination, "destination"));
        return ("google.com/maps/preview?saddr="+startingAddressValue+
            "&daddr="+destinationValue+
            "&dirflg="+transportationMode);
    }

    checkAddressType(addressType: string) {
        if (addressType!=="startingaddress" && addressType!=="destination") {
          throw new NotAllowedError("addressType's value should be 'startingaddress' or 'destination'");
        }
    }
}

export class InvalidZipCodeError extends NotAllowedError {
    constructor(
        public readonly zipCode: string
    ) {
        super("Zipcode {0} isn't properly formated as &lt;digit&gt;&lt;digit&gt;&lt;digit&gt;&lt;digit&gt;&lt;digit&gt; (i.e. 12345)", zipCode);
    }
}

export class EmptyAddressError extends NotAllowedError {
    constructor() {
        super("Address must have at least 1 character!");
    }
}

export class AddressAdderNotMatchError extends NotAllowedError {
    constructor() {
        super("You can't remove an address you didn't add!");
    }
}

export class AddressAlreadyAddedError extends NotAllowedError {
    constructor(
        public readonly address: string,
        public readonly addressType: string,
        public readonly zipCode: string
    ) {
        super("Address {0} already added as {1} in map for zip code {2}", address, addressType, zipCode);
    }
}

export class AddressNotFoundError extends NotFoundError {
    constructor(
        public readonly address: string,
        public readonly addressType: string,
        public readonly zipCode: string
    ) {
        super("Address {0} was not added as {1} in map for zip code {2}", address, addressType, zipCode);
    }
}