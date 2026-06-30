import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/@types/prisma/client.js'
import { env } from '../src/infra/env/env.js'

const connectionString = `${env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
export const prisma = new PrismaClient({
  adapter,
})

export async function seed() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      publicId: '0197f9cb-e9dd-72f2-8bea-863124fbec4c',
      name: 'Admin User',
      username: 'Admin',
      email: 'admin@example.com',
      cpf: '111.111.111-11',
      // password: 'ybp_whf3wxn2xdr6MTE'
      passwordHash: '$2a$12$y7AWvv8D1P9AVn2G8XkNZOXyrMZ658QFJyR.2kxM.oP/wmgB/.7.2',
      role: 'ADMIN',
    },
  })

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const [boteco, parque] = await Promise.all([
    prisma.place.upsert({
      where: { googlePlaceId: 'demo-boteco-centro' },
      update: {},
      create: {
        googlePlaceId: 'demo-boteco-centro',
        name: 'Boteco do Centro',
        formattedAddress: 'Rua das Ideias, 123 - Centro',
        latitude: -23.55052,
        longitude: -46.633308,
        city: 'Sao Paulo',
        state: 'SP',
        country: 'BR',
        mapsUrl: 'https://maps.google.com/?q=-23.55052,-46.633308',
        createdById: admin.id,
      },
    }),
    prisma.place.upsert({
      where: { googlePlaceId: 'demo-parque-ibirapuera' },
      update: {},
      create: {
        googlePlaceId: 'demo-parque-ibirapuera',
        name: 'Parque Ibirapuera',
        formattedAddress: 'Av. Pedro Alvares Cabral - Vila Mariana',
        latitude: -23.587416,
        longitude: -46.657634,
        city: 'Sao Paulo',
        state: 'SP',
        country: 'BR',
        mapsUrl: 'https://maps.google.com/?q=-23.587416,-46.657634',
        createdById: admin.id,
      },
    }),
  ])

  const group = await prisma.group.upsert({
    where: { slug: 'role-de-hoje-sp' },
    update: {},
    create: {
      name: 'Role de Hoje SP',
      slug: 'role-de-hoje-sp',
      description: 'Grupo publico para decidir onde a galera vai se encontrar hoje.',
      privacy: 'PUBLIC',
      city: 'Sao Paulo',
      state: 'SP',
      createdById: admin.id,
    },
  })

  await prisma.groupMember.upsert({
    where: {
      uq_group_member: {
        groupId: group.id,
        userId: admin.id,
      },
    },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: {
      groupId: group.id,
      userId: admin.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  })

  await Promise.all([
    prisma.placeVote.upsert({
      where: {
        uq_vote_user_place_scope_day: {
          userId: admin.id,
          placeId: boteco.id,
          scopeKey: 'global',
          day: hoje,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        userId: admin.id,
        placeId: boteco.id,
        scopeKey: 'global',
        day: hoje,
        note: 'Lugar facil para todo mundo chegar.',
      },
    }),
    prisma.placeVote.upsert({
      where: {
        uq_vote_user_place_scope_day: {
          userId: admin.id,
          placeId: parque.id,
          scopeKey: group.publicId,
          day: hoje,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        userId: admin.id,
        placeId: parque.id,
        groupId: group.id,
        scopeKey: group.publicId,
        day: hoje,
        note: 'Bom para um role mais tranquilo.',
      },
    }),
  ])
}

seed()
  .then(() => {
    console.log('Seeding completed successfully.')
    prisma.$disconnect()
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error during seeding:', error)
    prisma.$disconnect()
    process.exit(1)
  })
