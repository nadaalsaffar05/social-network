// Package jobs contains the backend's small, in-process scheduled jobs.
package jobs

import (
	"context"
	"database/sql"
	"log"
	"sync"
	"time"
)

const (
	eventReminderInterval  = 5 * time.Minute
	sessionCleanupInterval = time.Hour
	bahrainTimeZone        = "Asia/Bahrain"
)

var bahrainLocation = loadBahrainLocation()

type Scheduler struct {
	db *sql.DB
	wg sync.WaitGroup
}

func New(db *sql.DB) *Scheduler {
	return &Scheduler{db: db}
}

// Start runs the scheduler until ctx is canceled. Jobs run once at startup so
// a restart does not delay work, then continue at their normal intervals.
func (s *Scheduler) Start(ctx context.Context) {
	s.wg.Add(3)
	go s.runDaily(ctx, "birthday notifications", s.createBirthdayNotifications)
	go s.runPeriodically(ctx, "event reminders", eventReminderInterval, s.createEventReminders)
	go s.runPeriodically(ctx, "expired-session cleanup", sessionCleanupInterval, s.deleteExpiredSessions)
}

// Wait blocks until all running jobs stop after the scheduler context is canceled.
func (s *Scheduler) Wait() {
	s.wg.Wait()
}

func (s *Scheduler) runDaily(ctx context.Context, name string, job func() error) {
	defer s.wg.Done()
	s.run(name, job)

	for {
		timer := time.NewTimer(time.Until(nextBahrainMidnight()))
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			s.run(name, job)
		}
	}
}

func (s *Scheduler) runPeriodically(ctx context.Context, name string, interval time.Duration, job func() error) {
	defer s.wg.Done()
	s.run(name, job)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.run(name, job)
		}
	}
}

func (s *Scheduler) run(name string, job func() error) {
	if err := job(); err != nil {
		log.Printf("%s job failed: %v", name, err)
	}
}

func nextBahrainMidnight() time.Time {
	now := time.Now().In(bahrainLocation)
	return time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, bahrainLocation)
}

func loadBahrainLocation() *time.Location {
	location, err := time.LoadLocation(bahrainTimeZone)
	if err != nil {
		panic("load Asia/Bahrain timezone: " + err.Error())
	}
	return location
}
