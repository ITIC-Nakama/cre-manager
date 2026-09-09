CREATE TABLE reclamations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
    message text NOT NULL,
    resolved_at timestamptz,
    date_creation timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reclamations_student_id ON reclamations(student_id);
