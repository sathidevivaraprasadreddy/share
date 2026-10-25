import crypto from 'crypto';
import { getDbPool } from '../config/db.js';

/**
 * List all groups the authenticated user belongs to
 */
export async function getGroups(req, res, next) {
  try {
    const userId = req.user.id;
    const db = getDbPool();

    const [groups] = await db.query(
      `SELECT g.id, g.name, g.description, g.invite_code, g.created_at, gm.role,
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
        inviteCode: g.invite_code,
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
    const inviteCode = crypto.randomBytes(8).toString('hex');
    const userId = req.user.id;
    const db = getDbPool();

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert group with invite code
      const [groupResult] = await connection.query(
        `INSERT INTO groups (owner_user_id, name, description, invite_code) VALUES (?, ?, ?, ?)`,
        [userId, cleanName, cleanDesc, inviteCode]
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
          inviteCode,
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
      `SELECT gs.id AS share_id, gs.session_id, gs.is_revoked, gs.created_at AS shared_at, gs.shared_by_user_id,
              s.share_token, s.total_size_bytes, s.file_count, s.expires_at, s.is_revoked AS session_revoked,
              u.username AS shared_by_username, u.display_name AS shared_by_name
       FROM group_shares gs
       JOIN share_sessions s ON gs.session_id = s.id
       JOIN users u ON gs.shared_by_user_id = u.id
       WHERE gs.group_id = ? AND gs.is_revoked = 0
       ORDER BY gs.created_at DESC`,
      [id]
    );

    // Fetch individual files for each share
    const populatedShares = [];
    for (const s of shares) {
      const [shareFiles] = await db.query(
        `SELECT id, original_name, file_size, mime_type, user_id FROM share_files WHERE session_id = ? AND is_deleted = 0`,
        [s.session_id]
      );
      populatedShares.push({
        id: s.share_id,
        shareToken: s.share_token,
        totalSizeBytes: s.total_size_bytes,
        fileCount: s.file_count,
        expiresAt: s.expires_at,
        isExpired: new Date(s.expires_at) < new Date(),
        isRevoked: Boolean(s.is_revoked || s.session_revoked),
        sharedBy: s.shared_by_name || s.shared_by_username,
        sharedByUserId: s.shared_by_user_id,
        sharedAt: s.shared_at,
        files: (shareFiles || []).map((f) => ({
          id: f.id,
          name: f.original_name,
          size: f.file_size,
          mimeType: f.mime_type,
          isOwner: f.user_id === userId
        }))
      });
    }

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
        shares: populatedShares
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

/**
 * Preview group details via public/authenticated invite code
 */
export async function getGroupByInvite(req, res, next) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Invite code is required.' });
    }
    const cleanCode = code.trim().toLowerCase();
    const db = getDbPool();

    const [groups] = await db.query(
      `SELECT g.id, g.name, g.description, g.invite_code, g.created_at,
              u.username AS owner_username,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM groups g
       JOIN users u ON g.owner_user_id = u.id
       WHERE g.invite_code = ?`,
      [cleanCode]
    );

    if (groups.length === 0) {
      return res.status(404).json({ success: false, error: 'Group invite link is invalid or expired.' });
    }

    const g = groups[0];
    let isAlreadyMember = false;
    if (req.user) {
      const [members] = await db.query(
        `SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`,
        [g.id, req.user.id]
      );
      isAlreadyMember = members.length > 0;
    }

    return res.json({
      success: true,
      group: {
        id: g.id,
        name: g.name,
        description: g.description,
        inviteCode: g.invite_code,
        memberCount: g.member_count,
        ownerUsername: g.owner_username,
        isAlreadyMember
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Join group via invite code
 */
export async function joinGroupByInvite(req, res, next) {
  try {
    const code = req.body.code || req.body.inviteCode;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Please provide a valid group invite code or link.' });
    }

    // Clean code if a full URL or param was pasted
    let cleanCode = code.trim().toLowerCase();
    if (cleanCode.includes('invite=') || cleanCode.includes('groupInvite=')) {
      const match = cleanCode.match(/(?:invite|groupInvite)=([a-z0-9]+)/i);
      if (match) cleanCode = match[1].toLowerCase();
    } else if (cleanCode.includes('/group/join/')) {
      const match = cleanCode.match(/\/group\/join\/([a-z0-9]+)/i);
      if (match) cleanCode = match[1].toLowerCase();
    }

    const userId = req.user.id;
    const db = getDbPool();

    const [groups] = await db.query(
      `SELECT id, name, owner_user_id FROM groups WHERE invite_code = ?`,
      [cleanCode]
    );

    if (groups.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired group invite link.' });
    }

    const group = groups[0];

    // Check if user is already a member
    const [existing] = await db.query(
      `SELECT id FROM group_members WHERE group_id = ? AND user_id = ?`,
      [group.id, userId]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        alreadyMember: true,
        message: `You are already a member of "${group.name}".`,
        groupId: group.id
      });
    }

    // Insert membership
    await db.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')`,
      [group.id, userId]
    );

    // Notify group owner
    if (group.owner_user_id !== userId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'New Group Member', ?, 'group')`,
        [group.owner_user_id, `${req.user.username} joined your group "${group.name}" via invite link.`]
      );
    }

    return res.status(200).json({
      success: true,
      message: `You have successfully joined "${group.name}"!`,
      groupId: group.id
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all messages for a group (WhatsApp-style group chat)
 */
export async function getGroupMessages(req, res, next) {
  try {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const db = getDbPool();

    // Verify membership
    const [membership] = await db.query(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );

    if (membership.length === 0 && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'You are not a member of this group.' });
    }

    const myRole = membership.length > 0 ? membership[0].role : (req.user.isAdmin ? 'admin' : 'member');

    const [messages] = await db.query(
      `SELECT gm.id, gm.group_id, gm.user_id, gm.message, gm.created_at,
              u.username AS sender_username, u.display_name AS sender_display_name, u.avatar_color
       FROM group_messages gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.created_at ASC, gm.id ASC
       LIMIT 300`,
      [groupId]
    );

    return res.json({
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        groupId: m.group_id,
        userId: m.user_id,
        message: m.message,
        createdAt: m.created_at,
        senderUsername: m.sender_username,
        senderDisplayName: m.sender_display_name || m.sender_username,
        avatarColor: m.avatar_color || '#10b981',
        isMe: m.user_id === userId,
        canDelete: m.user_id === userId || myRole === 'owner' || req.user.isAdmin
      }))
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Send a message in a group (WhatsApp-style group chat)
 */
export async function sendGroupMessage(req, res, next) {
  try {
    const groupId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
    }

    const cleanMessage = message.trim().substring(0, 3000);
    const db = getDbPool();

    // Verify membership
    const [membership] = await db.query(
      `SELECT role FROM group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );

    if (membership.length === 0 && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'You must be a member of this group to send messages.' });
    }

    const [result] = await db.query(
      `INSERT INTO group_messages (group_id, user_id, message) VALUES (?, ?, ?)`,
      [groupId, userId, cleanMessage]
    );

    const messageId = result.insertId;

    return res.status(201).json({
      success: true,
      message: {
        id: messageId,
        groupId,
        userId,
        message: cleanMessage,
        createdAt: new Date().toISOString(),
        senderUsername: req.user.username,
        senderDisplayName: req.user.displayName || req.user.username,
        avatarColor: req.user.avatarColor || '#10b981',
        isMe: true,
        canDelete: true
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a message in a group
 */
export async function deleteGroupMessage(req, res, next) {
  try {
    const groupId = parseInt(req.params.id, 10);
    const messageId = parseInt(req.params.messageId, 10);
    const userId = req.user.id;
    const db = getDbPool();

    const [rows] = await db.query(
      `SELECT gm.id, gm.user_id, gm.group_id, g.owner_user_id
       FROM group_messages gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.id = ? AND gm.group_id = ?`,
      [messageId, groupId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    const msg = rows[0];
    if (msg.user_id !== userId && msg.owner_user_id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete this message.' });
    }

    await db.query(`DELETE FROM group_messages WHERE id = ?`, [messageId]);

    return res.json({
      success: true,
      message: 'Message deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

