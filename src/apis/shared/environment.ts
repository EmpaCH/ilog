// Property types created by older iLog versions. iLog no longer creates or uses them, but they are
// still assigned to existing (Lab 205) types and their objects, so they are hidden in forms.
export const legacyIlogPropertyCodes = ["ILOG", "ILOG_LOGBOOK"];
// Object type metadata key holding the identifier of the collection new objects of that type
// are stored in by default (e.g. "/SPACE/PROJECT/COLLECTION"). Can be overridden per object.
export const defaultCollectionMetadataKey = "defaultCollection";
// Object type metadata key holding the color (hex, e.g. "#e67800") used to show objects of that type,
// e.g. logbook entries in the logbook
export const colorMetadataKey = "color";
// Rooms are a pre-existing openBIS inventory sample type, not managed by iLog's
// own Instrument/Component collections, but usable as a LOCATION value.
export const roomObjectTypeCode = "ROOM";
