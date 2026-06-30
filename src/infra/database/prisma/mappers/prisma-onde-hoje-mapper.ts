import type { PlaceModel } from '@/@types/prisma/models/Place';
import type { Group } from '@/domain/main/enterprise/entities/onde-hoje/groups/group';
import type { Place } from '@/domain/main/enterprise/entities/onde-hoje/places/place';

export class PrismaOndeHojeMapper {
  static placeToDomain(raw: PlaceModel): Place {
    return {
      id: raw.id,
      publicId: raw.publicId,
      googlePlaceId: raw.googlePlaceId,
      name: raw.name,
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

  static groupToDomain(raw: {
    id: number;
    publicId: string;
    name: string;
    slug: string;
    description: string | null;
    privacy: 'PUBLIC' | 'PRIVATE';
    city: string | null;
    state: string | null;
    _count?: {
      members?: number;
      votes?: number;
    };
  }): Group {
    return {
      id: raw.id,
      publicId: raw.publicId,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      privacy: raw.privacy,
      city: raw.city,
      state: raw.state,
      membersCount: raw._count?.members,
      todayVotesCount: raw._count?.votes,
    };
  }
}
