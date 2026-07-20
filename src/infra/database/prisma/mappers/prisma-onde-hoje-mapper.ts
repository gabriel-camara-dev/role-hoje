import { UniqueEntityID } from '@/core/entities/unique-entity-id';
import { Place, type PlaceFields } from '@/domain/main/enterprise/entities/onde-hoje/places/place';
import type { Prisma } from '@/@types/prisma/client';
import type { PlaceModel } from '@/@types/prisma/models/Place';

/** A place row joined with the publicId of whoever created it — null if that account is gone. */
export type RawPlaceWithCreator = PlaceModel & { createdBy: { publicId: string } | null };

export const placeWithCreatorInclude = {
  createdBy: { select: { publicId: true } },
} satisfies Prisma.PlaceInclude;

export class PrismaOndeHojeMapper {
  /** The plain shape read models build on — no aggregate identity involved. */
  static placeToFields(raw: PlaceModel): PlaceFields {
    return {
      publicId: raw.publicId,
      googlePlaceId: raw.googlePlaceId,
      name: raw.name,
      googlePlaceName: raw.googlePlaceName,
      nickname: raw.nickname,
      formattedAddress: raw.formattedAddress,
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
      city: raw.city,
      state: raw.state,
      country: raw.country,
      photoUrl: raw.photoUrl,
      websiteUrl: raw.websiteUrl,
      mapsUrl: raw.mapsUrl,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  static placeToDomain(raw: RawPlaceWithCreator): Place {
    return Place.create(
      {
        googlePlaceId: raw.googlePlaceId,
        name: raw.name,
        googlePlaceName: raw.googlePlaceName,
        nickname: raw.nickname,
        formattedAddress: raw.formattedAddress,
        latitude: Number(raw.latitude),
        longitude: Number(raw.longitude),
        city: raw.city,
        state: raw.state,
        country: raw.country,
        photoUrl: raw.photoUrl,
        websiteUrl: raw.websiteUrl,
        mapsUrl: raw.mapsUrl,
        createdById: raw.createdBy ? new UniqueEntityID(raw.createdBy.publicId) : null,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.publicId),
    );
  }
}
