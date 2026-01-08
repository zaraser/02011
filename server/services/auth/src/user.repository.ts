// server/services/auth/src/user.repository.ts
import { initDb } from './db.js';

const getDb = () => initDb();

export const findUserByIntraId = (intraId: number) => {
  return getDb().prepare(
    `SELECT * FROM user WHERE intra_id = ?`
  ).get(intraId) as any;
};

export const createIntraUser = (
  intraId: number,
  login: string,
  email: string | null,
  image: string | null
) => {
  return getDb().prepare(`
    INSERT INTO user (login, email, image, intra_id, auth_provider, display_name)
    VALUES (?, ?, ?, ?, 'intra', ?)
  `).run(login, email, image, intraId, login);
};

export const findUserById = (id: number) => {
  return getDb().prepare(
    `SELECT * FROM user WHERE id = ?`
  ).get(id) as any;
};

export const findUserByLogin = (login: string) => {
  return getDb().prepare(
    `SELECT * FROM user WHERE login = ?`
  ).get(login) as any;
};

export const findUserByDisplayName = (displayName: string) => {
  return getDb().prepare(
    `SELECT * FROM user WHERE display_name = ?`
  ).get(displayName) as any;
};

export const setTwoFASecret = (userId: number, secret: string) => {
  return getDb().prepare(`
    UPDATE user
    SET twofa_secret = ?
    WHERE id = ?
  `).run(secret, userId);
};

export const enable2FA = (userId: number) => {
  return getDb().prepare(`
    UPDATE user
    SET is_2fa_enabled = 1
    WHERE id = ?
  `).run(userId);
};

export const disable2FA = (userId: number) => {
  return getDb().prepare(`
    UPDATE user
    SET is_2fa_enabled = 0,
        twofa_secret = NULL
    WHERE id = ?
  `).run(userId);
};

export const updateUserAvatar = (userId: number, image: string) => {
  return getDb().prepare(`
    UPDATE user
    SET image = ?
    WHERE id = ?
  `).run(image, userId);
};

export const updateUser = (
  userId: number,
  login: string,
  email: string | null,
  image: string | null
) => {
  return getDb().prepare(`
    UPDATE user
    SET login = ?, email = ?, image = ?
    WHERE id = ?
  `).run(login, email, image, userId);
};

export const updateUserDisplayName = (userId: number, displayName: string) => {
  return getDb().prepare(`
    UPDATE user
    SET display_name = ?
    WHERE id = ?
  `).run(displayName, userId);
};


export const initDisplayNameIfNull = (userId: number) => {
  const user = findUserById(userId);
  if (user && !user.display_name) {
    return getDb().prepare(`
      UPDATE user
      SET display_name = login
      WHERE id = ? AND display_name IS NULL
    `).run(userId);
  }
  return null;
};


export const findAllUsers = () => {
  return getDb().prepare(`
    SELECT id, login, display_name, image FROM user
  `).all();
};
