-- Seed the generic profile-avatar images from backend/tmp into the media table
-- and register each one in profile_avatars with type = 1000 (Generic pool).
--
-- A sentinel system user owns the media rows so the NOT NULL uploader_id FK is
-- satisfied. The placeholder password_hash ('$system$placeholder$00000000000')
-- is 33 chars and meets the CHECK(length >= 20) constraint; it is not a valid
-- bcrypt hash and therefore cannot be used to authenticate.
--
-- profile_avatars rows for pool images have user_id = NULL, meaning they are
-- unassigned generic avatars available to any new user registration.

-- System user (acts as the uploader of all generic avatar images)
INSERT OR IGNORE INTO users (id, email, password_hash, first_name, last_name, date_of_birth)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@internal.local',
  '$system$placeholder$00000000000',
  'System',
  'User',
  '2000-01-01'
);

INSERT OR IGNORE INTO profiles (user_id, privacy)
VALUES ('00000000-0000-0000-0000-000000000000', 1000);

-- Generic avatar images (sourced from backend/tmp)
INSERT OR IGNORE INTO media (id, uploader_id, file_name, file_path, mime_type, file_size)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'doof.jpg',
    'tmp/doof.jpg',
    'image/jpeg',
    8052
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'download (1).jpg',
    'tmp/download (1).jpg',
    'image/jpeg',
    17363
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'download.jpg',
    'tmp/download.jpg',
    'image/jpeg',
    11984
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'chinchillamaru.jpg',
    'tmp/chinchillamaru.jpg',
    'image/jpeg',
    12988
  );

-- Register each image as a generic pool avatar (user_id = NULL, type = 1000).
INSERT OR IGNORE INTO profile_avatars (user_id, media_id, type)
VALUES
  (NULL, 'a1000000-0000-0000-0000-000000000001', 1000),
  (NULL, 'a1000000-0000-0000-0000-000000000002', 1000),
  (NULL, 'a1000000-0000-0000-0000-000000000003', 1000),
  (NULL, 'a1000000-0000-0000-0000-000000000004', 1000);
