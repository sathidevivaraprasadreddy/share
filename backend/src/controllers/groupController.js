import { getDbPool } from '../config/db.js';

/**
 * List all groups the authenticated user belongs to
 */
export async function getGroups(req, res, next) {
  try {
    const userId = req.user.id;
    const db = getDbPool();

    const [groups] = await db.query(
      `SELECT g.id, g.name, g.description, g.created_at, gm.role,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
              (SELECT COUNT(*) FROM group_shares WHERE group_id = g.id AND is_revoked = 0) AS active_shares_count
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        role: g.role,
        memberCount: g.member_count,
        activeSharesCount: g.active_shares_count,
        createdAt: g.created_at
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new collaboration group
 */
export async function createGroup(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Group name is required.' });
    }

    const cleanName = name.trim().substring(0, 100);
    const cleanDesc = description ? description.trim().substring(0, 255) : null;
    const userId = req.user.id;
    const db = getDbPool();

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert group
      const [groupResult] = await connection.query(
        `INSERT INTO groups (owner_user_id, name, description) VALUES (?, ?, ?)`,
        [userId, cleanName, cleanDesc]
      );

      const groupId = groupResult.insertId;

      // 2. Add creator as owner member
      await connection.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')`,
        [groupId, userId]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: 'Group created successfully.',
        group: {
          id: groupId,
          name: cleanName,
          description: cleanDesc,
          role: 'owner',
          memberCount: 1
        }
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Get group details, members, and shared files
 */
export async function getGroupDetails(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDbPool();

    const [groups] = await db.query(
      `SELECT id, name, description, owner_user_id, created_at FROM groups WHERE id = ?`,
      [id]
    );

    if (groups.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    // Verify user is member of this group
    const [membership] = await db.query(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ success: false, error: 'Access denied. You are not a member of this group.' });
    }

    const group = groups[0];

    // Get members
    const [members] = await db.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_color, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.role = 'owner' DESC, gm.joined_at ASC`,
      [id]
    );

    // Get group shares
    const [shares] = await db.query(
      `SELECT gs.id AS share_id, gs.is_revoked, gs.created_at AS shared_at,
              s.share_token, s.total_size_bytes, s.file_count, s.expires_at, s.is_revoked AS session_revoked,
              u.username AS shared_by_username, u.display_name AS shared_by_name
       FROM group_shares gs
       JOIN share_sessions s ON gs.session_id = s.id
       JOIN users u ON gs.shared_by_user_id = u.id
       WHERE gs.group_id = ? AND gs.is_revoked = 0
       ORDER BY gs.created_at DESC`,
      [id]
    );

    return res.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        isOwner: group.owner_user_id === userId,
        members: members.map((m) => ({
          id: m.id,
          username: m.username,
          displayName: m.display_name,
          avatarColor: m.avatar_color,
          role: m.role,
          joinedAt: m.joined_at
        })),
        shares: shares.map((s) => ({
          id: s.share_id,
          shareToken: s.share_token,
          totalSizeBytes: s.total_size_bytes,
          fileCount: s.file_count,
          expiresAt: s.expires_at,
          isExpired: new Date(s.expires_at) < new Date(),
          isRevoked: Boolean(s.is_revoked || s.session_revoked),
          sharedBy: s.shared_by_name || s.shared_by_username,
          sharedAt: s.shared_at
        }))
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add member to group by username
 */
export async function addMember(req, res, next) {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Please enter a valid username to invite.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = getDbPool();

    // Check if requester is owner of group
    const [groupCheck] = await db.query(
      `SELECT owner_user_id, name FROM groups WHERE id = ?`,
      [id]
    );

    if (groupCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    if (groupCheck[0].owner_user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the group owner can add new members.' });
    }

    // Look up user by username
    const [users] = await db.query(
      `SELECT id, username, display_name FROM users WHERE username = ?`,
      [cleanUsername]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: `User '@${cleanUsername}' not found.` });
    }

    const invitedUser = users[0];

    // Check if already member
    const [alreadyMember] = await db.query(
      `SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`,
      [id, invitedUser.id]
    );

    if (alreadyMember.length > 0) {
      return res.status(409).json({ success: false, error: 'User is already a member of this group.' });
    }

    // Add member
    await db.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')`,
      [id, invitedUser.id]
    );

    // Notify the added user
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, 'group_invited')`,
      [
        invitedUser.id,
        `Joined Group: ${groupCheck[0].name}`,
        `You were added to the group "${groupCheck[0].name}" by @${req.user.username}.`
      ]
    );

    return res.status(201).json({
      success: true,
      message: `@${cleanUsername} added to group.`,
      member: {
        id: invitedUser.id,
        username: invitedUser.username,
        displayName: invitedUser.display_name,
        role: 'member'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove member or leave group
 */
export async function removeMember(req, res, next) {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user.id;
    const targetUserId = parseInt(userId, 10);
    const db = getDbPool();

    const [groups] = await db.query(
      `SELECT owner_user_id FROM groups WHERE id = ?`,
      [id]
    );

    if (groups.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    const isOwner = groups[0].owner_user_id === currentUserId;
    const isSelf = currentUserId === targetUserId;

    // Only group owner or the member themselves (leaving) can remove
    if (!isOwner && !isSelf) {
      return res.status(403).json({ success: false, error: 'Unauthorized to remove this member.' });
    }

    if (isOwner && isSelf) {
      return res.status(400).json({ success: false, error: 'Group owner cannot leave the group. Delete the group instead.' });
    }

    await db.query(
      `DELETE FROM group_members WHERE group_id = ? AND user_id = ?`,
      [id, targetUserId]
    );

    return res.json({
      success: true,
      message: isSelf ? 'You have left the group.' : 'Member removed from group.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Share a transfer session with a group
 */
export async function shareWithGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { shareToken } = req.body;
    const userId = req.user.id;
    const db = getDbPool();

    // Verify user is member of group
    const [membership] = await db.query(
      `SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (membership.length === 0) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group.' });
    }

    // Verify session
    const [sessions] = await db.query(
      `SELECT id, is_revoked, expires_at FROM share_sessions WHERE share_token = ?`,
      [shareToken]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, error: 'Sharing session not found.' });
    }

    const session = sessions[0];
    if (session.is_revoked || new Date(session.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Session is revoked or expired.' });
    }

    await db.query(
      `INSERT INTO group_shares (group_id, session_id, shared_by_user_id)
       VALUES (?, ?, ?)`,
      [id, session.id, userId]
    );

    return res.status(201).json({
      success: true,
      message: 'Files shared with group successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Permanently Delete a Group (Owner Only)
 */
export async function deleteGroup(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const db = getDbPool();

    const [groups] = await db.query(
      `SELECT owner_user_id, name FROM groups WHERE id = ?`,
      [id]
    );

    if (groups.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found.' });
    }

    if (groups[0].owner_user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the group owner can delete this group.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`DELETE FROM group_shares WHERE group_id = ?`, [id]);
      await connection.query(`DELETE FROM group_members WHERE group_id = ?`, [id]);
      await connection.query(`DELETE FROM groups WHERE id = ?`, [id]);

      await connection.commit();

      return res.json({
        success: true,
        message: `Group "${groups[0].name}" deleted successfully.`
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Leave a Group
 */
export async function leaveGroup(req, res, next) {
  req.params.userId = req.user.id;
  return removeMember(req, res, next);
}

