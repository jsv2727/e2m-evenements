import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Settings
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      companyName: 'Événements 2M',
      currency: 'CAD',
      timezone: 'America/Toronto',
      language: 'fr',
      aiModel: 'claude-opus-4-7',
    },
  });

  // Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Traiteur Gourmet Montréal',
      category: 'Restauration',
      email: 'contact@traiteur-gourmet.com',
      phone: '514-555-0101',
      contactName: 'Marie Dubois',
      rating: 5,
      notes: 'Excellente qualité, très fiable',
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Sono Pro Événements',
      category: 'Son & Éclairage',
      email: 'info@sonopro.ca',
      phone: '514-555-0202',
      contactName: 'Jean-François Lapointe',
      rating: 4,
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: 'Fleurs & Déco Prestige',
      category: 'Décoration',
      email: 'fleurs@decor-prestige.ca',
      phone: '514-555-0303',
      contactName: 'Sophie Martin',
      rating: 5,
    },
  });

  // Events
  const event1 = await prisma.event.create({
    data: {
      name: 'Gala Annuel Desjardins 2026',
      description: 'Soirée de gala pour les 500 meilleurs clients Desjardins',
      startDate: new Date('2026-06-15T18:00:00'),
      endDate: new Date('2026-06-15T23:00:00'),
      venue: 'Palais des Congrès de Montréal',
      city: 'Montréal',
      status: 'CONFIRMED',
      budget: 85000,
      clientName: 'Desjardins Group',
      clientEmail: 'evenements@desjardins.com',
      type: 'Gala',
      capacity: 500,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      name: 'Conférence Tech Innovation 2026',
      description: 'Conférence annuelle sur l\'innovation technologique au Québec',
      startDate: new Date('2026-09-20T08:00:00'),
      endDate: new Date('2026-09-21T18:00:00'),
      venue: 'Centre des Sciences de Montréal',
      city: 'Montréal',
      status: 'PLANNING',
      budget: 120000,
      clientName: 'TechQC Association',
      clientEmail: 'info@techqc.ca',
      type: 'Conférence',
      capacity: 800,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      name: 'Mariage Tremblay-Côté',
      description: 'Réception de mariage pour 150 personnes',
      startDate: new Date('2026-08-08T16:00:00'),
      endDate: new Date('2026-08-09T02:00:00'),
      venue: 'Château Frontenac',
      city: 'Québec',
      status: 'CONFIRMED',
      budget: 45000,
      clientName: 'Alexandre Tremblay',
      clientEmail: 'alex.tremblay@email.com',
      type: 'Mariage',
      capacity: 150,
    },
  });

  // Tasks for event1
  await prisma.task.createMany({
    data: [
      { title: 'Confirmer menu avec traiteur', status: 'DONE', priority: 'HIGH', eventId: event1.id, assignee: 'Marie L.' },
      { title: 'Envoyer invitations finales', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date('2026-05-01'), eventId: event1.id, assignee: 'Jean P.' },
      { title: 'Finaliser plan de table', status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2026-06-01'), eventId: event1.id },
      { title: 'Tester système sonore', status: 'TODO', priority: 'HIGH', dueDate: new Date('2026-06-14'), eventId: event1.id, assignee: 'Tech Team' },
      { title: 'Préparer présentation awards', status: 'IN_PROGRESS', priority: 'URGENT', dueDate: new Date('2026-06-10'), eventId: event1.id },
    ],
  });

  // Tasks for event2
  await prisma.task.createMany({
    data: [
      { title: 'Confirmer conférenciers principaux', status: 'IN_PROGRESS', priority: 'URGENT', dueDate: new Date('2026-05-15'), eventId: event2.id },
      { title: 'Créer site web événement', status: 'TODO', priority: 'HIGH', dueDate: new Date('2026-06-01'), eventId: event2.id },
      { title: 'Négocier contrat streaming', status: 'TODO', priority: 'MEDIUM', eventId: event2.id },
    ],
  });

  // Guests for event1
  await prisma.guest.createMany({
    data: [
      { firstName: 'Pierre', lastName: 'Moreau', email: 'p.moreau@company.com', company: 'Moreau Industries', status: 'CONFIRMED', eventId: event1.id },
      { firstName: 'Claire', lastName: 'Beaumont', email: 'c.beaumont@firm.ca', company: 'Beaumont & Associés', status: 'CONFIRMED', eventId: event1.id },
      { firstName: 'Robert', lastName: 'Gagnon', email: 'r.gagnon@business.ca', status: 'INVITED', eventId: event1.id },
      { firstName: 'Isabelle', lastName: 'Roy', email: 'i.roy@corp.ca', company: 'Roy Corporation', status: 'CONFIRMED', eventId: event1.id },
      { firstName: 'Michel', lastName: 'Tremblay', email: 'm.tremblay@tremblay.ca', status: 'DECLINED', eventId: event1.id },
    ],
  });

  // Suppliers for events
  await prisma.eventSupplier.create({
    data: { eventId: event1.id, supplierId: supplier1.id, role: 'Traiteur principal', fee: 35000, status: 'CONFIRMED' },
  });
  await prisma.eventSupplier.create({
    data: { eventId: event1.id, supplierId: supplier2.id, role: 'Son & éclairage', fee: 12000, status: 'CONFIRMED' },
  });
  await prisma.eventSupplier.create({
    data: { eventId: event1.id, supplierId: supplier3.id, role: 'Décoration florale', fee: 8500, status: 'PENDING' },
  });

  // Expenses for event1
  await prisma.expense.createMany({
    data: [
      { description: 'Arrhes salle Palais des Congrès', amount: 15000, category: 'Venue', date: new Date('2026-03-01'), eventId: event1.id, vendor: 'Palais des Congrès', approved: true },
      { description: 'Acompte traiteur', amount: 17500, category: 'Restauration', date: new Date('2026-03-15'), eventId: event1.id, vendor: 'Traiteur Gourmet Montréal', approved: true },
      { description: 'Impression invitations', amount: 2800, category: 'Marketing', date: new Date('2026-04-01'), eventId: event1.id, vendor: 'Imprimerie Prestige', approved: true },
      { description: 'Location estrade VIP', amount: 3200, category: 'Équipement', date: new Date('2026-04-10'), eventId: event1.id, approved: false },
    ],
  });

  // Expenses for event2
  await prisma.expense.createMany({
    data: [
      { description: 'Réservation Centre des Sciences', amount: 25000, category: 'Venue', date: new Date('2026-02-01'), eventId: event2.id, approved: true },
      { description: 'Honoraires conférenciers', amount: 18000, category: 'Intervenants', date: new Date('2026-03-01'), eventId: event2.id, approved: false },
    ],
  });

  // Contracts
  await prisma.contract.create({
    data: {
      title: 'Contrat de services traiteur - Gala Desjardins',
      type: 'SERVICE',
      status: 'SIGNED',
      eventId: event1.id,
      supplierId: supplier1.id,
      partyA: 'Événements 2M Inc.',
      partyB: 'Traiteur Gourmet Montréal',
      value: 35000,
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-06-15'),
      signedDate: new Date('2026-03-20'),
      content: `CONTRAT DE SERVICES DE RESTAURATION

Entre les soussignés :

ÉVÉNEMENTS 2M INC., société dûment constituée, ci-après désignée le « Client »,

ET

TRAITEUR GOURMET MONTRÉAL, société dûment constituée, ci-après désignée le « Prestataire »,

ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat a pour objet la prestation de services de restauration et de traiteur pour l'événement « Gala Annuel Desjardins 2026 » qui se tiendra le 15 juin 2026 au Palais des Congrès de Montréal.

ARTICLE 2 - SERVICES INCLUS
Le Prestataire s'engage à fournir :
- Cocktail dînatoire de 18h à 19h (500 personnes)
- Souper gastronomique 5 services (500 personnes)
- Service de bar premium (alcool inclus)
- Personnel de service (25 serveurs)
- Vaisselle et équipements

ARTICLE 3 - RÉMUNÉRATION
Le Client versera la somme de 35 000 $ CAD, dont :
- 50% à la signature du présent contrat
- 50% dans les 30 jours suivant l'événement

ARTICLE 4 - RESPONSABILITÉS
Le Prestataire garantit la qualité des aliments conformément aux normes sanitaires en vigueur au Québec.

ARTICLE 5 - RÉSILIATION
En cas d'annulation par le Client, les frais suivants s'appliquent :
- Plus de 90 jours : 25% du montant total
- 30 à 90 jours : 50% du montant total
- Moins de 30 jours : 100% du montant total

Fait à Montréal, le 20 mars 2026.`,
    },
  });

  // Invoices
  const invNum = `INV-2026-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`;
  await prisma.invoice.create({
    data: {
      number: invNum,
      eventId: event1.id,
      supplierId: supplier1.id,
      issuer: 'Traiteur Gourmet Montréal',
      recipient: 'Événements 2M Inc.',
      amount: 17500,
      tax: 2450,
      status: 'PAID',
      type: 'PAYABLE',
      dueDate: new Date('2026-04-01'),
      paidDate: new Date('2026-03-28'),
      items: JSON.stringify([
        { description: 'Acompte 50% - Gala Desjardins 2026', quantity: 1, unitPrice: 17500, total: 17500 },
      ]),
    },
  });

  console.log('✅ Base de données initialisée avec succès!');
  console.log(`   - 3 événements créés`);
  console.log(`   - 3 fournisseurs créés`);
  console.log(`   - 8 tâches créées`);
  console.log(`   - 5 invités créés`);
  console.log(`   - 1 contrat créé`);
  console.log(`   - 1 facture créée`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
