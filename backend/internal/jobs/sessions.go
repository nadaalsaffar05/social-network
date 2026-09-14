package jobs

func (s *Scheduler) deleteExpiredSessions() error {
	_, err := s.db.Exec(`
		DELETE FROM sessions
		WHERE datetime(expires_at) <= datetime('now')
	`)
	return err
}
