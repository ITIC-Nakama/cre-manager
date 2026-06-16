import type { StudentRow } from '../types/models/Dashboard';

export function exportStudentsCsv(students: StudentRow[], filename = 'etudiants.csv') {
    const headers = ['Prénom', 'Nom', 'Email', 'Promotion', 'XP', 'Grade', 'Candidatures', 'En retard', 'CV', 'Actif'];

    const rows = students.map((s) => [
        s.firstName,
        s.lastName,
        s.email,
        s.promotion?.nom ?? '',
        s.xpTotal,
        s.grade?.nom ?? '',
        s.applicationCount,
        s.staleApplicationCount,
        s.hasCv ? 'Oui' : 'Non',
        s.isActive ? 'Oui' : 'Non',
    ]);

    const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
