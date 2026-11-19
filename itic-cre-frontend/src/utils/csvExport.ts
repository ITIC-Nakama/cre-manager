import type { StudentRow } from '../types/models/Dashboard';

export function exportStudentsCsv(students: StudentRow[], filename = 'etudiants.csv') {
    const headers = ['Prénom', 'Nom', 'Email', 'Promotion', 'Année', 'XP', 'Grade', 'Candidatures', 'En retard', 'CV', 'Actif'];

    const rows = students.map((s) => [
        s.firstName,
        s.lastName,
        s.email,
        s.promotion?.nom ?? '',
        s.studyYear ? `${s.studyYear}e année` : '',
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

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export function exportAlumniCsv(contacts: import('../types/models/Alumni').AlumniContact[], filename = 'alumni.csv') {
    const headers = [
        'Nom', 'Prénom', 'Email', 'Téléphone', 'Année de sortie', 'Formation',
        'Situation', 'Entreprise', 'Poste', 'Dans la continuité', 'Formation continuité',
        'Rémunération / Prétentions', 'Date d\'enregistrement',
    ];

    const rows = contacts.map((c) => [
        c.lastName,
        c.firstName,
        c.email,
        c.phoneNumber ?? '',
        c.exitYear,
        c.formation,
        c.currentStatus,
        c.company ?? '',
        c.jobTitle ?? '',
        c.jobInContinuity === true ? 'Oui' : c.jobInContinuity === false ? 'Non' : '',
        c.continuityFormation ?? '',
        c.salaryExpectation ?? '',
        new Date(c.createdAt).toLocaleDateString('fr-FR'),
    ]);

    const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
