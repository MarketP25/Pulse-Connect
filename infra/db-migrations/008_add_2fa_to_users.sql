
-- In this migration, we are adding support for two-factor authentication (2FA)
-- to the users table. This is a critical security enhancement that adds a second
-- layer of protection during the login process.

-- Column to store the encrypted secret key for TOTP (Time-based One-Time Password)
-- generation. This will be unique for each user who enables 2FA.
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

-- Column to track whether a user has enabled 2FA.
-- By default, it is set to false. Users will need to go through an
-- enrollment process to enable it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
