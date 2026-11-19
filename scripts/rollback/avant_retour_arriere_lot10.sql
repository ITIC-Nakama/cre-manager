-- À lancer UNIQUEMENT en cas de retour arrière du code d'avant le lot 10 (PR #98) APRÈS son déploiement,
-- juste avant que l'ancien code ne redémarre (ou tout de suite après le « Revert », avant toute utilisation).
-- Testé sur la base jetable itic_cre_lot10 (données fictives). Rien n'est supprimé : les colonnes d'adresse (V62),
-- le type « Job étudiant » (V63), les colonnes de transfert et les messages créés par V64 restent en place.
BEGIN;

-- L'ancien code ne connaît pas le statut TRANSFERRED (V64) : sans cette ligne, l'export RGPD d'un étudiant concerné
-- et la liste « Demandes d'aide » de l'équipe répondent 500. Les demandes redeviennent « en attente » ; les messages
-- repris restent aussi dans Conversations (l'équipe peut répondre d'un côté ou de l'autre).
UPDATE reclamations SET status = 'PENDING' WHERE status = 'TRANSFERRED';

COMMIT;
