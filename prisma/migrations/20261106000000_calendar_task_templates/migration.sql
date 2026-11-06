-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "offsetDays" INTEGER NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "assignee" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_name_key" ON "TaskTemplate"("name");

-- CreateIndex
CREATE INDEX "TaskTemplateItem_templateId_idx" ON "TaskTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "Task_eventId_idx" ON "Task"("eventId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- AddForeignKey
ALTER TABLE "TaskTemplateItem" ADD CONSTRAINT "TaskTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rétroplannings par défaut (source : lib/default-task-templates.ts)
INSERT INTO "TaskTemplate" ("id", "name", "eventType", "description", "updatedAt") VALUES ('tpl_bateaux_dragon', 'Bateaux dragon', 'Bateaux dragon', 'Festival / course de bateaux-dragons corporatif', CURRENT_TIMESTAMP) ON CONFLICT ("name") DO NOTHING;
INSERT INTO "TaskTemplateItem" ("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
SELECT v.* FROM (VALUES
  ('tpl_bateaux_dragon_01', 'tpl_bateaux_dragon', 'Réserver le plan d''eau et confirmer la date', -120, 'HIGH', 'Logistique', 0),
  ('tpl_bateaux_dragon_02', 'tpl_bateaux_dragon', 'Demander les permis municipaux et autorisations nautiques', -110, 'HIGH', 'Juridique', 1),
  ('tpl_bateaux_dragon_03', 'tpl_bateaux_dragon', 'Réserver bateaux, barreurs et VFI', -100, 'HIGH', 'Fournisseurs', 2),
  ('tpl_bateaux_dragon_04', 'tpl_bateaux_dragon', 'Ouvrir les inscriptions des équipes', -90, 'MEDIUM', 'Inscriptions', 3),
  ('tpl_bateaux_dragon_05', 'tpl_bateaux_dragon', 'Envoyer les invitations Bateaux dragon', -75, 'URGENT', 'Communications', 4),
  ('tpl_bateaux_dragon_06', 'tpl_bateaux_dragon', 'Confirmer l''assurance responsabilité civile', -60, 'HIGH', 'Juridique', 5),
  ('tpl_bateaux_dragon_07', 'tpl_bateaux_dragon', 'Relancer les invitations et inscriptions', -45, 'MEDIUM', 'Communications', 6),
  ('tpl_bateaux_dragon_08', 'tpl_bateaux_dragon', 'Confirmer traiteur, tentes et sanitaires', -30, 'HIGH', 'Fournisseurs', 7),
  ('tpl_bateaux_dragon_09', 'tpl_bateaux_dragon', 'Planifier les séances de pratique des équipes', -30, 'MEDIUM', 'Logistique', 8),
  ('tpl_bateaux_dragon_10', 'tpl_bateaux_dragon', 'Clôturer les inscriptions et former les équipes', -21, 'HIGH', 'Inscriptions', 9),
  ('tpl_bateaux_dragon_11', 'tpl_bateaux_dragon', 'Faire signer les décharges de responsabilité', -14, 'URGENT', 'Juridique', 10),
  ('tpl_bateaux_dragon_12', 'tpl_bateaux_dragon', 'Valider le plan de sécurité nautique et premiers soins', -14, 'HIGH', 'Sécurité', 11),
  ('tpl_bateaux_dragon_13', 'tpl_bateaux_dragon', 'Envoyer le guide du participant (horaire, accès, stationnement)', -7, 'HIGH', 'Communications', 12),
  ('tpl_bateaux_dragon_14', 'tpl_bateaux_dragon', 'Commander médailles et trophées', -7, 'MEDIUM', 'Logistique', 13),
  ('tpl_bateaux_dragon_15', 'tpl_bateaux_dragon', 'Confirmation finale des fournisseurs et de l''horaire', -3, 'HIGH', 'Fournisseurs', 14),
  ('tpl_bateaux_dragon_16', 'tpl_bateaux_dragon', 'Montage du site et briefing de l''équipe', -1, 'URGENT', 'Opérations', 15),
  ('tpl_bateaux_dragon_17', 'tpl_bateaux_dragon', 'Jour J — accueil et coordination', 0, 'URGENT', 'Opérations', 16),
  ('tpl_bateaux_dragon_18', 'tpl_bateaux_dragon', 'Envoyer remerciements et sondage de satisfaction', 3, 'MEDIUM', 'Communications', 17),
  ('tpl_bateaux_dragon_19', 'tpl_bateaux_dragon', 'Diffuser photos et résultats', 7, 'LOW', 'Communications', 18),
  ('tpl_bateaux_dragon_20', 'tpl_bateaux_dragon', 'Bilan financier et rapport client', 14, 'HIGH', 'Finances', 19)
) AS v("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
WHERE EXISTS (SELECT 1 FROM "TaskTemplate" WHERE "id" = 'tpl_bateaux_dragon');
INSERT INTO "TaskTemplate" ("id", "name", "eventType", "description", "updatedAt") VALUES ('tpl_gala', 'Gala', 'Gala', 'Soirée gala / remise de prix', CURRENT_TIMESTAMP) ON CONFLICT ("name") DO NOTHING;
INSERT INTO "TaskTemplateItem" ("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
SELECT v.* FROM (VALUES
  ('tpl_gala_01', 'tpl_gala', 'Réserver la salle et signer le contrat', -180, 'HIGH', 'Juridique', 0),
  ('tpl_gala_02', 'tpl_gala', 'Envoyer le « save the date »', -120, 'MEDIUM', 'Communications', 1),
  ('tpl_gala_03', 'tpl_gala', 'Sélectionner traiteur, AV et décor', -90, 'HIGH', 'Fournisseurs', 2),
  ('tpl_gala_04', 'tpl_gala', 'Envoyer les invitations officielles', -60, 'URGENT', 'Communications', 3),
  ('tpl_gala_05', 'tpl_gala', 'Confirmer animateur et conférenciers', -45, 'HIGH', 'Fournisseurs', 4),
  ('tpl_gala_06', 'tpl_gala', 'Relancer les invitations', -30, 'MEDIUM', 'Communications', 5),
  ('tpl_gala_07', 'tpl_gala', 'Date limite RSVP et restrictions alimentaires', -21, 'HIGH', 'Inscriptions', 6),
  ('tpl_gala_08', 'tpl_gala', 'Finaliser le plan de table', -10, 'HIGH', 'Logistique', 7),
  ('tpl_gala_09', 'tpl_gala', 'Nombre final de couverts au traiteur', -7, 'URGENT', 'Fournisseurs', 8),
  ('tpl_gala_10', 'tpl_gala', 'Répétition technique et déroulé', -1, 'URGENT', 'Opérations', 9),
  ('tpl_gala_11', 'tpl_gala', 'Jour J — coordination du gala', 0, 'URGENT', 'Opérations', 10),
  ('tpl_gala_12', 'tpl_gala', 'Remerciements partenaires et invités', 3, 'MEDIUM', 'Communications', 11),
  ('tpl_gala_13', 'tpl_gala', 'Bilan financier et rapport client', 14, 'HIGH', 'Finances', 12)
) AS v("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
WHERE EXISTS (SELECT 1 FROM "TaskTemplate" WHERE "id" = 'tpl_gala');
INSERT INTO "TaskTemplate" ("id", "name", "eventType", "description", "updatedAt") VALUES ('tpl_conference', 'Conférence', 'Conférence', 'Conférence / congrès', CURRENT_TIMESTAMP) ON CONFLICT ("name") DO NOTHING;
INSERT INTO "TaskTemplateItem" ("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
SELECT v.* FROM (VALUES
  ('tpl_conference_01', 'tpl_conference', 'Réserver le lieu et les blocs de chambres', -180, 'HIGH', 'Logistique', 0),
  ('tpl_conference_02', 'tpl_conference', 'Lancer l''appel à conférenciers', -150, 'MEDIUM', 'Communications', 1),
  ('tpl_conference_03', 'tpl_conference', 'Ouvrir la billetterie / inscriptions', -120, 'HIGH', 'Inscriptions', 2),
  ('tpl_conference_04', 'tpl_conference', 'Envoyer les invitations', -90, 'URGENT', 'Communications', 3),
  ('tpl_conference_05', 'tpl_conference', 'Confirmer le programme et les conférenciers', -60, 'HIGH', 'Opérations', 4),
  ('tpl_conference_06', 'tpl_conference', 'Confirmer AV, captation et streaming', -45, 'HIGH', 'Fournisseurs', 5),
  ('tpl_conference_07', 'tpl_conference', 'Relance inscriptions', -30, 'MEDIUM', 'Communications', 6),
  ('tpl_conference_08', 'tpl_conference', 'Imprimer badges et signalétique', -10, 'MEDIUM', 'Logistique', 7),
  ('tpl_conference_09', 'tpl_conference', 'Envoyer les informations pratiques aux participants', -5, 'HIGH', 'Communications', 8),
  ('tpl_conference_10', 'tpl_conference', 'Montage et tests techniques', -1, 'URGENT', 'Opérations', 9),
  ('tpl_conference_11', 'tpl_conference', 'Jour J — accueil et régie', 0, 'URGENT', 'Opérations', 10),
  ('tpl_conference_12', 'tpl_conference', 'Envoyer présentations et sondage', 2, 'MEDIUM', 'Communications', 11),
  ('tpl_conference_13', 'tpl_conference', 'Bilan financier et rapport client', 14, 'HIGH', 'Finances', 12)
) AS v("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
WHERE EXISTS (SELECT 1 FROM "TaskTemplate" WHERE "id" = 'tpl_conference');
INSERT INTO "TaskTemplate" ("id", "name", "eventType", "description", "updatedAt") VALUES ('tpl_generique', 'Activité standard', NULL, 'Rétroplanning de base applicable à toute activité', CURRENT_TIMESTAMP) ON CONFLICT ("name") DO NOTHING;
INSERT INTO "TaskTemplateItem" ("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
SELECT v.* FROM (VALUES
  ('tpl_generique_01', 'tpl_generique', 'Confirmer date, lieu et budget avec le client', -90, 'HIGH', 'Opérations', 0),
  ('tpl_generique_02', 'tpl_generique', 'Signer les contrats fournisseurs', -60, 'HIGH', 'Juridique', 1),
  ('tpl_generique_03', 'tpl_generique', 'Envoyer les invitations', -45, 'URGENT', 'Communications', 2),
  ('tpl_generique_04', 'tpl_generique', 'Relancer les invitations', -21, 'MEDIUM', 'Communications', 3),
  ('tpl_generique_05', 'tpl_generique', 'Confirmation finale des fournisseurs', -7, 'HIGH', 'Fournisseurs', 4),
  ('tpl_generique_06', 'tpl_generique', 'Briefing équipe et feuille de route', -2, 'HIGH', 'Opérations', 5),
  ('tpl_generique_07', 'tpl_generique', 'Jour J — coordination', 0, 'URGENT', 'Opérations', 6),
  ('tpl_generique_08', 'tpl_generique', 'Remerciements et sondage', 3, 'MEDIUM', 'Communications', 7),
  ('tpl_generique_09', 'tpl_generique', 'Bilan financier et facturation', 10, 'HIGH', 'Finances', 8)
) AS v("id", "templateId", "title", "offsetDays", "priority", "category", "sortOrder")
WHERE EXISTS (SELECT 1 FROM "TaskTemplate" WHERE "id" = 'tpl_generique');
