package db.migration;

import com.itic.paris.platform.reclamation.migration.ReclamationTransfer;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * Lot 10 (V64) : les demandes d'aide encore en attente deviennent des messages de la messagerie (voir
 * {@link ReclamationTransfer}). Migration Java : la reprise relie chaque demande au message créé, ce que du SQL
 * portable ne sait pas faire simplement. Dans la transaction de Flyway ; rien n'est supprimé.
 */
public class V64__reclamations_vers_messagerie extends BaseJavaMigration {

    @Override
    public void migrate(Context context) {
        JdbcTemplate jdbc = new JdbcTemplate(new SingleConnectionDataSource(context.getConnection(), true));
        ReclamationTransfer.addColumns(jdbc);
        ReclamationTransfer.run(jdbc);
    }
}
