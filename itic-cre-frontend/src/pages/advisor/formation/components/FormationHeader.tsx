import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { renderTitleWithGradient } from '../../../../utils/titleUtils';
import { Loader2, Download, Upload, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useExportSkillTree, useImportSkillTree } from '../../../../hooks/useSkills';

export default function FormationHeader() {
  const { t } = useTranslation();
  const exportMutation = useExportSkillTree();
  const importMutation = useImportSkillTree();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = async () => {
    try {
      const data = await exportMutation.mutateAsync();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itic-cre-skill-tree-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('dashboard.formation.toast_export_success'));
    } catch {
      toast.error(t('dashboard.formation.toast_export_error'));
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const parsedData = JSON.parse(jsonText);

        const res = await importMutation.mutateAsync(parsedData);
        toast.success(
          t('dashboard.formation.toast_import_success', {
            catCreated: res.categoriesCreated,
            artCreated: res.articlesCreated,
            quizImported: res.quizzesImported,
          })
        );
      } catch {
        toast.error(t('dashboard.formation.toast_import_error'));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <BookOpen className="h-7 w-7 text-[#E2762F] shrink-0" />
          {renderTitleWithGradient(t('dashboard.formation.title', 'Gestion du Contenu & Quiz'), 'itic-gradient-blue')}
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 ml-1">
            {t('dashboard.formation.badge')}
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('dashboard.formation.subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFileChange}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          title={t('dashboard.formation.tooltip_import_json')}
        >
          {importMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>{t('dashboard.formation.btn_import_json')}</span>
        </button>

        <button
          onClick={handleExportJSON}
          disabled={exportMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          title={t('dashboard.formation.tooltip_export_json')}
        >
          {exportMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>{t('dashboard.formation.btn_export_json')}</span>
        </button>
      </div>
    </div>
  );
}
